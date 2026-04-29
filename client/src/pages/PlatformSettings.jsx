import DashboardLayout from "@/components/DashboardLayout";
import { fetchPlatformSettings, updatePlatformSettings } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function PlatformSettings() {
  const { isGlobalAdmin, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [markup, setMarkup] = useState("");

  useEffect(() => {
    if (!authLoading && !isGlobalAdmin) setLocation("/dashboard");
  }, [authLoading, isGlobalAdmin, setLocation]);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: fetchPlatformSettings,
    enabled: isGlobalAdmin,
  });

  useEffect(() => {
    if (settings) setMarkup(String(settings.markupPercent ?? 0));
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data) => updatePlatformSettings(data),
    onSuccess: (next) => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      // Markup feeds into every usage / cap calculation — invalidate broadly.
      queryClient.invalidateQueries({ queryKey: ["schools-usage-overview"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success(`Markup saved (${next.markupPercent}%)`);
    },
    onError: (err) => toast.error(err.message || "Failed to save settings"),
  });

  const handleSave = (e) => {
    e.preventDefault();
    const n = parseFloat(markup);
    if (!Number.isFinite(n) || n < 0 || n > 500) {
      toast.error("Markup must be between 0 and 500.");
      return;
    }
    saveMutation.mutate({ markupPercent: n });
  };

  if (authLoading) return null;
  if (!isGlobalAdmin) return null;

  // Worked example for the admin's intuition
  const exampleRaw = 0.20;
  const exampleMarkup = parseFloat(markup);
  const exampleBilled =
    Number.isFinite(exampleMarkup) && exampleMarkup >= 0
      ? exampleRaw * (1 + exampleMarkup / 100)
      : null;

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8 py-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings2 className="w-6 h-6 text-primary" />
            Platform Settings
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Global config that applies across every school. Only platform admins can edit.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Pricing markup</CardTitle>
            <CardDescription className="text-xs">
              Percentage added on top of raw vendor cost (Vapi voice + OpenAI scoring) when
              computing what schools are billed. Applied at display time — raw costs in the
              database are untouched.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="markup">Markup (%)</Label>
                <div className="flex items-center gap-2 max-w-xs">
                  <Input
                    id="markup"
                    type="number"
                    min={0}
                    max={500}
                    step={0.01}
                    value={markup}
                    onChange={(e) => setMarkup(e.target.value)}
                    placeholder="0"
                    disabled={isLoading}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Range: 0–500. Set to 0 to bill raw cost (no margin).
                </p>
              </div>

              {exampleBilled != null && (
                <div className="text-xs text-muted-foreground border border-border/40 rounded-lg px-3 py-2 bg-muted/20">
                  <strong className="text-foreground">Example:</strong> a call that costs us{" "}
                  <span className="text-foreground">${exampleRaw.toFixed(2)}</span> will be billed
                  at <span className="text-foreground">${exampleBilled.toFixed(2)}</span>{" "}
                  ({exampleMarkup.toFixed(2)}% markup).
                </div>
              )}

              <Button type="submit" disabled={saveMutation.isPending || isLoading}>
                {saveMutation.isPending ? "Saving…" : "Save"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div className="text-xs text-muted-foreground">
              Changing the markup affects existing schools' usage caps. Caps are stored in
              billed dollars — a higher markup means schools reach their cap on less raw spend.
              Review the schools overview after saving and adjust caps if needed.
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
