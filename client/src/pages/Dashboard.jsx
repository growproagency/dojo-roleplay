import DashboardLayout from "@/components/DashboardLayout";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import DashboardCharts from "@/components/DashboardCharts";
import ScenariosOverview from "@/components/ScenariosOverview";
import PickSchoolEmptyState from "@/components/PickSchoolEmptyState";
import { useAuth } from "@/hooks/useAuth";
import { useViewingSchool } from "@/contexts/ViewingSchoolContext";
import { fetchCalls } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Phone,
  BarChart3,
  Clock,
  TrendingUp,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { useLocation } from "wouter";

const SCENARIO_LABELS = {
  new_student: "New Student",
  parent_enrollment: "Parent Enrollment",
  web_lead_callback: "Outbound Callback",
  sales_enrollment: "Sales Enrollment",
  renewal_conference: "Renewal",
  cancellation_save: "Cancellation Save",
};

const DIFFICULTY_DOT = {
  easy: "bg-green-500",
  medium: "bg-yellow-500",
  hard: "bg-red-500",
};

const DIFFICULTY_LABEL = {
  easy: "Easy",
  medium: "Medium",
  hard: "Hard",
};

function DifficultyChip({ difficulty }) {
  if (!difficulty) return null;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className={`w-1.5 h-1.5 rounded-full ${DIFFICULTY_DOT[difficulty] ?? "bg-muted-foreground"}`} />
      {DIFFICULTY_LABEL[difficulty] ?? difficulty}
    </span>
  );
}

function scoreColor(score) {
  if (score == null) return "text-muted-foreground";
  if (score >= 80) return "text-green-500";
  if (score >= 60) return "text-yellow-500";
  if (score >= 40) return "text-orange-500";
  return "text-red-500";
}

const STATUS_LABELS = {
  in_progress: "In Progress",
  completed: "Not scored",
  scoring: "Scoring…",
  failed: "Failed",
};

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
  const { isGlobalAdmin } = useAuth();
  const { viewingSchoolId } = useViewingSchool();
  const needsSchool = isGlobalAdmin && viewingSchoolId == null;

  const { data: calls, isLoading: callsLoading } = useQuery({
    queryKey: ["calls", viewingSchoolId ?? "self"],
    queryFn: fetchCalls,
    enabled: !needsSchool,
  });

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

        {needsSchool ? (
          <PickSchoolEmptyState message="Pick a school to see its training dashboard." />
        ) : (
          <>
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

        <ScenariosOverview />

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
                            <div className="flex items-center gap-3 flex-wrap mb-1">
                              <span className="text-sm font-medium text-foreground">
                                {SCENARIO_LABELS[call.scenario] ?? call.scenario}
                              </span>
                              <DifficultyChip difficulty={call.difficulty} />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span>{formatDate(call.createdAt)}</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatDuration(call.durationSeconds)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-2">
                          {call.status === "scored" && call.overallScore != null ? (
                            <div className="text-right">
                              <div className={`text-lg font-semibold leading-none ${scoreColor(call.overallScore)}`}>
                                {call.overallScore}
                              </div>
                              <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">
                                Score
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {STATUS_LABELS[call.status] ?? call.status}
                            </span>
                          )}
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
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
