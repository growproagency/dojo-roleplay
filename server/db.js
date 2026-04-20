import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { ENV } from "./config/env.js";

let _supabase = null;

export function getSupabase() {
  if (!_supabase && ENV.supabaseUrl && ENV.supabaseServiceRoleKey) {
    _supabase = createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey);
  }
  return _supabase;
}

// ---- Column mapping helpers (snake_case DB <-> camelCase JS) ----

function toUserCamel(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    avatarUrl: row.avatar_url,
    schoolId: row.school_id ?? null,
    phoneNumber: row.phone_number ?? null,
    supabaseAuthId: row.supabase_auth_id ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastSignedIn: row.last_signed_in,
  };
}

function toCallCamel(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    userId: row.user_id,
    schoolId: row.school_id ?? null,
    scenario: row.scenario,
    difficulty: row.difficulty,
    vapiCallId: row.vapi_call_id,
    status: row.status,
    durationSeconds: row.duration_seconds,
    recordingUrl: row.recording_url,
    recordingSid: row.recording_sid,
    recordingS3Url: row.recording_s3_url,
    transcription: row.transcription,
    transcriptTurns: row.transcript_turns,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSchoolCamel(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    ownerUserId: row.owner_user_id,
    streetAddress: row.street_address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    introOffer: row.intro_offer,
    priceRangeLow: row.price_range_low,
    priceRangeHigh: row.price_range_high,
    programDirectorName: row.program_director_name,
    additionalNotes: row.additional_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInviteCamel(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    schoolId: row.school_id,
    email: row.email,
    role: row.role,
    token: row.token,
    invitedBy: row.invited_by,
    expiresAt: row.expires_at,
    acceptedAt: row.accepted_at,
    revokedAt: row.revoked_at,
    createdAt: row.created_at,
  };
}

function toCustomScenarioCamel(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    contextType: row.context_type,
    characterName: row.character_name,
    characterPrompt: row.character_prompt,
    openingLine: row.opening_line,
    voiceId: row.voice_id,
    voiceProvider: row.voice_provider,
    scoringPrompt: row.scoring_prompt,
    isActive: row.is_active,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toPhoneAttemptCamel(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    callerNumber: row.caller_number,
    vapiCallId: row.vapi_call_id,
    userId: row.user_id,
    schoolId: row.school_id,
    outcome: row.outcome,
    createdAt: row.created_at,
  };
}

function toScorecardCamel(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    callId: row.call_id,
    overallScore: row.overall_score,
    categories: row.categories,
    highlights: row.highlights,
    missedOpportunities: row.missed_opportunities,
    suggestions: row.suggestions,
    summary: row.summary,
    createdAt: row.created_at,
  };
}

function toSettingsCamel(row) {
  if (!row) return undefined;
  return {
    id: row.id,
    userId: row.user_id,
    schoolName: row.school_name,
    streetAddress: row.street_address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    introOffer: row.intro_offer,
    priceRangeLow: row.price_range_low,
    priceRangeHigh: row.price_range_high,
    programDirectorName: row.program_director_name,
    additionalNotes: row.additional_notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---- Users ----

export async function upsertUser(user) {
  const sb = getSupabase();
  if (!sb) { console.warn("[Database] Cannot upsert user: Supabase not available"); return; }

  const row = { email: user.email };
  if (user.name !== undefined) row.name = user.name;
  if (user.role !== undefined) row.role = user.role;
  if (user.avatarUrl !== undefined) row.avatar_url = user.avatarUrl;
  if (user.schoolId !== undefined) row.school_id = user.schoolId;
  if (user.phoneNumber !== undefined) row.phone_number = user.phoneNumber;
  if (user.supabaseAuthId !== undefined) row.supabase_auth_id = user.supabaseAuthId;
  row.last_signed_in = user.lastSignedIn ?? new Date().toISOString();

  const { error } = await sb
    .from("users")
    .upsert(row, { onConflict: "email" });

  if (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByEmail(email) {
  const sb = getSupabase();
  if (!sb) { console.warn("[Database] Cannot get user: Supabase not available"); return undefined; }
  const { data, error } = await sb.from("users").select("*").eq("email", email).single();
  if (error && error.code !== "PGRST116") { console.error("[Database] getUserByEmail error:", error); }
  return data ? toUserCamel(data) : undefined;
}

export async function getUserById(id) {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data, error } = await sb.from("users").select("*").eq("id", id).single();
  if (error && error.code !== "PGRST116") console.error("[Database] getUserById error:", error);
  return data ? toUserCamel(data) : undefined;
}

export async function getUserByPhoneNumber(phoneNumber) {
  const sb = getSupabase();
  if (!sb || !phoneNumber) return undefined;
  const { data, error } = await sb.from("users").select("*").eq("phone_number", phoneNumber).single();
  if (error && error.code !== "PGRST116") console.error("[Database] getUserByPhoneNumber error:", error);
  return data ? toUserCamel(data) : undefined;
}

export async function getUsersBySchool(schoolId) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("users")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });
  if (error) { console.error("[Database] getUsersBySchool error:", error); return []; }
  return (data || []).map(toUserCamel);
}

export async function setUserSchool(userId, schoolId, role) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  const row = { school_id: schoolId };
  if (role !== undefined) row.role = role;
  const { error } = await sb.from("users").update(row).eq("id", userId);
  if (error) throw error;
}

export async function updateUserProfile(userId, data) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  const row = {};
  if (data.name !== undefined) row.name = data.name;
  if (data.phoneNumber !== undefined) row.phone_number = data.phoneNumber || null;
  if (Object.keys(row).length === 0) return;
  const { error } = await sb.from("users").update(row).eq("id", userId);
  if (error) throw error;
}

// ---- Calls ----

export async function createCall(data) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  const row = {
    user_id: data.userId,
    scenario: data.scenario,
    difficulty: data.difficulty,
    vapi_call_id: data.vapiCallId ?? null,
    status: data.status ?? "in_progress",
  };
  if (data.schoolId !== undefined && data.schoolId !== null) {
    row.school_id = data.schoolId;
  }
  const { data: result, error } = await sb
    .from("calls")
    .insert(row)
    .select("id")
    .single();
  if (error) throw error;
  return result.id;
}

export async function updateCall(id, data) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");

  // Map camelCase keys to snake_case
  const row = {};
  const keyMap = {
    userId: "user_id",
    scenario: "scenario",
    difficulty: "difficulty",
    vapiCallId: "vapi_call_id",
    status: "status",
    durationSeconds: "duration_seconds",
    recordingUrl: "recording_url",
    recordingSid: "recording_sid",
    recordingS3Url: "recording_s3_url",
    transcription: "transcription",
    transcriptTurns: "transcript_turns",
  };

  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    const snakeKey = keyMap[k] || k;
    row[snakeKey] = v;
  }

  const { error } = await sb.from("calls").update(row).eq("id", id);
  if (error) throw error;
}

export async function getCallByVapiId(vapiCallId) {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data, error } = await sb.from("calls").select("*").eq("vapi_call_id", vapiCallId).single();
  if (error && error.code !== "PGRST116") console.error("[Database] getCallByVapiId error:", error);
  return data ? toCallCamel(data) : undefined;
}

export async function getCallById(id) {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data, error } = await sb.from("calls").select("*").eq("id", id).single();
  if (error && error.code !== "PGRST116") console.error("[Database] getCallById error:", error);
  return data ? toCallCamel(data) : undefined;
}

function attachScore(callRow) {
  const camel = toCallCamel(callRow);
  // Supabase returns the relation as a single object (not array) when the FK is UNIQUE,
  // or as an array when it's not. Handle both cases.
  const sc = callRow.scorecards;
  if (Array.isArray(sc)) {
    camel.overallScore = sc.length > 0 ? sc[0].overall_score ?? null : null;
  } else if (sc && typeof sc === "object") {
    camel.overallScore = sc.overall_score ?? null;
  } else {
    camel.overallScore = null;
  }
  return camel;
}

export async function getCallsByUser(userId) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("calls")
    .select("*, scorecards(overall_score)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[Database] getCallsByUser error:", error); return []; }
  return (data || []).map(attachScore);
}

export async function getCallsBySchool(schoolId) {
  const sb = getSupabase();
  if (!sb || !schoolId) return [];
  const { data, error } = await sb
    .from("calls")
    .select("*, scorecards(overall_score)")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[Database] getCallsBySchool error:", error); return []; }
  return (data || []).map(attachScore);
}

// ---- Scorecards ----

export async function createScorecard(data) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  const { data: result, error } = await sb
    .from("scorecards")
    .insert({
      call_id: data.callId,
      overall_score: data.overallScore,
      categories: data.categories,
      highlights: data.highlights,
      missed_opportunities: data.missedOpportunities,
      suggestions: data.suggestions,
      summary: data.summary ?? null,
    })
    .select("id")
    .single();
  if (error) throw error;
  return result.id;
}

export async function getScorecardByCallId(callId) {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data, error } = await sb.from("scorecards").select("*").eq("call_id", callId).single();
  if (error && error.code !== "PGRST116") console.error("[Database] getScorecardByCallId error:", error);
  return data ? toScorecardCamel(data) : undefined;
}

// ---- Leaderboard (JS aggregation) ----

export async function getLeaderboard(schoolId) {
  const sb = getSupabase();
  if (!sb) return [];

  // Fetch calls (optionally scoped to a school) with user info
  let callsQuery = sb
    .from("calls")
    .select("id, user_id, school_id, status, created_at, users!inner(name)");
  if (schoolId != null) callsQuery = callsQuery.eq("school_id", schoolId);
  const { data: callRows, error: callErr } = await callsQuery;
  if (callErr) { console.error("[Database] getLeaderboard calls error:", callErr); return []; }

  // Fetch all scorecards
  const { data: scorecardRows, error: scErr } = await sb
    .from("scorecards")
    .select("call_id, overall_score");
  if (scErr) { console.error("[Database] getLeaderboard scorecards error:", scErr); return []; }

  // Build scorecard lookup
  const scoreByCallId = new Map();
  for (const sc of scorecardRows || []) {
    scoreByCallId.set(sc.call_id, sc.overall_score);
  }

  // Aggregate by user
  const userMap = new Map();

  for (const c of callRows || []) {
    const userId = c.user_id;
    const userName = c.users?.name || "Unknown";
    if (!userMap.has(userId)) {
      userMap.set(userId, { userName, totalCalls: 0, scoredCalls: 0, scores: [], lastCallAt: c.created_at });
    }
    const entry = userMap.get(userId);
    entry.totalCalls++;
    if (c.status === "scored") entry.scoredCalls++;
    const score = scoreByCallId.get(c.id);
    if (score !== undefined) entry.scores.push(score);
    if (c.created_at > entry.lastCallAt) entry.lastCallAt = c.created_at;
  }

  // Build leaderboard array
  const rows = Array.from(userMap.entries()).map(([userId, entry]) => {
    const avgScore = entry.scores.length > 0
      ? Math.round((entry.scores.reduce((a, b) => a + b, 0) / entry.scores.length) * 10) / 10
      : null;
    const bestScore = entry.scores.length > 0
      ? Math.round(Math.max(...entry.scores) * 10) / 10
      : null;
    return {
      userId,
      userName: entry.userName,
      totalCalls: entry.totalCalls,
      scoredCalls: entry.scoredCalls,
      avgScore,
      bestScore,
      lastCallAt: entry.lastCallAt,
    };
  });

  // Sort by avg score descending (nulls last)
  rows.sort((a, b) => {
    if (a.avgScore === null && b.avgScore === null) return 0;
    if (a.avgScore === null) return 1;
    if (b.avgScore === null) return -1;
    return b.avgScore - a.avgScore;
  });

  return rows.map((r, i) => ({ rank: i + 1, ...r }));
}

// ---- School Settings ----
// Settings live on the `schools` table now. We keep the same camelCase shape
// (schoolName, streetAddress, etc.) so the scenario prompt builder doesn't need
// to change.

function toSettingsCamelFromSchool(school) {
  if (!school) return undefined;
  return {
    id: school.id,
    schoolId: school.id,
    schoolName: school.name,
    streetAddress: school.streetAddress,
    city: school.city,
    state: school.state,
    zipCode: school.zipCode,
    introOffer: school.introOffer,
    priceRangeLow: school.priceRangeLow,
    priceRangeHigh: school.priceRangeHigh,
    programDirectorName: school.programDirectorName,
    additionalNotes: school.additionalNotes,
    createdAt: school.createdAt,
    updatedAt: school.updatedAt,
  };
}

export async function getSchoolSettings(schoolId) {
  if (schoolId == null) return undefined;
  const school = await getSchoolById(schoolId);
  return toSettingsCamelFromSchool(school);
}

export async function upsertSchoolSettings(data) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  if (data.schoolId == null) throw new Error("schoolId is required to update school settings");

  const row = {
    name: data.schoolName,
    street_address: data.streetAddress ?? null,
    city: data.city ?? null,
    state: data.state ?? null,
    zip_code: data.zipCode ?? null,
    intro_offer: data.introOffer ?? null,
    price_range_low: data.priceRangeLow ?? null,
    price_range_high: data.priceRangeHigh ?? null,
    program_director_name: data.programDirectorName ?? null,
    additional_notes: data.additionalNotes ?? null,
  };

  const { error } = await sb.from("schools").update(row).eq("id", data.schoolId);
  if (error) throw error;
}

// ---- Usage / Billing (JS aggregation) ----

const COST_PER_SECOND = 0.00117;

export async function getUsageSummary(fromDate, toDate, schoolId) {
  const sb = getSupabase();
  if (!sb) return {
    totalCalls: 0, completedCalls: 0, totalSeconds: 0, totalMinutes: 0,
    estimatedCostUsd: 0, byScenario: [], byMonth: [],
  };

  let query = sb.from("calls").select("id, scenario, status, duration_seconds, created_at, school_id");
  if (fromDate) query = query.gte("created_at", fromDate.toISOString());
  if (toDate) query = query.lte("created_at", toDate.toISOString());
  if (schoolId != null) query = query.eq("school_id", schoolId);

  const { data: rows, error } = await query;
  if (error) { console.error("[Database] getUsageSummary error:", error); return { totalCalls: 0, completedCalls: 0, totalSeconds: 0, totalMinutes: 0, estimatedCostUsd: 0, byScenario: [], byMonth: [] }; }

  const allRows = rows || [];
  const completedStatuses = ["completed", "scoring", "scored"];

  let totalSeconds = 0;
  let completedCalls = 0;
  const scenarioMap = new Map();
  const monthMap = new Map();

  for (const r of allRows) {
    const dur = r.duration_seconds || 0;
    totalSeconds += dur;
    if (completedStatuses.includes(r.status)) completedCalls++;

    // By scenario
    if (!scenarioMap.has(r.scenario)) scenarioMap.set(r.scenario, { calls: 0, seconds: 0 });
    const sc = scenarioMap.get(r.scenario);
    sc.calls++;
    sc.seconds += dur;

    // By month
    const month = r.created_at ? r.created_at.substring(0, 7) : "unknown";
    if (!monthMap.has(month)) monthMap.set(month, { calls: 0, seconds: 0 });
    const mo = monthMap.get(month);
    mo.calls++;
    mo.seconds += dur;
  }

  const totalMinutes = Math.round((totalSeconds / 60) * 10) / 10;

  return {
    totalCalls: allRows.length,
    completedCalls,
    totalSeconds,
    totalMinutes,
    estimatedCostUsd: Math.round(totalSeconds * COST_PER_SECOND * 100) / 100,
    byScenario: Array.from(scenarioMap.entries())
      .map(([scenario, v]) => ({ scenario, calls: v.calls, seconds: v.seconds, minutes: Math.round((v.seconds / 60) * 10) / 10 }))
      .sort((a, b) => b.seconds - a.seconds),
    byMonth: Array.from(monthMap.entries())
      .map(([month, v]) => ({ month, calls: v.calls, seconds: v.seconds, minutes: Math.round((v.seconds / 60) * 10) / 10 }))
      .sort((a, b) => a.month.localeCompare(b.month)),
  };
}

export async function getUsageByUser(fromDate, toDate, schoolId) {
  const sb = getSupabase();
  if (!sb) return [];

  let query = sb.from("calls").select("id, user_id, school_id, status, duration_seconds, created_at, users!inner(name, email)");
  if (fromDate) query = query.gte("created_at", fromDate.toISOString());
  if (toDate) query = query.lte("created_at", toDate.toISOString());
  if (schoolId != null) query = query.eq("school_id", schoolId);

  const { data: callRows, error: callErr } = await query;
  if (callErr) { console.error("[Database] getUsageByUser error:", callErr); return []; }

  // Fetch scorecards for avg score
  const { data: scorecardRows } = await sb.from("scorecards").select("call_id, overall_score");
  const scoreByCallId = new Map();
  for (const sc of scorecardRows || []) {
    scoreByCallId.set(sc.call_id, sc.overall_score);
  }

  const completedStatuses = ["completed", "scoring", "scored"];
  const userMap = new Map();

  for (const c of callRows || []) {
    const userId = c.user_id;
    const userName = c.users?.name || "Unknown";
    const email = c.users?.email ?? null;
    if (!userMap.has(userId)) {
      userMap.set(userId, { userName, email, totalCalls: 0, completedCalls: 0, totalSeconds: 0, scores: [], lastCallAt: null });
    }
    const entry = userMap.get(userId);
    entry.totalCalls++;
    if (completedStatuses.includes(c.status)) entry.completedCalls++;
    entry.totalSeconds += c.duration_seconds || 0;
    const score = scoreByCallId.get(c.id);
    if (score !== undefined) entry.scores.push(score);
    if (!entry.lastCallAt || c.created_at > entry.lastCallAt) entry.lastCallAt = c.created_at;
  }

  return Array.from(userMap.entries())
    .map(([userId, e]) => {
      const totalMinutes = Math.round((e.totalSeconds / 60) * 10) / 10;
      const avgScore = e.scores.length > 0
        ? Math.round((e.scores.reduce((a, b) => a + b, 0) / e.scores.length) * 10) / 10
        : null;
      return {
        userId,
        userName: e.userName,
        email: e.email,
        totalCalls: e.totalCalls,
        completedCalls: e.completedCalls,
        totalSeconds: e.totalSeconds,
        totalMinutes,
        estimatedCostUsd: Math.round(e.totalSeconds * COST_PER_SECOND * 100) / 100,
        avgScore,
        lastCallAt: e.lastCallAt,
      };
    })
    .sort((a, b) => b.totalSeconds - a.totalSeconds);
}

// ---- Schools ----

export async function getAllSchools() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("schools")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) { console.error("[Database] getAllSchools error:", error); return []; }
  return (data || []).map(toSchoolCamel);
}

export async function deleteSchool(id) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  // Unassign all users from this school first
  const { error: userErr } = await sb
    .from("users")
    .update({ school_id: null, role: "staff" })
    .eq("school_id", id);
  if (userErr) throw userErr;
  // Delete invites
  const { error: inviteErr } = await sb.from("school_invites").delete().eq("school_id", id);
  if (inviteErr) console.error("[Database] deleteSchool invites cleanup:", inviteErr);
  // Delete the school
  const { error } = await sb.from("schools").delete().eq("id", id);
  if (error) throw error;
}

export async function getAllUsers() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("users")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) { console.error("[Database] getAllUsers error:", error); return []; }
  return (data || []).map(toUserCamel);
}

export async function updateUserRole(userId, role) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  const { error } = await sb.from("users").update({ role }).eq("id", userId);
  if (error) throw error;
}

export async function deleteUser(userId) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");

  // Get user email before deleting — needed to find the Supabase Auth account
  const user = await getUserById(userId);

  // Unlink calls — preserves call/scoring data with user_id = null
  const { error: callErr } = await sb.from("calls").update({ user_id: null }).eq("user_id", userId);
  if (callErr) console.error("[Database] deleteUser calls cleanup:", callErr);
  // Delete school_settings if any
  const { error: settErr } = await sb.from("school_settings").delete().eq("user_id", userId);
  if (settErr && settErr.code !== "42P01") console.error("[Database] deleteUser settings cleanup:", settErr);
  // Remove school invites created by this user
  const { error: inviteErr } = await sb.from("school_invites").delete().eq("invited_by", userId);
  if (inviteErr) console.error("[Database] deleteUser invites cleanup:", inviteErr);
  // Delete from public.users
  const { error } = await sb.from("users").delete().eq("id", userId);
  if (error) throw error;

  // Delete from Supabase Auth so they can re-register later
  if (user?.supabaseAuthId) {
    const { error: authErr } = await sb.auth.admin.deleteUser(user.supabaseAuthId);
    if (authErr) console.error("[Database] deleteUser auth cleanup:", authErr);
  } else if (user?.email) {
    // Fallback for users who haven't logged in since the auth ID migration
    try {
      const { data: { users: authUsers } } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const authUser = (authUsers || []).find(
        (u) => u.email?.toLowerCase() === user.email.toLowerCase()
      );
      if (authUser) {
        const { error: authErr } = await sb.auth.admin.deleteUser(authUser.id);
        if (authErr) console.error("[Database] deleteUser auth cleanup:", authErr);
      }
    } catch (authErr) {
      console.error("[Database] deleteUser auth cleanup failed:", authErr);
    }
  }
}

export async function getSchoolById(id) {
  const sb = getSupabase();
  if (!sb || !id) return undefined;
  const { data, error } = await sb.from("schools").select("*").eq("id", id).single();
  if (error && error.code !== "PGRST116") console.error("[Database] getSchoolById error:", error);
  return data ? toSchoolCamel(data) : undefined;
}

export async function getSchoolBySlug(slug) {
  const sb = getSupabase();
  if (!sb || !slug) return undefined;
  const { data, error } = await sb.from("schools").select("*").eq("slug", slug).single();
  if (error && error.code !== "PGRST116") console.error("[Database] getSchoolBySlug error:", error);
  return data ? toSchoolCamel(data) : undefined;
}

export async function createSchool({ name, slug, ownerUserId }) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  const row = { name };
  if (slug) row.slug = slug;
  if (ownerUserId) row.owner_user_id = ownerUserId;
  const { data, error } = await sb.from("schools").insert(row).select("*").single();
  if (error) throw error;
  return toSchoolCamel(data);
}

export async function updateSchool(id, data) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");

  const keyMap = {
    name: "name",
    slug: "slug",
    ownerUserId: "owner_user_id",
    streetAddress: "street_address",
    city: "city",
    state: "state",
    zipCode: "zip_code",
    introOffer: "intro_offer",
    priceRangeLow: "price_range_low",
    priceRangeHigh: "price_range_high",
    programDirectorName: "program_director_name",
    additionalNotes: "additional_notes",
  };

  const row = {};
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    const snakeKey = keyMap[k];
    if (snakeKey) row[snakeKey] = v;
  }

  if (Object.keys(row).length === 0) return;

  const { error } = await sb.from("schools").update(row).eq("id", id);
  if (error) throw error;
}

// ---- School Invites ----

function generateInviteToken() {
  // 32 bytes -> 64 hex chars (fits in VARCHAR(64))
  return randomBytes(32).toString("hex");
}

export async function createInvite({ schoolId, email, role = "staff", invitedBy, expiresInDays = 7 }) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  const token = generateInviteToken();
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from("school_invites")
    .insert({
      school_id: schoolId,
      email: email.toLowerCase(),
      role,
      token,
      invited_by: invitedBy ?? null,
      expires_at: expiresAt,
    })
    .select("*")
    .single();
  if (error) throw error;
  return toInviteCamel(data);
}

export async function getInviteByToken(token) {
  const sb = getSupabase();
  if (!sb || !token) return undefined;
  const { data, error } = await sb.from("school_invites").select("*").eq("token", token).single();
  if (error && error.code !== "PGRST116") console.error("[Database] getInviteByToken error:", error);
  return data ? toInviteCamel(data) : undefined;
}

export async function getPendingInvitesForSchool(schoolId) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("school_invites")
    .select("*")
    .eq("school_id", schoolId)
    .is("accepted_at", null)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) { console.error("[Database] getPendingInvitesForSchool error:", error); return []; }
  return (data || []).map(toInviteCamel);
}

export async function markInviteAccepted(id) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  const { error } = await sb
    .from("school_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function revokeInvite(id) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  const { error } = await sb
    .from("school_invites")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

// ---- Phone Call Attempts (audit + rate limit) ----

export async function logPhoneCallAttempt({ callerNumber, vapiCallId, userId, schoolId, outcome }) {
  const sb = getSupabase();
  if (!sb) return;
  const { error } = await sb.from("phone_call_attempts").insert({
    caller_number: callerNumber,
    vapi_call_id: vapiCallId ?? null,
    user_id: userId ?? null,
    school_id: schoolId ?? null,
    outcome,
  });
  if (error) console.error("[Database] logPhoneCallAttempt error:", error);
}

export async function countRecentPhoneAttempts(callerNumber, minutes = 60) {
  const sb = getSupabase();
  if (!sb || !callerNumber) return 0;
  const since = new Date(Date.now() - minutes * 60 * 1000).toISOString();
  const { count, error } = await sb
    .from("phone_call_attempts")
    .select("id", { count: "exact", head: true })
    .eq("caller_number", callerNumber)
    .gte("created_at", since);
  if (error) { console.error("[Database] countRecentPhoneAttempts error:", error); return 0; }
  return count ?? 0;
}

// ---- Custom Scenarios ----

export async function getActiveCustomScenarios() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("custom_scenarios")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) { console.error("[Database] getActiveCustomScenarios error:", error); return []; }
  return (data || []).map(toCustomScenarioCamel);
}

export async function getAllCustomScenarios() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("custom_scenarios")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) { console.error("[Database] getAllCustomScenarios error:", error); return []; }
  return (data || []).map(toCustomScenarioCamel);
}

export async function getCustomScenarioBySlug(slug) {
  const sb = getSupabase();
  if (!sb || !slug) return undefined;
  const { data, error } = await sb.from("custom_scenarios").select("*").eq("slug", slug).single();
  if (error && error.code !== "PGRST116") console.error("[Database] getCustomScenarioBySlug error:", error);
  return data ? toCustomScenarioCamel(data) : undefined;
}

export async function getCustomScenarioById(id) {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data, error } = await sb.from("custom_scenarios").select("*").eq("id", id).single();
  if (error && error.code !== "PGRST116") console.error("[Database] getCustomScenarioById error:", error);
  return data ? toCustomScenarioCamel(data) : undefined;
}

export async function createCustomScenario(data) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  const row = {
    slug: data.slug,
    title: data.title,
    description: data.description,
    context_type: data.contextType || "inbound_call",
    character_name: data.characterName,
    character_prompt: data.characterPrompt,
    opening_line: data.openingLine || null,
    voice_id: data.voiceId || "Elliot",
    voice_provider: data.voiceProvider || "vapi",
    scoring_prompt: data.scoringPrompt || null,
    is_active: data.isActive !== false,
    created_by: data.createdBy || null,
  };
  const { data: result, error } = await sb
    .from("custom_scenarios")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return toCustomScenarioCamel(result);
}

export async function updateCustomScenario(id, data) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  const keyMap = {
    slug: "slug",
    title: "title",
    description: "description",
    contextType: "context_type",
    characterName: "character_name",
    characterPrompt: "character_prompt",
    openingLine: "opening_line",
    voiceId: "voice_id",
    voiceProvider: "voice_provider",
    scoringPrompt: "scoring_prompt",
    isActive: "is_active",
  };
  const row = { updated_at: new Date().toISOString() };
  for (const [k, v] of Object.entries(data)) {
    if (v === undefined) continue;
    const snakeKey = keyMap[k];
    if (snakeKey) row[snakeKey] = v;
  }
  const { data: result, error } = await sb
    .from("custom_scenarios")
    .update(row)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return toCustomScenarioCamel(result);
}

export async function deleteCustomScenario(id) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  const { error } = await sb.from("custom_scenarios").delete().eq("id", id);
  if (error) throw error;
}
