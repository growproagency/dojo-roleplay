import { supabase } from "./supabase";

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : "/api";

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    return { Authorization: `Bearer ${session.access_token}` };
  }
  return {};
}

function getViewingSchoolHeader() {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem("dojo:viewingSchoolId");
  if (!raw) return {};
  return { "X-Viewing-School-Id": raw };
}

export async function apiFetch(path, options = {}) {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...getViewingSchoolHeader(),
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || res.statusText);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

// ---- API endpoints ----

export const fetchMe = () => apiFetch("/auth/me");
export const updateMe = (data) => apiFetch("/auth/me", { method: "PUT", body: JSON.stringify(data) });
export const apiLogout = () => apiFetch("/auth/logout", { method: "POST" });
export const fetchScenarios = () => apiFetch("/scenarios");
export const fetchCalls = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.userId) qs.set("userId", params.userId);
  const query = qs.toString();
  return apiFetch(`/calls${query ? `?${query}` : ""}`);
};
export const fetchCall = (id) => apiFetch(`/calls/${id}`);
export const triggerScoring = (callId) => apiFetch(`/calls/${callId}/score`, { method: "POST" });
export const fetchSettings = () => apiFetch("/settings");
export const saveSettings = (data) => apiFetch("/settings", { method: "PUT", body: JSON.stringify(data) });
export const fetchLeaderboard = (params = {}) => {
  const qs = new URLSearchParams();
  if (params.scenario) qs.set("scenario", params.scenario);
  if (params.range) qs.set("range", params.range);
  const query = qs.toString();
  return apiFetch(`/leaderboard${query ? `?${query}` : ""}`);
};
export const fetchUsage = (params) => {
  const qs = new URLSearchParams();
  if (params.fromDate) qs.set("fromDate", params.fromDate);
  if (params.toDate) qs.set("toDate", params.toDate);
  const query = qs.toString();
  return apiFetch(`/admin/usage${query ? `?${query}` : ""}`);
};
export const fetchVapiConfig = () => apiFetch("/vapi-config");
export const fetchVapiAssistantOverrides = () => apiFetch("/vapi-config/overrides");
export const fetchVapiSessionToken = () => apiFetch("/vapi-config/session-token", { method: "POST" });

// ---- School & members ----
export const fetchSchool = () => apiFetch("/school");
export const updateSchool = (data) => apiFetch("/school", { method: "PUT", body: JSON.stringify(data) });
export const fetchSchoolMembers = () => apiFetch("/school/members");
export const removeSchoolMember = (userId) => apiFetch(`/school/members/${userId}`, { method: "DELETE" });
export const resetSchoolMemberPassword = (userId) => apiFetch(`/school/members/${userId}/reset-password`, { method: "POST" });

// ---- Invites (school admin) ----
export const fetchSchoolInvites = () => apiFetch("/school/invites");
export const createSchoolInvite = (data) => apiFetch("/school/invites", { method: "POST", body: JSON.stringify(data) });
export const revokeSchoolInvite = (id) => apiFetch(`/school/invites/${id}`, { method: "DELETE" });

// ---- Invite acceptance (public + authenticated) ----
export const fetchInvitePreview = (token) => apiFetch(`/invites/${token}`);
export const acceptInvite = (token) => apiFetch(`/invites/${token}/accept`, { method: "POST" });

// ---- Super admin ----
// ---- Custom scenarios (global admin) ----
export const fetchCustomScenarios = () => apiFetch("/scenarios/custom");
export const fetchCustomScenario = (id) => apiFetch(`/scenarios/custom/${id}`);
export const createCustomScenario = (data) => apiFetch("/scenarios/custom", { method: "POST", body: JSON.stringify(data) });
export const updateCustomScenario = (id, data) => apiFetch(`/scenarios/custom/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteCustomScenario = (id) => apiFetch(`/scenarios/custom/${id}`, { method: "DELETE" });

// ---- Super admin ----
export const fetchAdminSchools = () => apiFetch("/admin/schools");
export const fetchAdminSchool = (id) => apiFetch(`/admin/schools/${id}`);
export const createAdminSchool = (data) => apiFetch("/admin/schools", { method: "POST", body: JSON.stringify(data) });
export const updateAdminSchool = (id, data) => apiFetch(`/admin/schools/${id}`, { method: "PUT", body: JSON.stringify(data) });
export const deleteAdminSchool = (id) => apiFetch(`/admin/schools/${id}`, { method: "DELETE" });
export const fetchAdminUsers = () => apiFetch("/admin/users");
export const fetchAdminSchoolInvites = (schoolId) => apiFetch(`/admin/schools/${schoolId}/invites`);
export const createAdminSchoolInvite = (schoolId, data) => apiFetch(`/admin/schools/${schoolId}/invites`, { method: "POST", body: JSON.stringify(data) });
export const revokeAdminSchoolInvite = (schoolId, inviteId) => apiFetch(`/admin/schools/${schoolId}/invites/${inviteId}`, { method: "DELETE" });
export const changeAdminUserRole = (id, role) => apiFetch(`/admin/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) });
export const assignAdminUserSchool = (id, schoolId) => apiFetch(`/admin/users/${id}/school`, { method: "PUT", body: JSON.stringify({ schoolId }) });
export const deleteAdminUser = (id) => apiFetch(`/admin/users/${id}`, { method: "DELETE" });
export const resetAdminUserPassword = (id) => apiFetch(`/admin/users/${id}/reset-password`, { method: "POST" });
