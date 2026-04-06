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

export async function apiFetch(path, options = {}) {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
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
export const apiLogout = () => apiFetch("/auth/logout", { method: "POST" });
export const fetchScenarios = () => apiFetch("/scenarios");
export const fetchCalls = () => apiFetch("/calls");
export const fetchCall = (id) => apiFetch(`/calls/${id}`);
export const triggerScoring = (callId) => apiFetch(`/calls/${callId}/score`, { method: "POST" });
export const fetchSettings = () => apiFetch("/settings");
export const saveSettings = (data) => apiFetch("/settings", { method: "PUT", body: JSON.stringify(data) });
export const fetchLeaderboard = () => apiFetch("/leaderboard");
export const fetchUsage = (params) => {
  const qs = new URLSearchParams();
  if (params.fromDate) qs.set("fromDate", params.fromDate);
  if (params.toDate) qs.set("toDate", params.toDate);
  const query = qs.toString();
  return apiFetch(`/admin/usage${query ? `?${query}` : ""}`);
};
export const fetchVapiConfig = () => apiFetch("/vapi/config");
