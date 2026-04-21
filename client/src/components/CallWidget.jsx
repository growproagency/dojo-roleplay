import { useQuery } from "@tanstack/react-query";
import { fetchVapiConfig, fetchScenarios, fetchVapiSessionToken } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Phone,
  X,
  Mic,
  MicOff,
  Loader2,
  Copy,
  CheckCircle2,
  Monitor,
  PhoneCall,
} from "lucide-react";
import { useCallback, useRef, useState, useEffect } from "react";
import { toast } from "sonner";
import Vapi from "@vapi-ai/web";

export default function CallWidget() {
  const { user, isGlobalAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [webCallActive, setWebCallActive] = useState(false);
  const [webCallConnecting, setWebCallConnecting] = useState(false);
  const [callSeconds, setCallSeconds] = useState(0);
  const vapiRef = useRef(null);
  const timerRef = useRef(null);

  const { data: vapiConfig } = useQuery({
    queryKey: ["vapiConfig"],
    queryFn: fetchVapiConfig,
    enabled: !!user,
  });

  const { data: scenarios } = useQuery({
    queryKey: ["scenarios"],
    queryFn: fetchScenarios,
    enabled: !!user,
  });

  // Don't show widget if user isn't attached to a school (unless global admin testing)
  const shouldShow = user && (user.schoolId || isGlobalAdmin) && (vapiConfig?.webCallEnabled || vapiConfig?.configured);

  // Call timer
  useEffect(() => {
    if (webCallActive) {
      timerRef.current = setInterval(() => setCallSeconds(s => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
      setCallSeconds(0);
    }
    return () => clearInterval(timerRef.current);
  }, [webCallActive]);

  const formatTimer = (s) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;

  const startWebCall = useCallback(async () => {
    if (!vapiConfig?.publicKey || !vapiConfig?.assistantId) {
      toast.error("Vapi not configured on the server.");
      return;
    }

    try {
      setWebCallConnecting(true);

      let sessionToken = null;
      try {
        const tokenRes = await fetchVapiSessionToken();
        sessionToken = tokenRes?.token ?? null;
      } catch (err) {
        console.warn("[CallWidget] Failed to fetch session token:", err);
      }

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
        console.error("[CallWidget] Error:", err);
        setWebCallActive(false);
        setWebCallConnecting(false);
        vapiRef.current = null;
        toast.error("Call error: " + (err?.message || "Something went wrong"));
      });

      const assistantOverrides = sessionToken ? { metadata: { sessionToken } } : undefined;
      await vapi.start(vapiConfig.assistantId, assistantOverrides);
    } catch (err) {
      console.error("[CallWidget] Failed to start:", err);
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

  const copyPhone = () => {
    if (vapiConfig?.phoneNumber) {
      navigator.clipboard.writeText(vapiConfig.phoneNumber);
      setCopied(true);
      toast.success("Phone number copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!shouldShow) return null;

  return (
    <>
      {/* Floating button (collapsed) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className={`fixed bottom-6 right-6 z-50 h-14 w-14 rounded-full shadow-lg flex items-center justify-center transition-all hover:scale-105 ${
            webCallActive
              ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          }`}
          aria-label={webCallActive ? "Call in progress — open widget" : "Start a training call"}
        >
          {webCallActive ? (
            <PhoneCall className="w-6 h-6" />
          ) : (
            <Phone className="w-6 h-6" />
          )}
          {webCallActive && (
            <span className="absolute -top-1 -right-1 bg-white text-red-500 rounded-full text-[10px] font-bold px-1.5 py-0.5 shadow">
              LIVE
            </span>
          )}
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[92vw] max-w-sm bg-card border border-border rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between bg-gradient-to-br from-primary/5 to-card">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">
                  {webCallActive ? "Call in progress" : "Start a training call"}
                </h3>
                {webCallActive && (
                  <p className="text-xs text-muted-foreground">
                    {formatTimer(callSeconds)}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="p-1 rounded hover:bg-accent transition-colors shrink-0"
              aria-label="Close"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {webCallActive ? (
              <>
                <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-700 dark:text-green-400">
                    Speak into your microphone
                  </span>
                </div>
                <Button
                  onClick={endWebCall}
                  variant="destructive"
                  className="w-full gap-2"
                  size="lg"
                >
                  <MicOff className="w-4 h-4" />
                  End call
                </Button>
              </>
            ) : (
              <>
                {/* Web call */}
                {vapiConfig?.webCallEnabled && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                        Recommended
                      </span>
                      <span className="text-xs text-muted-foreground">No phone needed</span>
                    </div>
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
                      {webCallConnecting ? "Connecting..." : "Start web call"}
                    </Button>
                  </div>
                )}

                {/* Divider */}
                {vapiConfig?.webCallEnabled && vapiConfig?.configured && (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                )}

                {/* Phone */}
                {vapiConfig?.configured && vapiConfig?.phoneNumber && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Monitor className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground font-medium">Or call from your phone</span>
                    </div>
                    <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary border border-border">
                      <span className="font-mono text-sm font-semibold flex-1 text-foreground">
                        {vapiConfig.phoneNumber}
                      </span>
                      <button
                        onClick={copyPhone}
                        className="p-1.5 rounded hover:bg-accent transition-colors"
                        title="Copy number"
                      >
                        {copied ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Scenarios */}
                {scenarios && scenarios.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-border">
                    <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wide">
                      Available scenarios
                    </p>
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {scenarios.map(s => (
                        <div key={s.id} className="text-xs p-2 rounded bg-secondary/50">
                          <p className="font-medium text-foreground">{s.title}</p>
                          <p className="text-muted-foreground line-clamp-2 mt-0.5">{s.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
