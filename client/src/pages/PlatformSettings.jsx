import DashboardLayout from "@/components/DashboardLayout";
import { fetchPlatformSettings, updatePlatformSettings } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// Mirrors server/config/pricing.js OPENAI_PRICING keys.
const MODEL_OPTIONS = [
  { value: "gpt-4o-mini",  label: "gpt-4o-mini · cheap, default scoring quality" },
  { value: "gpt-4.1-mini", label: "gpt-4.1-mini · ~2.5× cost, slightly smarter" },
  { value: "gpt-4o",       label: "gpt-4o · ~27× cost, strongest reasoning" },
  { value: "gpt-4.1",      label: "gpt-4.1 · cheaper than 4o, similar quality" },
];

const SERVER_DEFAULT = "__server_default__";

export default function PlatformSettings() {
  const { isGlobalAdmin, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [markup, setMarkup] = useState("");
  const [model, setModel] = useState(SERVER_DEFAULT);
  const [defaultCap, setDefaultCap] = useState("");

  useEffect(() => {
    if (!authLoading && !isGlobalAdmin) setLocation("/dashboard");
  }, [authLoading, isGlobalAdmin, setLocation]);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["platform-settings"],
    queryFn: fetchPlatformSettings,
    enabled: isGlobalAdmin,
  });

  useEffect(() => {
    if (!settings) return;
    setMarkup(String(settings.markupPercent ?? 0));
    setModel(settings.defaultLlmModel ?? SERVER_DEFAULT);
    setDefaultCap(settings.defaultUsageCapUsd != null ? String(settings.defaultUsageCapUsd) : "");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data) => updatePlatformSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["platform-settings"] });
      // Markup feeds into every usage / cap calculation — invalidate broadly.
      queryClient.invalidateQueries({ queryKey: ["schools-usage-overview"] });
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      toast.success("Platform settings saved");
    },
    onError: (err) => toast.error(err.message || "Failed to save settings"),
  });

  const handleSave = (e) => {
    e.preventDefault();
    const markupN = parseFloat(markup);
    if (!Number.isFinite(markupN) || markupN < 0 || markupN > 500) {
      toast.error("Markup must be between 0 and 500.");
      return;
    }
    let capValue = null;
    const trimmedCap = defaultCap.trim();
    if (trimmedCap !== "") {
      const capN = parseFloat(trimmedCap);
      if (!Number.isFinite(capN) || capN < 0 || capN > 100000) {
        toast.error("Default cap must be between 0 and 100,000 (or empty for no default).");
        return;
      }
      capValue = capN;
    }
    saveMutation.mutate({
      markupPercent: markupN,
      defaultLlmModel: model === SERVER_DEFAULT ? null : model,
      defaultUsageCapUsd: capValue,
    });
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
            <CardTitle className="text-base">Configuration</CardTitle>
            <CardDescription className="text-xs">
              Pricing markup, default scoring model, and the cap automatically applied to
              newly-created schools.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-6">
              {/* Markup */}
              <div className="space-y-1.5">
                <Label htmlFor="markup">Pricing markup (%)</Label>
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
                  Added on top of raw Vapi + OpenAI cost when billing schools. Applied at
                  display time — raw costs in the database are untouched. Range 0–500.
                </p>
                {exampleBilled != null && (
                  <div className="text-xs text-muted-foreground border border-border/40 rounded-lg px-3 py-2 bg-muted/20 mt-2">
                    <strong className="text-foreground">Example:</strong> a call that costs us{" "}
                    <span className="text-foreground">${exampleRaw.toFixed(2)}</span> will be
                    billed at{" "}
                    <span className="text-foreground">${exampleBilled.toFixed(2)}</span>{" "}
                    ({exampleMarkup.toFixed(2)}% markup).
                  </div>
                )}
              </div>

              {/* Default LLM model */}
              <div className="space-y-1.5">
                <Label htmlFor="model">Scoring model</Label>
                <Select value={model} onValueChange={setModel} disabled={isLoading}>
                  <SelectTrigger id="model" className="max-w-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SERVER_DEFAULT}>
                      Use server default (LLM_MODEL env var)
                    </SelectItem>
                    {MODEL_OPTIONS.map((m) => (
                      <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Model used to grade calls after they end. Changes apply to the next call —
                  no redeploy needed.
                </p>
              </div>

              {/* Default cap for new schools */}
              <div className="space-y-1.5">
                <Label htmlFor="defaultCap">Default usage cap for new schools (USD)</Label>
                <div className="flex items-center gap-2 max-w-xs">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    id="defaultCap"
                    type="number"
                    min={0}
                    max={100000}
                    step={0.01}
                    value={defaultCap}
                    onChange={(e) => setDefaultCap(e.target.value)}
                    placeholder="No default"
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Applied automatically when a new school is created. Leave empty for no
                  default — new schools start unrestricted (current behavior). Existing
                  schools are unaffected by changes here.
                </p>
              </div>

              <Button type="submit" disabled={saveMutation.isPending || isLoading}>
                {saveMutation.isPending ? "Saving…" : "Save changes"}
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
