import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, OctagonAlert } from "lucide-react";

// Shows on Dashboard for school members (not global admins) when their school
// is approaching or at the lifetime usage cap.
export default function UsageBanner() {
  const { user, isGlobalAdmin } = useAuth();
  if (isGlobalAdmin) return null;

  const status = user?.school?.usageStatus;
  const percent = status?.percentUsed;
  if (status == null || percent == null) return null;
  if (percent < 80) return null;

  if (status.atCap) {
    return (
      <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
        <OctagonAlert className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-foreground">
            Your school has reached its usage limit.
          </p>
          <p className="text-muted-foreground mt-0.5">
            New training calls are paused until your administrator raises the cap.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
      <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium text-foreground">
          You've used {percent}% of your school's call budget.
        </p>
        <p className="text-muted-foreground mt-0.5">
          New calls will be blocked once the limit is reached.
        </p>
      </div>
    </div>
  );
}
