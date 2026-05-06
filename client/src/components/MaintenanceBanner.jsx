import { fetchMaintenanceNotice } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Info, AlertTriangle, OctagonAlert, X } from "lucide-react";
import { useEffect, useState } from "react";

const SEVERITY_STYLES = {
  info: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    iconColor: "text-blue-500",
    Icon: Info,
  },
  warning: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    iconColor: "text-amber-500",
    Icon: AlertTriangle,
  },
  critical: {
    border: "border-red-500/30",
    bg: "bg-red-500/5",
    iconColor: "text-red-500",
    Icon: OctagonAlert,
  },
};

function dismissalKey(message) {
  if (typeof window === "undefined") return null;
  // Per-message dismissal so editing the notice re-shows it. btoa is enough —
  // we just need a short stable identifier, not a cryptographic hash.
  const hash = btoa(unescape(encodeURIComponent(message))).slice(0, 16);
  return `dojo:maintenance-dismissed:${hash}`;
}

export default function MaintenanceBanner() {
  const { isGlobalAdmin, isAuthenticated } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-notice"],
    queryFn: fetchMaintenanceNotice,
    enabled: isAuthenticated,
    refetchOnWindowFocus: true,
  });
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!data?.message) {
      setDismissed(false);
      return;
    }
    const key = dismissalKey(data.message);
    setDismissed(key ? sessionStorage.getItem(key) === "1" : false);
  }, [data?.message]);

  if (isLoading) return null;
  if (!data?.enabled) return null;
  if (!data?.message) return null;
  if (dismissed) return null;

  const style = SEVERITY_STYLES[data.severity] ?? SEVERITY_STYLES.info;
  const { Icon } = style;

  const handleDismiss = () => {
    const key = dismissalKey(data.message);
    if (key) sessionStorage.setItem(key, "1");
    setDismissed(true);
  };

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border ${style.border} ${style.bg} px-4 py-3 mb-4`}
      role="status"
    >
      <Icon className={`w-5 h-5 ${style.iconColor} shrink-0 mt-0.5`} />
      <div className="flex-1 text-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-foreground whitespace-pre-wrap">{data.message}</p>
          {isGlobalAdmin && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">
              Preview
            </span>
          )}
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="text-muted-foreground hover:text-foreground transition-colors shrink-0 mt-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
        aria-label="Dismiss notice"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
