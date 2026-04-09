import DashboardLayout from "@/components/DashboardLayout";
import { fetchCalls, fetchVapiConfig, fetchScenarios } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  BarChart3,
  Clock,
  TrendingUp,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronRight,
  Target,
  Star,
  ShieldAlert,
  Mic,
  MicOff,
  Monitor,
} from "lucide-react";
import { useState, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import Vapi from "@vapi-ai/web";

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
  const [copied, setCopied] = useState(false);
  const [webCallActive, setWebCallActive] = useState(false);
  const [webCallConnecting, setWebCallConnecting] = useState(false);
  const vapiRef = useRef(null);

  const { data: calls, isLoading: callsLoading } = useQuery({ queryKey: ["calls"], queryFn: fetchCalls });
  const { data: vapiConfig } = useQuery({ queryKey: ["vapiConfig"], queryFn: fetchVapiConfig });
  const { data: scenarios } = useQuery({ queryKey: ["scenarios"], queryFn: fetchScenarios });

  const startWebCall = useCallback(async () => {
    if (!vapiConfig?.publicKey) {
      toast.error("Vapi public key not configured on the server.");
      return;
    }

    try {
      setWebCallConnecting(true);
      const vapi = new Vapi(vapiConfig.publicKey);
      vapiRef.current = vapi;

      vapi.on("call-start", () => {
        setWebCallConnecting(false);
        setWebCallActive(true);
        toast.success("Connected! Speak to the AI receptionist.");
      });

      vapi.on("call-end", () => {
        setWebCallActive(false);
        setWebCallConnecting(false);
        vapiRef.current = null;
        toast.info("Call ended. Your scorecard will be ready shortly.");
      });

      vapi.on("error", (err) => {
        console.error("[Vapi Web] Error:", err);
        setWebCallActive(false);
        setWebCallConnecting(false);
        vapiRef.current = null;
        toast.error("Call error: " + (err?.message || "Something went wrong"));
      });

      // Start the call using the assistant configured in Vapi dashboard
      await vapi.start(vapiConfig.assistantId);
    } catch (err) {
      console.error("[Vapi Web] Failed to start:", err);
      setWebCallConnecting(false);
      toast.error("Failed to start web call: " + (err?.message || "Unknown error"));
    }
  }, [vapiConfig]);

  const endWebCall = useCallback(() => {
    if (vapiRef.current) {
      vapiRef.current.stop();
      vapiRef.current = null;
    }
    setWebCallActive(false);
    setWebCallConnecting(false);
  }, []);

  const recentCalls = calls?.slice(0, 5) ?? [];
  const totalCalls = calls?.length ?? 0;
  const scoredCalls = calls?.filter(c => c.status === "scored") ?? [];
  const avgScore = scoredCalls.length > 0
    ? Math.round(scoredCalls.reduce((sum, _) => sum + 0, 0) / scoredCalls.length)
    : null;

  const copyPhone = () => {
    if (vapiConfig?.phoneNumber) {
      navigator.clipboard.writeText(vapiConfig.phoneNumber);
      setCopied(true);
      toast.success("Phone number copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8 py-2">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Training Dashboard</h1>
          <p className="text-muted-foreground mt-1">Practice enrollment calls and review your performance.</p>
        </div>

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

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Call instructions */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="bg-card border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Phone className="w-4 h-4 text-primary" />
                  Start a Training Call
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Option 1: Call on Web */}
                {vapiConfig?.webCallEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-primary bg-primary/10 px-2 py-0.5 rounded">Recommended</span>
                      <span className="text-xs text-muted-foreground">No phone needed</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Practice directly from your browser using your microphone:
                    </p>
                    {webCallActive ? (
                      <Button
                        onClick={endWebCall}
                        variant="destructive"
                        className="w-full gap-2"
                        size="lg"
                      >
                        <MicOff className="w-4 h-4" />
                        End Call
                      </Button>
                    ) : (
                      <Button
                        onClick={startWebCall}
                        disabled={webCallConnecting}
                        className="w-full gap-2"
                        size="lg"
                      >
                        {webCallConnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                        {webCallConnecting ? "Connecting..." : "Start Web Call"}
                      </Button>
                    )}
                    {webCallActive && (
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-green-400 font-medium">Call in progress — speak into your microphone</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Divider between options */}
                {vapiConfig?.webCallEnabled && vapiConfig?.configured && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                {/* Option 2: Call by phone */}
                {vapiConfig?.configured && (
                  <div className="space-y-3">
                    {vapiConfig?.webCallEnabled && (
                      <div className="flex items-center gap-2">
                        <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground font-medium">Or call from your phone</span>
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Call this number from any phone to begin a roleplay session:
                    </p>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary border border-border">
                      <span className="font-mono text-lg font-semibold flex-1 text-foreground">
                        {vapiConfig.phoneNumber}
                      </span>
                      <button
                        onClick={copyPhone}
                        className="p-1.5 rounded hover:bg-accent transition-colors"
                        title="Copy number"
                      >
                        {copied ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Not configured at all */}
                {!vapiConfig?.configured && !vapiConfig?.webCallEnabled && (
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                    <AlertCircle className="w-5 h-5 text-yellow-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-400">Vapi Not Configured</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Add your Vapi credentials (VAPI_API_KEY, VAPI_PUBLIC_KEY) in the server environment to enable calling.
                      </p>
                    </div>
                  </div>
                )}

                {/* Scenarios & instructions — show when any call method is available */}
                {(vapiConfig?.configured || vapiConfig?.webCallEnabled) && (
                  <>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Available Scenarios</p>
                      {scenarios?.map(s => (
                        <div key={s.id} className="flex items-start gap-2 p-2 rounded-lg bg-secondary/50">
                          {s.id === "new_student" ? (
                            <Target className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          ) : s.id === "web_lead_callback" ? (
                            <Phone className="w-4 h-4 text-orange-400 mt-0.5 shrink-0" />
                          ) : s.id === "sales_enrollment" ? (
                            <Star className="w-4 h-4 text-purple-400 mt-0.5 shrink-0" />
                          ) : s.id === "renewal_conference" ? (
                            <TrendingUp className="w-4 h-4 text-teal-400 mt-0.5 shrink-0" />
                          ) : s.id === "cancellation_save" ? (
                            <ShieldAlert className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                          ) : (
                            <Star className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{s.title}</p>
                            <p className="text-xs text-muted-foreground">{s.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground space-y-1.5">
                      <p className="font-medium text-foreground">How it works:</p>
                      <p>1. {vapiConfig?.webCallEnabled ? 'Click "Start Web Call" above' : "Call the phone number above"}{vapiConfig?.configured && vapiConfig?.webCallEnabled ? " or call the phone number" : ""}</p>
                      <p>2. Tell the AI receptionist which scenario you want to practice</p>
                      <p>3. Tell it your preferred difficulty (easy, medium, or hard)</p>
                      <p>4. You'll be connected to the AI prospect — practice your script</p>
                      <p>5. Hang up when done — your scorecard will be ready in ~30 seconds</p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Recent calls */}
          <div className="lg:col-span-2">
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
