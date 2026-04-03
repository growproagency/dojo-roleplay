import { createClient } from "@supabase/supabase-js";
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

// ---- Calls ----

export async function createCall(data) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");
  const { data: result, error } = await sb
    .from("calls")
    .insert({
      user_id: data.userId,
      scenario: data.scenario,
      difficulty: data.difficulty,
      vapi_call_id: data.vapiCallId ?? null,
      status: data.status ?? "in_progress",
    })
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

export async function getCallsByUser(userId) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb
    .from("calls")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) { console.error("[Database] getCallsByUser error:", error); return []; }
  return (data || []).map(toCallCamel);
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

export async function getLeaderboard() {
  const sb = getSupabase();
  if (!sb) return [];

  // Fetch all calls with user info
  const { data: callRows, error: callErr } = await sb
    .from("calls")
    .select("id, user_id, status, created_at, users!inner(name)");
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

export async function getSchoolSettings(userId) {
  const sb = getSupabase();
  if (!sb) return undefined;
  const { data, error } = await sb.from("school_settings").select("*").eq("user_id", userId).single();
  if (error && error.code !== "PGRST116") console.error("[Database] getSchoolSettings error:", error);
  return data ? toSettingsCamel(data) : undefined;
}

export async function upsertSchoolSettings(data) {
  const sb = getSupabase();
  if (!sb) throw new Error("Supabase not available");

  const { error } = await sb
    .from("school_settings")
    .upsert({
      user_id: data.userId,
      school_name: data.schoolName,
      street_address: data.streetAddress ?? null,
      city: data.city ?? null,
      state: data.state ?? null,
      zip_code: data.zipCode ?? null,
      intro_offer: data.introOffer ?? null,
      price_range_low: data.priceRangeLow ?? null,
      price_range_high: data.priceRangeHigh ?? null,
      program_director_name: data.programDirectorName ?? null,
      additional_notes: data.additionalNotes ?? null,
    }, { onConflict: "user_id" });

  if (error) throw error;
}

// ---- Usage / Billing (JS aggregation) ----

const COST_PER_SECOND = 0.00117;

export async function getUsageSummary(fromDate, toDate) {
  const sb = getSupabase();
  if (!sb) return {
    totalCalls: 0, completedCalls: 0, totalSeconds: 0, totalMinutes: 0,
    estimatedCostUsd: 0, byScenario: [], byMonth: [],
  };

  let query = sb.from("calls").select("id, scenario, status, duration_seconds, created_at");
  if (fromDate) query = query.gte("created_at", fromDate.toISOString());
  if (toDate) query = query.lte("created_at", toDate.toISOString());

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

export async function getUsageByUser(fromDate, toDate) {
  const sb = getSupabase();
  if (!sb) return [];

  let query = sb.from("calls").select("id, user_id, status, duration_seconds, created_at, users!inner(name, email)");
  if (fromDate) query = query.gte("created_at", fromDate.toISOString());
  if (toDate) query = query.lte("created_at", toDate.toISOString());

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
