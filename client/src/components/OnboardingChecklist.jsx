import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { fetchSchool, fetchSchoolMembers, fetchSchoolInvites, fetchCalls } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { CheckCircle2, Circle, Settings, UserPlus, Phone, BarChart3, Sparkles, X } from "lucide-react";
import { useState, useEffect } from "react";

const DISMISSED_KEY = "dojo:onboardingDismissed";

export default function OnboardingChecklist() {
  const { isSchoolAdmin, isGlobalAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    return typeof window !== "undefined" && localStorage.getItem(DISMISSED_KEY) === "true";
  });

  // Only show for school admins (not pure global admins, not staff)
  const shouldRun = isSchoolAdmin && !isGlobalAdmin;

  const { data: school } = useQuery({
    queryKey: ["school"],
    queryFn: fetchSchool,
    enabled: shouldRun,
  });

  const { data: members } = useQuery({
    queryKey: ["school", "members"],
    queryFn: fetchSchoolMembers,
    enabled: shouldRun,
  });

  const { data: invites } = useQuery({
    queryKey: ["school", "invites"],
    queryFn: fetchSchoolInvites,
    enabled: shouldRun,
  });

  const { data: calls } = useQuery({
    queryKey: ["calls"],
    queryFn: fetchCalls,
    enabled: shouldRun,
  });

  if (!shouldRun || dismissed) return null;

  const schoolInfoDone =
    !!school && (school.name && school.name !== "Our Martial Arts School" && school.name !== "Default School") &&
    (school.streetAddress || school.city || school.introOffer);
  const staffInvitedDone = (members && members.length > 1) || (invites && invites.length > 0);
  const testCallDone = (calls || []).length > 0;
  const scorecardDone = (calls || []).some(c => c.status === "scored");

  const steps = [
    {
      id: "school",
      label: "Set up your school info",
      description: "Add your school name, address, and intro offer so the AI can reference them.",
      done: schoolInfoDone,
      icon: Settings,
      action: "Open settings",
      onClick: () => setLocation("/settings"),
    },
    {
      id: "invite",
      label: "Invite your staff",
      description: "Send invite links to your team so they can start practicing.",
      done: staffInvitedDone,
      icon: UserPlus,
      action: "Invite members",
      onClick: () => setLocation("/members"),
    },
    {
      id: "call",
      label: "Make a test call",
      description: "Try a web call to see how a roleplay feels.",
      done: testCallDone,
      icon: Phone,
      action: "Start a call",
      onClick: () => setLocation("/dashboard"),
    },
    {
      id: "scorecard",
      label: "Review a scorecard",
      description: "Open a completed call to see the AI's feedback.",
      done: scorecardDone,
      icon: BarChart3,
      action: "View call history",
      onClick: () => setLocation("/calls"),
    },
  ];

  const doneCount = steps.filter(s => s.done).length;
  const allDone = doneCount === steps.length;

  // Auto-dismiss once all done (but let user manually dismiss too)
  useEffect(() => {
    if (allDone) {
      const timer = setTimeout(() => {
        localStorage.setItem(DISMISSED_KEY, "true");
        setDismissed(true);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [allDone]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setDismissed(true);
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-card to-card border-primary/20 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1 rounded hover:bg-accent transition-colors"
        title="Dismiss"
      >
        <X className="w-4 h-4 text-muted-foreground" />
      </button>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          Get started with Dojo Roleplay
          <span className="text-xs text-muted-foreground font-normal ml-auto mr-6">
            {doneCount}/{steps.length} complete
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${(doneCount / steps.length) * 100}%` }}
          />
        </div>

        {/* Steps */}
        <div className="grid sm:grid-cols-2 gap-3 pt-2">
          {steps.map(step => (
            <div
              key={step.id}
              className={`p-3 rounded-lg border transition-colors ${
                step.done
                  ? "bg-green-500/5 border-green-500/20"
                  : "bg-secondary/50 border-border hover:bg-secondary"
              }`}
            >
              <div className="flex items-start gap-2">
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${step.done ? "text-muted-foreground line-through" : ""}`}>
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {step.description}
                  </p>
                  {!step.done && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={step.onClick}
                      className="mt-2 h-7 px-2 text-xs gap-1"
                    >
                      <step.icon className="w-3 h-3" />
                      {step.action}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {allDone && (
          <div className="pt-2 text-center">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              🎉 You're all set! This checklist will disappear in a moment.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
