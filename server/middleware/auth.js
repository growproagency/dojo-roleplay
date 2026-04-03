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
        lastSignedIn: new Date(),
      });
      user = await getUserByEmail(supabaseUser.email);
    } else {
      // Update last signed in
      await upsertUser({
        email: supabaseUser.email,
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

/**
 * Requires an authenticated admin. Returns 403 if not admin.
 */
export function requireAdmin(req, res, next) {
  const user = req.user;
  if (!user) {
    return res.status(401).json({ message: UNAUTHED_ERR_MSG });
  }
  if (user.role !== "admin") {
    return res.status(403).json({ message: NOT_ADMIN_ERR_MSG });
  }
  next();
}
