import {
  fetchUsage,
  fetchAdminSchools,
  fetchSchoolsUsageOverview,
  updateAdminSchool,
} from "@/lib/api";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Clock,
  Phone,
  DollarSign,
  Users,
  TrendingUp,
  BarChart3,
  Calendar,
  ChevronDown,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

const SCENARIO_LABELS = {
  new_student: "New Student",
  parent_enrollment: "Parent Enrollment",
  web_lead_callback: "Outbound Callback",
  sales_enrollment: "Sales Enrollment",
  renewal_conference: "Renewal Conference",
  cancellation_save: "Cancellation Save",
};

const SCENARIO_COLORS = {
  new_student: "bg-blue-500/10 text-blue-400 border-blue-500/20 border",
  parent_enrollment: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20 border",
  web_lead_callback: "bg-orange-500/10 text-orange-400 border-orange-500/20 border",
  sales_enrollment: "bg-purple-500/10 text-purple-400 border-purple-500/20 border",
  renewal_conference: "bg-teal-500/10 text-teal-400 border-teal-500/20 border",
  cancellation_save: "bg-red-500/10 text-red-400 border-red-500/20 border",
};

function fmt(minutes) {
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${minutes.toFixed(1)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

// ── date range presets ────────────────────────────────────────────────────────

function getDateRange(preset) {
  const now = new Date();
  if (preset === "all") return {};
  if (preset === "last_30") {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { fromDate: from.toISOString() };
  }
  if (preset === "last_90") {
    const from = new Date(now);
    from.setDate(from.getDate() - 90);
    return { fromDate: from.toISOString() };
  }
  if (preset === "this_month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { fromDate: from.toISOString() };
  }
  if (preset === "last_month") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 1);
    return { fromDate: from.toISOString(), toDate: to.toISOString() };
  }
  return {};
}

const PRESET_LABELS = {
  all: "All Time",
  this_month: "This Month",
  last_month: "Last Month",
  last_30: "Last 30 Days",
  last_90: "Last 90 Days",
};

// ── schools overview (global admin only) ──────────────────────────────────────

function statusDot(percentUsed, atCap) {
  if (atCap) return "bg-red-500";
  if (percentUsed != null && percentUsed >= 80) return "bg-amber-500";
  return "bg-green-500";
}

function CapEditDialog({ school, onClose }) {
  const queryClient = useQueryClient();
  const [value, setValue] = useState(school?.usageCapUsd != null ? String(school.usageCapUsd) : "");

  const saveMutation = useMutation({
    mutationFn: (cap) => updateAdminSchool(school.id, { usageCapUsd: cap }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["schools-usage-overview"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Cap updated");
      onClose();
    },
    onError: (err) => toast.error(err.message || "Failed to update cap"),
  });

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.error("Enter a number, or use \"Remove cap\" to clear.");
      return;
    }
    const n = parseFloat(trimmed);
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Cap must be a non-negative number.");
      return;
    }
    saveMutation.mutate(n);
  };

  const handleRemove = () => saveMutation.mutate(null);

  return (
    <Dialog open={!!school} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Set usage cap — {school?.name}</DialogTitle>
          <DialogDescription>
            Lifetime cumulative spend in USD. New calls are blocked when reached.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="cap">Cap (USD)</Label>
          <Input
            id="cap"
            type="number"
            min={0}
            step={0.01}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="50.00"
            autoFocus
          />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={handleRemove} disabled={saveMutation.isPending}>
            Remove cap
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SchoolsOverviewTable({ onSelectSchool }) {
  const [editTarget, setEditTarget] = useState(null);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["schools-usage-overview"],
    queryFn: fetchSchoolsUsageOverview,
  });

  // Sort: at-cap first, then by % used desc, then by total spend desc.
  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.atCap !== b.atCap) return a.atCap ? -1 : 1;
      const pa = a.percentUsed ?? -1;
      const pb = b.percentUsed ?? -1;
      if (pa !== pb) return pb - pa;
      return (b.totalCostUsd ?? 0) - (a.totalCostUsd ?? 0);
    });
  }, [rows]);

  const totalSpent = sorted.reduce((s, r) => s + (r.totalCostUsd ?? 0), 0);
  const totalCap = sorted.reduce((s, r) => s + (r.usageCapUsd ?? 0), 0);

  const fmtUsd = (n) => `$${(n ?? 0).toFixed(2)}`;
  const estMinutesLeft = (r) => {
    if (r.usageCapUsd == null || r.totalCalls === 0 || r.totalSeconds === 0) return null;
    const remaining = Math.max(r.usageCapUsd - r.totalCostUsd, 0);
    const costPerSec = r.totalCostUsd / r.totalSeconds;
    if (costPerSec <= 0) return null;
    const secondsLeft = remaining / costPerSec;
    return Math.round(secondsLeft / 60);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          Schools — usage & caps
        </CardTitle>
        <CardDescription className="text-xs">
          Cumulative lifetime spend per school. Set a cap to hard-stop new calls when the school reaches it.
          Click a row to drill into per-user detail.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-6 py-4 text-sm text-muted-foreground">Loading…</div>
        ) : sorted.length === 0 ? (
          <div className="px-6 py-4 text-sm text-muted-foreground">No schools yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3"></th>
                  <th className="px-4 py-3">School</th>
                  <th className="px-4 py-3 text-right">Total Spent</th>
                  <th className="px-4 py-3 text-right">Cap</th>
                  <th className="px-4 py-3 text-right">% Used</th>
                  <th className="px-4 py-3 text-right">Est. Min Left</th>
                  <th className="px-4 py-3 text-right">Calls</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((row) => {
                  const minsLeft = estMinutesLeft(row);
                  return (
                    <tr
                      key={row.id}
                      className="border-b border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer"
                      onClick={() => onSelectSchool(String(row.id))}
                    >
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`inline-block w-2.5 h-2.5 rounded-full ${statusDot(row.percentUsed, row.atCap)}`}
                          title={row.atCap ? "At cap" : row.percentUsed != null && row.percentUsed >= 80 ? "Approaching cap" : "OK"}
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{row.name}</td>
                      <td className="px-4 py-3 text-right text-foreground font-medium">{fmtUsd(row.totalCostUsd)}</td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {row.usageCapUsd != null ? fmtUsd(row.usageCapUsd) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {row.percentUsed != null ? `${row.percentUsed}%` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {minsLeft != null ? `~${minsLeft} min` : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">{row.totalCalls}</td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); setEditTarget(row); }}
                          className="h-7 px-2"
                        >
                          <Pencil className="w-3.5 h-3.5 mr-1" />
                          Cap
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-border/60 bg-muted/20 text-xs">
                  <td className="px-4 py-2"></td>
                  <td className="px-4 py-2 font-medium">Total ({sorted.length} schools)</td>
                  <td className="px-4 py-2 text-right font-medium">{fmtUsd(totalSpent)}</td>
                  <td className="px-4 py-2 text-right text-muted-foreground">{totalCap > 0 ? fmtUsd(totalCap) : "—"}</td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
      {editTarget && (
        <CapEditDialog school={editTarget} onClose={() => setEditTarget(null)} />
      )}
    </Card>
  );
}

// ── component ─────────────────────────────────────────────────────────────────

export default function Usage() {
  const { user, isGlobalAdmin, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [preset, setPreset] = useState("all");
  const [showPresets, setShowPresets] = useState(false);
  const [schoolFilter, setSchoolFilter] = useState("all");

  useEffect(() => {
    if (!authLoading && !isGlobalAdmin) {
      setLocation("/dashboard");
    }
  }, [isGlobalAdmin, authLoading, setLocation]);

  const dateRange = useMemo(() => getDateRange(preset), [preset]);

  const { data, isLoading } = useQuery({
    queryKey: ["usage", dateRange, schoolFilter],
    queryFn: () => fetchUsage({ ...dateRange, schoolId: schoolFilter }),
    enabled: !!user && isGlobalAdmin,
  });

  const { data: schools } = useQuery({
    queryKey: ["admin-schools"],
    queryFn: fetchAdminSchools,
    enabled: !!user && isGlobalAdmin,
  });

  const summary = data?.summary;
  const byUser = data?.byUser ?? [];

  if (authLoading) return null;
  if (!user || !isGlobalAdmin) return null;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            {schoolFilter !== "all" && (
              <button
                onClick={() => setSchoolFilter("all")}
                className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
              >
                ← All schools
              </button>
            )}
            <h1 className="text-2xl font-bold tracking-tight">
              {schoolFilter === "all"
                ? "Usage & Billing"
                : `Usage — ${(schools ?? []).find((s) => String(s.id) === schoolFilter)?.name ?? "School"}`}
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {schoolFilter === "all"
                ? "Cumulative spend per school. Click a row to drill into per-user detail."
                : "Per-user activity, scenario breakdown, and monthly trend."}
            </p>
          </div>
          {/* Date range picker — only meaningful inside a per-school detail view */}
          {schoolFilter !== "all" && (
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-background"
                onClick={() => setShowPresets(v => !v)}
              >
                <Calendar className="w-4 h-4" />
                {PRESET_LABELS[preset]}
                <ChevronDown className="w-3 h-3 opacity-60" />
              </Button>
              {showPresets && (
                <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-40">
                  {Object.keys(PRESET_LABELS).map(p => (
                    <button
                      key={p}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${preset === p ? "text-primary font-medium" : "text-foreground"}`}
                      onClick={() => { setPreset(p); setShowPresets(false); }}
                    >
                      {PRESET_LABELS[p]}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Schools overview table — shown when no specific school is picked */}
        {schoolFilter === "all" && (
          <SchoolsOverviewTable onSelectSchool={setSchoolFilter} />
        )}

        {/* Per-school detail — only when a specific school is picked */}
        {schoolFilter !== "all" && (
        <>
        {/* Summary stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            icon={<Phone className="w-4 h-4 text-primary" />}
            label="Total Calls"
            value={isLoading ? "—" : String(summary?.totalCalls ?? 0)}
            sub={isLoading ? "" : `${summary?.completedCalls ?? 0} completed`}
          />
          <StatCard
            icon={<Clock className="w-4 h-4 text-blue-400" />}
            label="Total Minutes"
            value={isLoading ? "—" : fmt(summary?.totalMinutes ?? 0)}
            sub={isLoading ? "" : `${summary?.totalSeconds ?? 0}s raw`}
          />
          <StatCard
            icon={<DollarSign className="w-4 h-4 text-green-400" />}
            label="Cost"
            value={isLoading ? "—" : `$${(summary?.estimatedCostUsd ?? 0).toFixed(2)}`}
            sub={
              isLoading
                ? ""
                : `Calls: $${(summary?.callCostUsd ?? 0).toFixed(2)} · Scoring: $${(summary?.scoringCostUsd ?? 0).toFixed(2)}`
            }
          />
          <StatCard
            icon={<Users className="w-4 h-4 text-purple-400" />}
            label="Active Users"
            value={isLoading ? "—" : String(byUser.length)}
            sub={isLoading ? "" : `${byUser.filter(u => u.totalCalls > 0).length} with calls`}
          />
        </div>

        {/* Two-column: by scenario + by month */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* By scenario */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Minutes by Scenario
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (summary?.byScenario ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">No calls yet.</div>
              ) : (
                (summary?.byScenario ?? []).map(row => {
                  const totalMins = summary?.totalMinutes ?? 1;
                  const pct = totalMins > 0 ? Math.round((row.minutes / totalMins) * 100) : 0;
                  return (
                    <div key={row.scenario} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <Badge variant="secondary" className={`text-xs ${SCENARIO_COLORS[row.scenario] ?? ""}`}>
                          {SCENARIO_LABELS[row.scenario] ?? row.scenario}
                        </Badge>
                        <span className="text-muted-foreground tabular-nums">
                          {fmt(row.minutes)} · {row.calls} call{row.calls !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary/60 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* By month */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                Monthly Activity
              </CardTitle>
              <CardDescription className="text-xs">Calls and minutes per calendar month</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-sm text-muted-foreground">Loading…</div>
              ) : (summary?.byMonth ?? []).length === 0 ? (
                <div className="text-sm text-muted-foreground">No calls yet.</div>
              ) : (
                <div className="space-y-2">
                  {[...(summary?.byMonth ?? [])].reverse().map(row => (
                    <div key={row.month} className="flex items-center justify-between text-sm py-1 border-b border-border/40 last:border-0">
                      <span className="font-medium tabular-nums">{row.month}</span>
                      <div className="flex items-center gap-4 text-muted-foreground tabular-nums">
                        <span>{row.calls} call{row.calls !== 1 ? "s" : ""}</span>
                        <span className="text-foreground font-medium">{fmt(row.minutes)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Per-user table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              Usage by Staff Member
            </CardTitle>
            <CardDescription className="text-xs">
              Sorted by total minutes used. Cost is the actual Vapi + OpenAI spend per call when
              recorded; older calls fall back to a $0.07/min estimate.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="px-6 py-4 text-sm text-muted-foreground">Loading…</div>
            ) : byUser.length === 0 ? (
              <div className="px-6 py-4 text-sm text-muted-foreground">No usage data yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/60 text-muted-foreground text-xs uppercase tracking-wide">
                      <th className="text-left px-6 py-3 font-medium">Staff Member</th>
                      <th className="text-right px-4 py-3 font-medium">Calls</th>
                      <th className="text-right px-4 py-3 font-medium">Minutes</th>
                      <th className="text-right px-4 py-3 font-medium">Est. Cost</th>
                      <th className="text-right px-4 py-3 font-medium">Avg Score</th>
                      <th className="text-right px-6 py-3 font-medium">Last Call</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byUser.map((row, i) => (
                      <tr
                        key={row.userId}
                        className={`border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors ${i === 0 ? "bg-primary/5" : ""}`}
                      >
                        <td className="px-6 py-3">
                          <div className="font-medium">{row.userName}</div>
                          {row.email && (
                            <div className="text-xs text-muted-foreground">{row.email}</div>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className="font-medium">{row.totalCalls}</span>
                          {row.completedCalls < row.totalCalls && (
                            <span className="text-muted-foreground text-xs ml-1">
                              ({row.completedCalls} done)
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums font-medium">
                          {fmt(row.totalMinutes)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className="text-green-400 font-medium">
                            ${row.estimatedCostUsd.toFixed(2)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {row.avgScore !== null ? (
                            <span className={`font-medium ${row.avgScore >= 80 ? "text-green-400" : row.avgScore >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                              {row.avgScore}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right text-muted-foreground text-xs">
                          {fmtDate(row.lastCallAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Totals footer */}
                  <tfoot>
                    <tr className="border-t border-border bg-muted/20 text-xs font-semibold text-muted-foreground">
                      <td className="px-6 py-3">Total</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {byUser.reduce((s, r) => s + r.totalCalls, 0)}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {fmt(byUser.reduce((s, r) => s + r.totalMinutes, 0))}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-green-400">
                        ${byUser.reduce((s, r) => s + r.estimatedCostUsd, 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-6 py-3" />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cost methodology note */}
        <p className="text-xs text-muted-foreground border border-border/40 rounded-lg px-4 py-3 bg-muted/20">
          <strong>Cost methodology:</strong> "Calls" is the actual Vapi spend (voice, LLM, transcription, transport)
          reported by Vapi at the end of each call. "Scoring" is the actual OpenAI token spend for post-call grading.
          Older calls without recorded cost fall back to a $0.07/min estimate.
        </p>
        </>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatCard({
  icon, label, value, sub,
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <span className="text-xs text-muted-foreground uppercase tracking-wide font-medium">{label}</span>
        </div>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}
