import DashboardLayout from "@/components/DashboardLayout";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import DashboardCharts from "@/components/DashboardCharts";
import { fetchCalls } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  BarChart3,
  Clock,
  TrendingUp,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";

function ScenarioBadge({ scenario }) {
  const labels = {
    new_student: "New Student",
    parent_enrollment: "Parent Enrollment",
    web_lead_callback: "Outbound Callback",
    sales_enrollment: "Sales Enrollment",
    renewal_conference: "Renewal",
    cancellation_save: "Cancellation Save",
  };
  const colors = {
    new_student: "",
    parent_enrollment: "",
    web_lead_callback: "bg-orange-500/10 text-orange-400 border-orange-500/20 border",
    sales_enrollment: "bg-purple-500/10 text-purple-400 border-purple-500/20 border",
    renewal_conference: "bg-teal-500/10 text-teal-400 border-teal-500/20 border",
    cancellation_save: "bg-red-500/10 text-red-400 border-red-500/20 border",
  };
  return (
    <Badge variant="secondary" className={`text-xs ${colors[scenario] ?? ""}`}>
      {labels[scenario] ?? scenario}
    </Badge>
  );
}

function DifficultyBadge({ difficulty }) {
  if (!difficulty) return null;
  const config = {
    easy: { label: "Easy", className: "bg-green-500/10 text-green-400 border-green-500/20 border" },
    medium: { label: "Medium", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20 border" },
    hard: { label: "Hard", className: "bg-red-500/10 text-red-400 border-red-500/20 border" },
  };
  const c = config[difficulty] ?? { label: difficulty, className: "bg-muted text-muted-foreground border" };
  return (
    <Badge variant="secondary" className={`text-xs ${c.className}`}>
      {c.label}
    </Badge>
  );
}

function StatusBadge({ status }) {
  const config = {
    in_progress: { label: "In Progress", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
    completed: { label: "Completed", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    scoring: { label: "Scoring...", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    scored: { label: "Scored", className: "bg-green-500/10 text-green-400 border-green-500/20" },
    failed: { label: "Failed", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  };
  const c = config[status] ?? { label: status, className: "bg-muted text-muted-foreground" };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${c.className}`}>
      {c.label}
    </span>
  );
}

function formatDuration(seconds) {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

export default function Dashboard() {
  const [, setLocation] = useLocation();

  const { data: calls, isLoading: callsLoading } = useQuery({ queryKey: ["calls"], queryFn: fetchCalls });

  const recentCalls = calls?.slice(0, 5) ?? [];
  const totalCalls = calls?.length ?? 0;
  const scoredCalls = calls?.filter(c => c.status === "scored" && typeof c.overallScore === "number") ?? [];
  const avgScore = scoredCalls.length > 0
    ? Math.round(scoredCalls.reduce((sum, c) => sum + c.overallScore, 0) / scoredCalls.length)
    : null;

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 py-2">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training Dashboard</h1>
          <p className="text-muted-foreground mt-1">Practice enrollment calls and review your performance.</p>
        </div>

        <OnboardingChecklist />

        {/* Stats row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Calls</span>
                <Phone className="w-4 h-4 text-primary" />
              </div>
              <div className="text-3xl font-bold">{totalCalls}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Scored Calls</span>
                <BarChart3 className="w-4 h-4 text-primary" />
              </div>
              <div className="text-3xl font-bold">{scoredCalls.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Avg Score</span>
                <TrendingUp className="w-4 h-4 text-primary" />
              </div>
              <div className="text-3xl font-bold">{avgScore !== null ? `${avgScore}` : "—"}</div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Practice Time</span>
                <Clock className="w-4 h-4 text-primary" />
              </div>
              <div className="text-3xl font-bold">
                {calls
                  ? `${Math.round((calls.reduce((sum, c) => sum + (c.durationSeconds ?? 0), 0)) / 60)}m`
                  : "—"}
              </div>
            </CardContent>
          </Card>
        </div>

        <DashboardCharts calls={calls} />

        <div>
          {/* Recent calls */}
          <div>
            <Card className="bg-card border-border h-full">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base">Recent Calls</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/calls")}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  View all <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </CardHeader>
              <CardContent>
                {callsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : recentCalls.length === 0 ? (
                  <div className="text-center py-12">
                    <Phone className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No calls yet.</p>
                    <p className="text-xs text-muted-foreground/70 mt-1">Make your first training call to get started.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recentCalls.map(call => (
                      <button
                        key={call.id}
                        onClick={() => setLocation(`/calls/${call.id}`)}
                        className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors text-left group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <Phone className="w-3.5 h-3.5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <ScenarioBadge scenario={call.scenario} />
                              <DifficultyBadge difficulty={call.difficulty} />
                              <StatusBadge status={call.status} />
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{formatDate(call.createdAt)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          <span className="text-sm text-muted-foreground">{formatDuration(call.durationSeconds)}</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
