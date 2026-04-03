import DashboardLayout from "@/components/DashboardLayout";
import { fetchCall, triggerScoring as triggerScoringApi } from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Loader2,
  Phone,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  BarChart3,
  RefreshCw,
  FileText,
  Volume2,
  User,
  Bot,
} from "lucide-react";
import { useState, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

function ScoreRing({ score, size = 120 }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (s) => {
    if (s >= 80) return "#4ade80"; // green
    if (s >= 60) return "#facc15"; // yellow
    if (s >= 40) return "#fb923c"; // orange
    return "#f87171"; // red
  };

  const color = getColor(score);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="8"
          className="text-secondary"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease-in-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{Math.round(score)}</span>
        <span className="text-xs text-muted-foreground">/ 100</span>
      </div>
    </div>
  );
}

function CategoryBar({ name, score, feedback }) {
  const getColor = (s) => {
    if (s >= 8) return "bg-green-500";
    if (s >= 6) return "bg-yellow-500";
    if (s >= 4) return "bg-orange-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{name}</span>
        <span className="text-sm font-bold">{score}/10</span>
      </div>
      <div className="h-2 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${getColor(score)}`}
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{feedback}</p>
    </div>
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
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const scenarioLabels = {
  new_student: "New Student Inquiry",
  parent_enrollment: "Parent Enrollment",
  web_lead_callback: "Outbound Web Lead Callback",
  sales_enrollment: "Sales Enrollment Conference",
  renewal_conference: "Renewal Conference",
  cancellation_save: "Cancellation Save",
};

export default function ScorecardDetail() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const callId = parseInt(params.id ?? "0", 10);

  const { data, isLoading, refetch } = useQuery({ queryKey: ["call", callId], queryFn: () => fetchCall(callId) });
  const triggerScoring = useMutation({
    mutationFn: (id) => triggerScoringApi(id),
    onSuccess: () => {
      toast.success("Scoring started! Refresh in a moment.");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  const call = data?.call;
  const scorecard = data?.scorecard;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!call) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-12 text-center">
          <p className="text-muted-foreground">Call not found.</p>
          <Button onClick={() => setLocation("/calls")} variant="outline" className="mt-4 bg-transparent">
            Back to Call History
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6 py-2">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/calls")}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>

        {/* Call info */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <Badge variant="secondary">{scenarioLabels[call.scenario] ?? call.scenario}</Badge>
              {call.difficulty && (() => {
                const diffConfig = {
                  easy: { label: "Easy", className: "bg-green-500/10 text-green-400 border-green-500/20" },
                  medium: { label: "Medium", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
                  hard: { label: "Hard", className: "bg-red-500/10 text-red-400 border-red-500/20" },
                };
                const dc = diffConfig[call.difficulty] ?? { label: call.difficulty, className: "bg-muted text-muted-foreground border" };
                return <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${dc.className}`}>{dc.label}</span>;
              })()}
              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                call.status === "scored"
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : call.status === "scoring"
                  ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                  : "bg-blue-500/10 text-blue-400 border-blue-500/20"
              }`}>
                {call.status === "scored" ? "Scored" : call.status === "scoring" ? "Scoring..." : call.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Call Scorecard</h1>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {formatDate(call.createdAt)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {formatDuration(call.durationSeconds)}
              </span>
            </div>
          </div>
          {call.status === "completed" && !scorecard && (
            <Button
              onClick={() => triggerScoring.mutate(call.id)}
              disabled={triggerScoring.isPending}
              size="sm"
            >
              {triggerScoring.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Scoring...</>
              ) : (
                <><BarChart3 className="w-4 h-4 mr-2" />Generate Scorecard</>
              )}
            </Button>
          )}
          {call.status === "scored" && scorecard && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="bg-transparent"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>

        {/* No scorecard yet */}
        {!scorecard && call.status !== "scoring" && (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <BarChart3 className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">
                {call.status === "in_progress"
                  ? "Call is in progress..."
                  : call.status === "failed"
                  ? "This call failed to record."
                  : "Scorecard not yet generated."}
              </p>
              {call.status === "completed" && (
                <p className="text-sm text-muted-foreground/70 mt-1">
                  Click "Generate Scorecard" above to analyze this call.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {call.status === "scoring" && (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
              <p className="text-muted-foreground font-medium">Analyzing your call...</p>
              <p className="text-sm text-muted-foreground/70 mt-1">This usually takes 15-30 seconds.</p>
              <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-4">
                <RefreshCw className="w-4 h-4 mr-2" />
                Check Status
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Scorecard */}
        {scorecard && (
          <>
            {/* Overall score + summary */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="bg-card border-border flex flex-col items-center justify-center py-8">
                <p className="text-sm text-muted-foreground mb-4 font-medium">Overall Score</p>
                <ScoreRing score={scorecard.overallScore} size={140} />
                <p className="text-sm text-muted-foreground mt-4 text-center px-4">
                  {scorecard.overallScore >= 80
                    ? "Excellent performance!"
                    : scorecard.overallScore >= 60
                    ? "Good — room to grow"
                    : scorecard.overallScore >= 40
                    ? "Needs improvement"
                    : "Significant work needed"}
                </p>
              </Card>
              <Card className="bg-card border-border md:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Call Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{scorecard.summary}</p>
                </CardContent>
              </Card>
            </div>

            {/* Category breakdown */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-primary" />
                  Performance Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-6">
                  {scorecard.categories.map((cat) => (
                    <CategoryBar
                      key={cat.name}
                      name={cat.name}
                      score={cat.score}
                      feedback={cat.feedback}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Highlights + Missed Opportunities */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    What You Did Well
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {scorecard.highlights.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No highlights recorded.</p>
                  ) : (
                    <ul className="space-y-3">
                      {scorecard.highlights.map((h, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                          <span className="text-muted-foreground leading-relaxed">{h}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-400" />
                    Missed Opportunities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {scorecard.missedOpportunities.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No missed opportunities identified.</p>
                  ) : (
                    <ul className="space-y-3">
                      {scorecard.missedOpportunities.map((m, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 shrink-0" />
                          <span className="text-muted-foreground leading-relaxed">{m}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Coaching suggestions */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  Coaching Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {scorecard.suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No suggestions available.</p>
                ) : (
                  <div className="space-y-3">
                    {scorecard.suggestions.map((s, i) => (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">{i + 1}</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{s}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Transcript + Recording */}
            {(call.transcriptTurns?.length > 0 || call.transcription || call.recordingS3Url || call.recordingUrl) && (
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    Call Replay
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Audio player */}
                  {(call.recordingS3Url || call.recordingUrl) && (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border border-border">
                      <Volume2 className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1 font-medium">Call Recording</p>
                        <audio
                          controls
                          className="w-full h-8"
                          src={call.recordingS3Url || call.recordingUrl || undefined}
                        />
                      </div>
                    </div>
                  )}

                  {/* Structured transcript turns */}
                  {call.transcriptTurns?.length > 0 ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {call.transcriptTurns.map((turn, i) => (
                        <div
                          key={i}
                          className={`flex gap-3 ${
                            turn.role === "staff" ? "flex-row" : "flex-row-reverse"
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            turn.role === "staff"
                              ? "bg-primary/20 text-primary"
                              : "bg-secondary text-muted-foreground"
                          }`}>
                            {turn.role === "staff" ? (
                              <User className="w-3.5 h-3.5" />
                            ) : (
                              <Bot className="w-3.5 h-3.5" />
                            )}
                          </div>
                          <div className={`max-w-[75%] ${
                            turn.role === "staff" ? "items-start" : "items-end"
                          } flex flex-col gap-1`}>
                            <span className="text-xs text-muted-foreground font-medium">
                              {turn.role === "staff" ? "You" : "AI Prospect"}
                              {turn.timestamp !== undefined && (
                                <span className="ml-2 opacity-60">
                                  {Math.floor(turn.timestamp / 60000)}:{String(Math.floor((turn.timestamp % 60000) / 1000)).padStart(2, "0")}
                                </span>
                              )}
                            </span>
                            <div className={`px-3 py-2 rounded-xl text-sm leading-relaxed ${
                              turn.role === "staff"
                                ? "bg-primary/10 text-foreground border border-primary/20"
                                : "bg-secondary text-muted-foreground border border-border"
                            }`}>
                              {turn.text}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : call.transcription ? (
                    <div className="bg-secondary/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                      <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed">
                        {call.transcription}
                      </pre>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
