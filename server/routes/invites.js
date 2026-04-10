import { Router } from "express";
import { requireUser } from "../middleware/auth.js";
import {
  getInviteByToken,
  markInviteAccepted,
  setUserSchool,
  getSchoolById,
} from "../db.js";

const router = Router();

function isInviteValid(invite) {
  if (!invite) return { valid: false, reason: "not_found" };
  if (invite.acceptedAt) return { valid: false, reason: "already_accepted" };
  if (invite.revokedAt) return { valid: false, reason: "revoked" };
  if (new Date(invite.expiresAt) < new Date()) return { valid: false, reason: "expired" };
  return { valid: true };
}

// GET /api/invites/:token — public preview
//   Returns minimal info: school name + invited email + role + valid status
router.get("/:token", async (req, res) => {
  try {
    const token = req.params.token;
    if (!token) return res.status(400).json({ message: "Token required" });

    const invite = await getInviteByToken(token);
    const status = isInviteValid(invite);

    if (!status.valid) {
      return res.json({ valid: false, reason: status.reason });
    }

    const school = await getSchoolById(invite.schoolId);
    res.json({
      valid: true,
      email: invite.email,
      role: invite.role,
      school: school ? { id: school.id, name: school.name } : null,
      expiresAt: invite.expiresAt,
    });
  } catch (err) {
    console.error("[Invites] preview error:", err);
    res.status(500).json({ message: "Failed to fetch invite" });
  }
});

// POST /api/invites/:token/accept — authenticated, must match invite email
router.post("/:token/accept", requireUser, async (req, res) => {
  try {
    const token = req.params.token;
    const invite = await getInviteByToken(token);
    const status = isInviteValid(invite);

    if (!status.valid) {
      return res.status(400).json({ message: "Invite is not valid", reason: status.reason });
    }

    // Email match check (case-insensitive)
    if (invite.email.toLowerCase() !== req.user.email.toLowerCase()) {
      return res.status(403).json({
        message: `This invite is for ${invite.email}. Please sign in with that email.`,
      });
    }

    // If user already has a school, prevent accidental switching
    if (req.user.schoolId && req.user.schoolId !== invite.schoolId) {
      return res.status(409).json({
        message: "You are already a member of a school. Leave it before accepting a new invite.",
      });
    }

    // Atomically: assign user to school + mark invite accepted
    await setUserSchool(req.user.id, invite.schoolId, invite.role);
    await markInviteAccepted(invite.id);

    const school = await getSchoolById(invite.schoolId);
    res.json({
      success: true,
      school: school ? { id: school.id, name: school.name } : null,
      role: invite.role,
    });
  } catch (err) {
    console.error("[Invites] accept error:", err);
    res.status(500).json({ message: "Failed to accept invite" });
  }
});

export default router;
