import {
  fetchUsage,
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
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DashboardLayout from "@/components/DashboardLayout";
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronDown,
  Clock,
  DollarSign,
  Pencil,
  Phone,
  TrendingUp,
  Users,
} from "lucide-react";

const SCENARIO_LABELS = {
  new_student: "New Student",
  parent_enrollment: "Parent Enrollment",
  web_lead_callback: "Outbound Callback",
  sales_enrollment: "Sales Enrollment",
  renewal_conference: "Renewal Conference",
  cancellation_save: "Cancellation Save",
};

const SCENARIO_COLORS = {
  new_student: "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20 border",
  parent_enrollment: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20 border",
  web_lead_callback: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20 border",
  sales_enrollment: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 border",
  renewal_conference: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20 border",
  cancellation_save: "bg-red-500/10 text-red-700 dark:text-red-300 border-red-500/20 border",
};

const PRESET_LABELS = {
  all: "All Time",
  this_month: "This Month",
  last_month: "Last Month",
  last_30: "Last 30 Days",
  last_90: "Last 90 Days",
};

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
    return { fromDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString() };
  }
  if (preset === "last_month") {
    return {
      fromDate: new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString(),
      toDate: new Date(now.getFullYear(), now.getMonth(), 1).toISOString(),
    };
  }
  return {};
}

function monthInputToRange(monthValue) {
  if (!monthValue) return {};
  const [yearRaw, monthRaw] = monthValue.split("-");
  const year = Number(yearRaw);
  const monthIndex = Number(monthRaw) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return {};
  const from = new Date(year, monthIndex, 1);
  const to = new Date(year, monthIndex + 1, 1);
  return { fromDate: from.toISOString(), toDate: to.toISOString() };
}

function currentMonthInputValue() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function dateInputToIso(value, endOfDay = false) {
  if (!value) return undefined;
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function fmt(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0s";
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${minutes.toFixed(1)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}h ${m}m`;
}

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function fmtUsd(n) {
  return `$${(n ?? 0).toFixed(2)}`;
}

function scenarioLabel(slug) {
  return SCENARIO_LABELS[slug] ?? slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusDot(percentUsed, atCap) {
  if (atCap) return "bg-red-500";
  if (percentUsed != null && percentUsed >= 80) return "bg-amber-500";
  return "bg-green-500";
}

function sortSchools(rows) {
  return [...rows].sort((a, b) => {
    if (a.atCap !== b.atCap) return a.atCap ? -1 : 1;
    const pa = a.percentUsed ?? -1;
    const pb = b.percentUsed ?? -1;
    if (pa !== pb) return pb - pa;
    return (b.totalCostUsd ?? 0) - (a.totalCostUsd ?? 0);
  });
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
    const n = parseFloat(value.trim());
    if (!Number.isFinite(n) || n < 0) {
      toast.error("Cap must be a non-negative number.");
      return;
    }
    saveMutation.mutate(n);
  };

  return (
    <Dialog open={!!school} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Set usage cap - {school?.name}</DialogTitle>
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
          <Button variant="ghost" onClick={() => saveMutation.mutate(null)} disabled={saveMutation.isPending}>
            Remove cap
          </Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending}>
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StatCard({ icon, label, value, sub }) {
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

function MiniMetric({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function UsageSummaryCards({ summary, byUser, isLoading }) {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <StatCard
        icon={<Phone className="w-4 h-4 text-primary" />}
        label="Total Calls"
        value={isLoading ? "-" : String(summary?.totalCalls ?? 0)}
        sub={isLoading ? "" : `${summary?.completedCalls ?? 0} completed`}
      />
      <StatCard
        icon={<Clock className="w-4 h-4 text-blue-500" />}
        label="Total Minutes"
        value={isLoading ? "-" : fmt(summary?.totalMinutes ?? 0)}
        sub={isLoading ? "" : `${summary?.totalSeconds ?? 0}s raw`}
      />
      <StatCard
        icon={<DollarSign className="w-4 h-4 text-green-500" />}
        label="Billed Usage"
        value={isLoading ? "-" : fmtUsd(summary?.estimatedCostUsd ?? 0)}
        sub={
          isLoading
            ? ""
            : `Calls ${fmtUsd(summary?.callCostUsd ?? 0)} · Scoring ${fmtUsd(summary?.scoringCostUsd ?? 0)}`
        }
      />
      <StatCard
        icon={<Users className="w-4 h-4 text-violet-500" />}
        label="Active Staff"
        value={isLoading ? "-" : String(byUser.length)}
        sub={isLoading ? "" : `${byUser.filter((u) => u.totalCalls > 0).length} with calls`}
      />
    </div>
  );
}

function OverallMonthFilter({ value, onChange }) {
  return (
    <div className="flex items-center gap-2">
      <Label htmlFor="overall-month" className="text-xs text-muted-foreground whitespace-nowrap">
        Month
      </Label>
      <Input
        id="overall-month"
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-40 bg-background"
      />
      {value && (
        <Button variant="ghost" size="sm" onClick={() => onChange("")}>
          All time
        </Button>
      )}
    </div>
  );
}

function ChartShell({ title, description, children }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription className="text-xs">{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="h-64">{children}</div>
      </CardContent>
    </Card>
  );
}

function EmptyChart({ label = "No data for this range." }) {
  return (
    <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
      {label}
    </div>
  );
}

function CustomFilterCharts({ summary, byUser, isLoading }) {
  const monthlyData = (summary?.byMonth ?? []).map((row) => ({
    month: row.month,
    calls: row.calls,
    minutes: row.minutes,
  }));

  const scenarioData = (summary?.byScenario ?? []).map((row) => ({
    scenario: scenarioLabel(row.scenario),
    calls: row.calls,
    minutes: row.minutes,
  }));

  const staffCostData = [...(byUser ?? [])]
    .sort((a, b) => (b.estimatedCostUsd ?? 0) - (a.estimatedCostUsd ?? 0))
    .slice(0, 8)
    .map((row) => ({
      name: row.userName || row.email || "Unknown",
      cost: row.estimatedCostUsd ?? 0,
      calls: row.totalCalls ?? 0,
    }));

  if (isLoading) {
    return (
      <div className="grid lg:grid-cols-3 gap-4">
        <ChartShell title="Monthly Calls & Minutes"><EmptyChart label="Loading..." /></ChartShell>
        <ChartShell title="Scenario Mix"><EmptyChart label="Loading..." /></ChartShell>
        <ChartShell title="Staff Billed Usage"><EmptyChart label="Loading..." /></ChartShell>
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <ChartShell title="Monthly Calls & Minutes" description="Call count and practice minutes by calendar month.">
        {monthlyData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={monthlyData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="calls" name="Calls" fill="#2563eb" radius={[4, 4, 0, 0]} />
              <Bar dataKey="minutes" name="Minutes" fill="#14b8a6" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        )}
      </ChartShell>

      <ChartShell title="Scenario Mix" description="Where practice time is being spent.">
        {scenarioData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={scenarioData} layout="vertical" margin={{ top: 8, right: 8, left: 22, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="scenario" tick={{ fontSize: 11 }} width={92} />
              <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="minutes" name="Minutes" fill="#7c3aed" radius={[0, 4, 4, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        )}
      </ChartShell>

      <ChartShell title="Staff Billed Usage" description="Top staff by billed usage in the selected period.">
        {staffCostData.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <RechartsBarChart data={staffCostData} layout="vertical" margin={{ top: 8, right: 8, left: 28, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={88} />
              <Tooltip formatter={(v, name) => name === "cost" ? [fmtUsd(v), "Billed usage"] : [v, name]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="cost" name="Billed usage" fill="#16a34a" radius={[0, 4, 4, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
        )}
      </ChartShell>
    </div>
  );
}

function CustomDateFilter({ data, isLoading, fromDate, toDate, setFromDate, setToDate }) {
  const [open, setOpen] = useState(false);
  const summary = data?.summary;
  const byUser = data?.byUser ?? [];
  const hasFilter = Boolean(fromDate || toDate);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full text-left">
            <CardHeader className="py-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    Custom Filter
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    Filter usage by a single date or date span.
                  </CardDescription>
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
              </div>
            </CardHeader>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="border-t border-border pt-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(260px,0.65fr)_minmax(0,1.35fr)]">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="usage-from-date">From</Label>
                  <Input
                    id="usage-from-date"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="usage-to-date">To</Label>
                  <Input
                    id="usage-to-date"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                  />
                </div>
                <div className="col-span-2 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Leave one side blank for an open-ended range.
                  </p>
                  {hasFilter && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFromDate("");
                        setToDate("");
                      }}
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MiniMetric label="Calls" value={isLoading ? "-" : String(summary?.totalCalls ?? 0)} />
                <MiniMetric label="Minutes" value={isLoading ? "-" : fmt(summary?.totalMinutes ?? 0)} />
                <MiniMetric label="Billed Usage" value={isLoading ? "-" : fmtUsd(summary?.estimatedCostUsd ?? 0)} />
              </div>
            </div>

            <div className="mt-5">
              <CustomFilterCharts summary={summary} byUser={byUser} isLoading={isLoading} />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function ScenarioBreakdown({ summary, isLoading }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          Scenario Breakdown
        </CardTitle>
        <CardDescription className="text-xs">Minutes and call volume by training scenario.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : (summary?.byScenario ?? []).length === 0 ? (
          <div className="text-sm text-muted-foreground">No calls yet.</div>
        ) : (
          (summary?.byScenario ?? []).map((row) => {
            const totalMins = summary?.totalMinutes ?? 1;
            const pct = totalMins > 0 ? Math.round((row.minutes / totalMins) * 100) : 0;
            return (
              <div key={row.scenario} className="space-y-1">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <Badge variant="secondary" className={`text-xs ${SCENARIO_COLORS[row.scenario] ?? ""}`}>
                    {SCENARIO_LABELS[row.scenario] ?? row.scenario}
                  </Badge>
                  <span className="text-muted-foreground tabular-nums whitespace-nowrap">
                    {fmt(row.minutes)} · {row.calls} call{row.calls !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function MonthlyActivity({ summary, isLoading }) {
  const monthlyData = (summary?.byMonth ?? []).map((row) => ({
    month: row.month,
    calls: row.calls,
    minutes: row.minutes,
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-muted-foreground" />
          Monthly Usage Trend
        </CardTitle>
        <CardDescription className="text-xs">Calls and practice minutes by calendar month.</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">Loading...</div>
        ) : monthlyData.length === 0 ? (
          <div className="h-72 flex items-center justify-center text-sm text-muted-foreground">No calls yet.</div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsBarChart data={monthlyData} margin={{ top: 8, right: 12, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value, name) => {
                    if (name === "minutes") return [fmt(Number(value)), "Minutes"];
                    return [value, "Calls"];
                  }}
                  contentStyle={{ fontSize: 12, borderRadius: 8 }}
                />
                <Bar dataKey="calls" name="calls" fill="#2563eb" radius={[4, 4, 0, 0]} />
                <Bar dataKey="minutes" name="minutes" fill="#14b8a6" radius={[4, 4, 0, 0]} />
              </RechartsBarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function DatePresetButton({ preset, setPreset }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="outline" size="sm" className="gap-2 bg-background" onClick={() => setOpen((v) => !v)}>
        <Calendar className="w-4 h-4" />
        {PRESET_LABELS[preset]}
        <ChevronDown className="w-3 h-3 opacity-60" />
      </Button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-card border border-border rounded-lg shadow-lg py-1 min-w-40">
          {Object.keys(PRESET_LABELS).map((p) => (
            <button
              key={p}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-accent transition-colors ${
                preset === p ? "text-primary font-medium" : "text-foreground"
              }`}
              onClick={() => {
                setPreset(p);
                setOpen(false);
              }}
            >
              {PRESET_LABELS[p]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SchoolsPanel({ rows, selectedSchoolId, onSelectSchool, isLoading }) {
  const [editTarget, setEditTarget] = useState(null);

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          Schools
        </CardTitle>
        <CardDescription className="text-xs">
          Select a school to inspect its staff activity, scenarios, cap, and cost.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-6 py-4 text-sm text-muted-foreground">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="px-6 py-4 text-sm text-muted-foreground">No schools yet.</div>
        ) : (
          <div className="divide-y divide-border/50">
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`w-full text-left px-4 py-3 transition-colors hover:bg-secondary/40 ${
                  selectedSchoolId === String(row.id) ? "bg-primary/5" : ""
                }`}
                onClick={() => onSelectSchool(String(row.id))}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="pt-1.5">
                      <span
                        className={`inline-block w-2.5 h-2.5 rounded-full ${statusDot(row.percentUsed, row.atCap)}`}
                        title={row.atCap ? "At cap" : row.percentUsed != null && row.percentUsed >= 80 ? "Approaching cap" : "OK"}
                      />
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium truncate">{row.name}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {fmtUsd(row.totalCostUsd)} · {row.totalCalls} call{row.totalCalls !== 1 ? "s" : ""} ·{" "}
                        {row.usageCapUsd != null ? `${row.percentUsed ?? 0}% of ${fmtUsd(row.usageCapUsd)}` : "no cap"}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditTarget(row);
                    }}
                    className="h-8 w-8 shrink-0"
                    title="Edit cap"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </button>
            ))}
          </div>
        )}
      </CardContent>
      {editTarget && <CapEditDialog school={editTarget} onClose={() => setEditTarget(null)} />}
    </Card>
  );
}

function StaffUsageTable({ byUser, isLoading }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          Staff Usage
        </CardTitle>
        <CardDescription className="text-xs">
          Per-user call volume, minutes, cost, score, and recency.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="px-6 py-4 text-sm text-muted-foreground">Loading...</div>
        ) : byUser.length === 0 ? (
          <div className="px-6 py-4 text-sm text-muted-foreground">No usage data yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Staff</th>
                  <th className="text-right px-3 py-3 font-medium">Calls</th>
                  <th className="text-right px-3 py-3 font-medium">Minutes</th>
                  <th className="text-right px-3 py-3 font-medium">Cost</th>
                  <th className="text-right px-3 py-3 font-medium">Avg Score</th>
                  <th className="text-right px-4 py-3 font-medium">Last Call</th>
                </tr>
              </thead>
              <tbody>
                {byUser.map((row, i) => (
                  <tr
                    key={row.userId}
                    className={`border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors ${
                      i === 0 ? "bg-primary/5" : ""
                    }`}
                  >
                    <td className="px-4 py-3 min-w-48">
                      <div className="font-medium">{row.userName}</div>
                      {row.email && <div className="text-xs text-muted-foreground truncate max-w-56">{row.email}</div>}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium">{row.totalCalls}</td>
                    <td className="px-3 py-3 text-right tabular-nums font-medium">{fmt(row.totalMinutes)}</td>
                    <td className="px-3 py-3 text-right tabular-nums text-green-600 dark:text-green-400 font-medium">
                      {fmtUsd(row.estimatedCostUsd)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      {row.avgScore !== null ? (
                        <span
                          className={`font-medium ${
                            row.avgScore >= 80
                              ? "text-green-600 dark:text-green-400"
                              : row.avgScore >= 60
                                ? "text-yellow-600 dark:text-yellow-400"
                                : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {row.avgScore}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground text-xs whitespace-nowrap">
                      {fmtDate(row.lastCallAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SelectedSchoolBreakdown({ school, summary, byUser, isLoading, preset, setPreset }) {
  const spent = school?.totalCostUsd ?? summary?.estimatedCostUsd ?? 0;
  const cap = school?.usageCapUsd ?? null;
  const percentUsed = school?.percentUsed ?? (cap ? Math.round((spent / cap) * 100) : null);
  const minutesLeft = cap && spent > 0 && (summary?.totalMinutes ?? 0) > 0
    ? Math.max(0, Math.round(((cap - spent) / (spent / summary.totalMinutes))))
    : null;

  if (!school) {
    return (
      <Card>
        <CardContent className="py-8 text-sm text-muted-foreground">
          Select a school to see granular usage.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                {school.name}
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Granular usage by staff member, scenario, and month.
              </CardDescription>
            </div>
            <DatePresetButton preset={preset} setPreset={setPreset} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <MiniMetric label="Spend" value={isLoading ? "-" : fmtUsd(spent)} />
            <MiniMetric label="Cap Used" value={isLoading ? "-" : percentUsed != null ? `${percentUsed}%` : "-"} />
            <MiniMetric label="Calls" value={isLoading ? "-" : String(summary?.totalCalls ?? 0)} />
            <MiniMetric label="Minutes" value={isLoading ? "-" : fmt(summary?.totalMinutes ?? 0)} />
          </div>
          <div className="mt-3 text-xs text-muted-foreground">
            Cap {cap != null ? fmtUsd(cap) : "not set"}
            {minutesLeft != null ? ` · about ${minutesLeft} minutes left at current cost` : ""}
            {summary?.estimatedCostUsd != null
              ? ` · calls ${fmtUsd(summary.callCostUsd ?? 0)} / scoring ${fmtUsd(summary.scoringCostUsd ?? 0)}`
              : ""}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="staff" className="gap-4">
        <TabsList>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="scenarios">Scenarios</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>
        <TabsContent value="staff" className="mt-0">
          <StaffUsageTable byUser={byUser} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="scenarios" className="mt-0">
          <ScenarioBreakdown summary={summary} isLoading={isLoading} />
        </TabsContent>
        <TabsContent value="trends" className="mt-0">
          <MonthlyActivity summary={summary} isLoading={isLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function Usage() {
  const { user, isGlobalAdmin, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [preset, setPreset] = useState("all");
  const [selectedSchoolId, setSelectedSchoolId] = useState(null);
  const [overallMonth, setOverallMonth] = useState(currentMonthInputValue);
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const dateRange = useMemo(() => getDateRange(preset), [preset]);
  const overallDateRange = useMemo(() => monthInputToRange(overallMonth), [overallMonth]);
  const customDateRange = useMemo(() => {
    return {
      fromDate: dateInputToIso(customFromDate),
      toDate: dateInputToIso(customToDate, true),
    };
  }, [customFromDate, customToDate]);

  useEffect(() => {
    if (!authLoading && !isGlobalAdmin) setLocation("/dashboard");
  }, [isGlobalAdmin, authLoading, setLocation]);

  const { data: overallData, isLoading: overallLoading } = useQuery({
    queryKey: ["usage", "overall", overallDateRange],
    queryFn: () => fetchUsage({ ...overallDateRange, schoolId: "all" }),
    enabled: !!user && isGlobalAdmin,
  });

  const { data: customFilterData, isLoading: customFilterLoading } = useQuery({
    queryKey: ["usage", "custom-filter", customDateRange],
    queryFn: () => fetchUsage({ ...customDateRange, schoolId: "all" }),
    enabled: !!user && isGlobalAdmin,
  });

  const { data: schoolRows = [], isLoading: schoolsLoading } = useQuery({
    queryKey: ["schools-usage-overview"],
    queryFn: fetchSchoolsUsageOverview,
    enabled: !!user && isGlobalAdmin,
  });

  const sortedSchools = useMemo(() => sortSchools(schoolRows), [schoolRows]);

  useEffect(() => {
    if (!selectedSchoolId && sortedSchools.length > 0) {
      setSelectedSchoolId(String(sortedSchools[0].id));
    }
  }, [selectedSchoolId, sortedSchools]);

  const { data: selectedData, isLoading: selectedLoading } = useQuery({
    queryKey: ["usage", dateRange, selectedSchoolId],
    queryFn: () => fetchUsage({ ...dateRange, schoolId: selectedSchoolId }),
    enabled: !!user && isGlobalAdmin && !!selectedSchoolId,
  });

  const overallSummary = overallData?.summary;
  const overallByUser = overallData?.byUser ?? [];
  const selectedSchool = sortedSchools.find((s) => String(s.id) === selectedSchoolId) ?? null;
  const selectedSummary = selectedData?.summary;
  const selectedByUser = selectedData?.byUser ?? [];

  if (authLoading) return null;
  if (!user || !isGlobalAdmin) return null;

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 max-w-[1500px] mx-auto">
        <section className="space-y-3">
          <div className="flex items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Platform Overview
              </div>
              <h2 className="mt-1 text-lg font-semibold tracking-tight">Overall Usage</h2>
              <p className="text-sm text-muted-foreground">
                {overallMonth ? "Usage across all schools for the selected month." : "Cumulative usage across every school."}
              </p>
            </div>
            <OverallMonthFilter value={overallMonth} onChange={setOverallMonth} />
          </div>
          <UsageSummaryCards summary={overallSummary} byUser={overallByUser} isLoading={overallLoading} />
        </section>

        <div className="flex items-center gap-4 py-1">
          <div className="h-px flex-1 bg-border" />
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            School Drilldown
          </div>
          <div className="h-px flex-1 bg-border" />
        </div>

        <section className="grid xl:grid-cols-[minmax(320px,0.7fr)_minmax(0,1.45fr)] gap-6 items-start">
          <SchoolsPanel
            rows={sortedSchools}
            selectedSchoolId={selectedSchoolId}
            onSelectSchool={setSelectedSchoolId}
            isLoading={schoolsLoading}
          />
          <SelectedSchoolBreakdown
            school={selectedSchool}
            summary={selectedSummary}
            byUser={selectedByUser}
            isLoading={selectedLoading}
            preset={preset}
            setPreset={setPreset}
          />
        </section>

        <CustomDateFilter
          data={customFilterData}
          isLoading={customFilterLoading}
          fromDate={customFromDate}
          toDate={customToDate}
          setFromDate={setCustomFromDate}
          setToDate={setCustomToDate}
        />

        <p className="text-xs text-muted-foreground border border-border/40 rounded-lg px-4 py-3 bg-muted/20">
          <strong>Cost methodology:</strong> "Calls" is the actual Vapi spend reported at the end of each call.
          "Scoring" is the OpenAI token spend for post-call grading. Older calls without recorded cost fall back
          to the configured per-minute estimate.
        </p>
      </div>
    </DashboardLayout>
  );
}
