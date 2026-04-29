import { useAuth } from "@/hooks/useAuth";

// Always-visible compact usage indicator for school members. Shows nothing for
// global admins (they use the Usage & Billing page) and nothing when the
// school has no cap set (unrestricted = no progress to show).
export default function UsageStrip() {
  const { user, isGlobalAdmin } = useAuth();
  if (isGlobalAdmin) return null;

  const status = user?.school?.usageStatus;
  if (!status || status.capUsd == null) return null;

  const cap = Number(status.capUsd);
  const total = Number(status.totalCostUsd ?? 0);
  // Percentage capped at 100 for the bar; raw percentUsed (which can exceed 100)
  // shown as a number so admins know if a school went past the limit somehow.
  const rawPercent = status.percentUsed ?? Math.round((total / cap) * 100);
  const barPercent = Math.min(Math.max(rawPercent, 0), 100);

  const tone =
    rawPercent >= 100
      ? { bar: "bg-red-500", label: "text-red-600 dark:text-red-400" }
      : rawPercent >= 80
      ? { bar: "bg-amber-500", label: "text-amber-600 dark:text-amber-400" }
      : rawPercent >= 60
      ? { bar: "bg-blue-500", label: "text-blue-600 dark:text-blue-400" }
      : { bar: "bg-primary/60", label: "text-muted-foreground" };

  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="shrink-0 font-medium uppercase tracking-wide text-[10px]">Usage</span>
      <div className="flex-1 max-w-xs h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full ${tone.bar} transition-all duration-500`}
          style={{ width: `${barPercent}%` }}
        />
      </div>
      <span className={`shrink-0 tabular-nums ${tone.label}`}>
        ${total.toFixed(2)} of ${cap.toFixed(2)} ({rawPercent}%)
      </span>
    </div>
  );
}
