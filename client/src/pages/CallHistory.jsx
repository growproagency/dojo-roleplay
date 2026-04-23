import DashboardLayout from "@/components/DashboardLayout";
import { fetchCalls, fetchSchoolMembers } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Phone,
  ChevronRight,
  Loader2,
  Clock,
  Calendar,
  BarChart3,
  User,
} from "lucide-react";
import { useState } from "react";
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
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CallHistory() {
  const [, setLocation] = useLocation();
  const { isSchoolAdmin, isGlobalAdmin } = useAuth();
  const showStaffFilter = isSchoolAdmin && !isGlobalAdmin;
  const [userId, setUserId] = useState("all");

  const { data: calls, isLoading } = useQuery({
    queryKey: ["calls", userId],
    queryFn: () => fetchCalls(userId !== "all" ? { userId } : {}),
  });

  const { data: members } = useQuery({
    queryKey: ["school", "members"],
    queryFn: fetchSchoolMembers,
    enabled: showStaffFilter,
  });

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Call History</h1>
            <p className="text-muted-foreground mt-1">
              {calls ? `${calls.length} total call${calls.length !== 1 ? "s" : ""}` : "Loading..."}
            </p>
          </div>
          <Button
            onClick={() => setLocation("/dashboard")}
            variant="outline"
            size="sm"
            className="bg-transparent"
          >
            <Phone className="w-4 h-4 mr-2" />
            Start Call
          </Button>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <CardTitle className="text-base">All Training Sessions</CardTitle>
              {showStaffFilter && (
                <Select value={userId} onValueChange={setUserId}>
                  <SelectTrigger className="w-50 h-8 text-sm">
                    <SelectValue placeholder="All Staff" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Staff</SelectItem>
                    {(members ?? []).map((m) => (
                      <SelectItem key={m.id} value={String(m.id)}>
                        {m.name || m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !calls || calls.length === 0 ? (
              <div className="text-center py-16">
                <Phone className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
                <p className="text-muted-foreground font-medium">No calls yet</p>
                <p className="text-sm text-muted-foreground/70 mt-1 mb-6">
                  Make your first training call to see your history here.
                </p>
                <Button onClick={() => setLocation("/dashboard")} size="sm">
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {calls.map((call) => (
                  <button
                    key={call.id}
                    onClick={() => setLocation(`/calls/${call.id}`)}
                    className="w-full flex items-center justify-between py-4 px-2 hover:bg-secondary/30 transition-colors text-left group rounded-lg"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Phone className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <ScenarioBadge scenario={call.scenario} />
                          <DifficultyBadge difficulty={call.difficulty} />
                          <StatusBadge status={call.status} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(call.createdAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDuration(call.durationSeconds)}
                          </span>
                          {call.userName && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {call.userName}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {call.status === "scored" && (
                        <div className="flex items-center gap-1 text-green-400">
                          <BarChart3 className="w-4 h-4" />
                          <span className="text-xs font-medium">Scored</span>
                        </div>
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
    </DashboardLayout>
  );
}
