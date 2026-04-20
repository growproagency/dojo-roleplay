import { createClient } from "@supabase/supabase-js";
import { ENV } from "../config/env.js";
import { getUserByEmail, upsertUser } from "../db.js";
import { UNAUTHED_ERR_MSG, NOT_ADMIN_ERR_MSG } from "../lib/constants.js";

function getSupabaseAdmin() {
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey);
}

/**
 * Soft auth middleware — attaches req.user if token is valid, null otherwise.
 * Does NOT reject unauthenticated requests.
 */
export async function softAuth(req, _res, next) {
  req.user = null;

  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return next();
    }

    const token = authHeader.slice(7);
    const sb = getSupabaseAdmin();
    const { data: { user: supabaseUser }, error } = await sb.auth.getUser(token);

    if (error || !supabaseUser?.email) {
      return next();
    }

    // Look up or create the user in our users table
    let user = await getUserByEmail(supabaseUser.email);

    if (!user) {
      await upsertUser({
        email: supabaseUser.email,
        name: supabaseUser.user_metadata?.full_name || supabaseUser.user_metadata?.name || null,
        avatarUrl: supabaseUser.user_metadata?.avatar_url || null,
        supabaseAuthId: supabaseUser.id,
        lastSignedIn: new Date(),
      });
      user = await getUserByEmail(supabaseUser.email);
    } else {
      // Update last signed in + backfill auth ID if missing
      await upsertUser({
        email: supabaseUser.email,
        supabaseAuthId: supabaseUser.id,
        lastSignedIn: new Date(),
      });
    }

    req.user = user || null;
  } catch (err) {
    console.error("[Auth] Error authenticating request:", err);
  }

  next();
}

/**
 * Requires an authenticated user. Returns 401 if not authenticated.
 */
export function requireUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: UNAUTHED_ERR_MSG });
  }
  next();
}

// ---- Role helpers ----
// Roles: 'global_admin', 'school_admin', 'staff'
// Backwards-compat: legacy 'admin' is treated as 'global_admin'.

function isGlobalAdmin(user) {
  return user?.role === "global_admin" || user?.role === "admin";
}

function isSchoolAdmin(user) {
  return user?.role === "school_admin";
}

/**
 * Requires a global platform admin. Returns 403 otherwise.
 */
export function requireGlobalAdmin(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: UNAUTHED_ERR_MSG });
  if (!isGlobalAdmin(user)) {
    return res.status(403).json({ message: NOT_ADMIN_ERR_MSG });
  }
  next();
}

/**
 * Requires a school admin OR a global admin. Returns 403 otherwise.
 */
export function requireSchoolAdmin(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: UNAUTHED_ERR_MSG });
  if (!isSchoolAdmin(user) && !isGlobalAdmin(user)) {
    return res.status(403).json({ message: NOT_ADMIN_ERR_MSG });
  }
  next();
}

/**
 * Requires the user to be a member of any school (i.e., have school_id set).
 * Global admins are exempt.
 */
export function requireSchoolMember(req, res, next) {
  const user = req.user;
  if (!user) return res.status(401).json({ message: UNAUTHED_ERR_MSG });
  if (!user.schoolId && !isGlobalAdmin(user)) {
    return res.status(403).json({ message: "You must belong to a school to access this resource (10003)" });
  }
  next();
}

/**
 * Factory: requires the requester to be in the same school as a resource.
 * Global admins are always allowed.
 *
 * @param {Function} resolveSchoolId - async (req) => Promise<number|null>
 *        Returns the school_id of the resource being accessed.
 */
export function requireSameSchool(resolveSchoolId) {
  return async function (req, res, next) {
    const user = req.user;
    if (!user) return res.status(401).json({ message: UNAUTHED_ERR_MSG });
    if (isGlobalAdmin(user)) return next();
    try {
      const resourceSchoolId = await resolveSchoolId(req);
      if (resourceSchoolId == null) {
        return res.status(404).json({ message: "Resource not found" });
      }
      if (user.schoolId !== resourceSchoolId) {
        return res.status(403).json({ message: NOT_ADMIN_ERR_MSG });
      }
      next();
    } catch (err) {
      console.error("[Auth] requireSameSchool error:", err);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
}

/**
 * Backwards-compatible alias for requireGlobalAdmin.
 * @deprecated Use requireGlobalAdmin instead.
 */
export const requireAdmin = requireGlobalAdmin;
