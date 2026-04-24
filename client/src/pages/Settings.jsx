import DashboardLayout from "@/components/DashboardLayout";
import { fetchSettings, saveSettings as saveSettingsApi } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useViewingSchool } from "@/contexts/ViewingSchoolContext";
import PickSchoolEmptyState from "@/components/PickSchoolEmptyState";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, School, MapPin, Tag, DollarSign, User, StickyNote, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const DEFAULT_FORM = {
  schoolName: "",
  streetAddress: "",
  city: "",
  state: "",
  zipCode: "",
  introOffer: "",
  priceRangeLow: "",
  priceRangeHigh: "",
  programDirectorName: "",
  additionalNotes: "",
};

export default function Settings() {
  const { isGlobalAdmin } = useAuth();
  const { viewingSchoolId } = useViewingSchool();
  const needsSchool = isGlobalAdmin && viewingSchoolId == null;
  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings", viewingSchoolId ?? "self"],
    queryFn: fetchSettings,
    enabled: !needsSchool,
  });
  const queryClient = useQueryClient();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saved, setSaved] = useState(false);

  if (needsSchool) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-12">
          <PickSchoolEmptyState message="Pick a school from the sidebar to edit its settings." />
        </div>
      </DashboardLayout>
    );
  }

  // Populate form when settings load
  useEffect(() => {
    if (settings) {
      setForm({
        schoolName: settings.schoolName ?? "",
        streetAddress: settings.streetAddress ?? "",
        city: settings.city ?? "",
        state: settings.state ?? "",
        zipCode: settings.zipCode ?? "",
        introOffer: settings.introOffer ?? "",
        priceRangeLow: settings.priceRangeLow != null ? String(settings.priceRangeLow) : "",
        priceRangeHigh: settings.priceRangeHigh != null ? String(settings.priceRangeHigh) : "",
        programDirectorName: settings.programDirectorName ?? "",
        additionalNotes: settings.additionalNotes ?? "",
      });
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: (data) => saveSettingsApi(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", viewingSchoolId ?? "self"] });
      setSaved(true);
      toast.success("Settings saved! The AI will use these details on your next call.");
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    if (!form.schoolName.trim()) {
      toast.error("School name is required.");
      return;
    }
    saveMutation.mutate({
      schoolName: form.schoolName.trim(),
      streetAddress: form.streetAddress.trim() || undefined,
      city: form.city.trim() || undefined,
      state: form.state.trim() || undefined,
      zipCode: form.zipCode.trim() || undefined,
      introOffer: form.introOffer.trim() || undefined,
      priceRangeLow: form.priceRangeLow ? parseInt(form.priceRangeLow, 10) : undefined,
      priceRangeHigh: form.priceRangeHigh ? parseInt(form.priceRangeHigh, 10) : undefined,
      programDirectorName: form.programDirectorName.trim() || undefined,
      additionalNotes: form.additionalNotes.trim() || undefined,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-6 py-2">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">School Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">
            These details are injected into the AI prospect's context so every roleplay call feels specific to your school.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* School Identity */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <School className="w-4 h-4 text-primary" />
                  School Identity
                </CardTitle>
                <CardDescription>
                  The AI will greet callers on behalf of your school and reference it by name throughout the call.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="schoolName">
                    School Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    id="schoolName"
                    placeholder="e.g. Gracie PAC MMA"
                    value={form.schoolName}
                    onChange={(e) => handleChange("schoolName", e.target.value)}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Used in the AI's opening: "It's a GREAT day at {form.schoolName || "[School Name]"}!"
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="programDirectorName">Program Director Name</Label>
                  <Input
                    id="programDirectorName"
                    placeholder="e.g. Coach Mike"
                    value={form.programDirectorName}
                    onChange={(e) => handleChange("programDirectorName", e.target.value)}
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    The AI will mention sitting down with the program director after the free trial.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-primary" />
                  Location
                </CardTitle>
                <CardDescription>
                  The AI will confirm the caller is interested in the correct location (Step 3 of the script).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="streetAddress">Street Address</Label>
                  <Input
                    id="streetAddress"
                    placeholder="e.g. 1234 Main Street"
                    value={form.streetAddress}
                    onChange={(e) => handleChange("streetAddress", e.target.value)}
                    className="bg-background"
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      placeholder="e.g. Tampa"
                      value={form.city}
                      onChange={(e) => handleChange("city", e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      placeholder="e.g. FL"
                      value={form.state}
                      onChange={(e) => handleChange("state", e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2 col-span-1">
                    <Label htmlFor="zipCode">ZIP Code</Label>
                    <Input
                      id="zipCode"
                      placeholder="e.g. 33601"
                      value={form.zipCode}
                      onChange={(e) => handleChange("zipCode", e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Intro Offer */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Tag className="w-4 h-4 text-primary" />
                  Introductory Offer
                </CardTitle>
                <CardDescription>
                  The AI will ask the staff member to present this offer (Step 8) and transition to booking.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="introOffer">Offer Description</Label>
                  <Textarea
                    id="introOffer"
                    placeholder="e.g. 2-week free trial including a free uniform and a private lesson with the program director"
                    value={form.introOffer}
                    onChange={(e) => handleChange("introOffer", e.target.value)}
                    className="bg-background resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    The AI will ask "Have you heard about our {form.introOffer ? `"${form.introOffer.slice(0, 40)}${form.introOffer.length > 40 ? "..." : ""}"` : "[your offer]"}?"
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pricing */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-primary" />
                  Pricing Range
                </CardTitle>
                <CardDescription>
                  When the caller asks about cost, the AI expects the staff member to give a price range and pivot to the free trial — not dodge the question.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="priceRangeLow">Monthly Low ($)</Label>
                    <Input
                      id="priceRangeLow"
                      type="number"
                      min={0}
                      placeholder="e.g. 99"
                      value={form.priceRangeLow}
                      onChange={(e) => handleChange("priceRangeLow", e.target.value)}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priceRangeHigh">Monthly High ($)</Label>
                    <Input
                      id="priceRangeHigh"
                      type="number"
                      min={0}
                      placeholder="e.g. 199"
                      value={form.priceRangeHigh}
                      onChange={(e) => handleChange("priceRangeHigh", e.target.value)}
                      className="bg-background"
                    />
                  </div>
                </div>
                {form.priceRangeLow && form.priceRangeHigh && (
                  <p className="text-xs text-muted-foreground mt-2">
                    The scoring engine will expect the staff member to say something like: "We have programs that range from ${form.priceRangeLow} to ${form.priceRangeHigh} per month…"
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Additional Notes */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <StickyNote className="w-4 h-4 text-primary" />
                  Additional Context for the AI
                </CardTitle>
                <CardDescription>
                  Anything else the AI should know — class schedule, unique programs, parking info, etc.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  id="additionalNotes"
                  placeholder="e.g. We offer BJJ, Muay Thai, and Kids Karate. Classes run Monday–Saturday. Evening classes at 6pm and 7pm. Free parking in the rear lot."
                  value={form.additionalNotes}
                  onChange={(e) => handleChange("additionalNotes", e.target.value)}
                  className="bg-background resize-none"
                  rows={4}
                />
              </CardContent>
            </Card>

            <Separator />

            {/* Save button */}
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Changes take effect on your next call.
              </p>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="min-w-[120px]"
              >
                {saveMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
                ) : saved ? (
                  <><CheckCircle2 className="w-4 h-4 mr-2 text-green-400" />Saved!</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" />Save Settings</>
                )}
              </Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
