import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchCustomScenarios,
  createCustomScenario,
  updateCustomScenario,
  deleteCustomScenario,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ShieldAlert,
  Drama,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const VOICE_OPTIONS = [
  { id: "Elliot", label: "Elliot (Male, Canadian)" },
  { id: "Emma", label: "Emma (Female, American)" },
  { id: "Rohan", label: "Rohan (Male, Indian American)" },
  { id: "Nico", label: "Nico (Male, American)" },
  { id: "Savannah", label: "Savannah (Female, American)" },
  { id: "Clara", label: "Clara (Female, American)" },
  { id: "Godfrey", label: "Godfrey (Male, American)" },
  { id: "Kai", label: "Kai (Male, American)" },
  { id: "Layla", label: "Layla (Female, American)" },
  { id: "Sagar", label: "Sagar (Male, Indian American)" },
  { id: "Leah", label: "Leah (Female, American)" },
  { id: "Dan", label: "Dan (Male, British)" },
  { id: "Zoe", label: "Zoe (Female, American)" },
];

const CONTEXT_TYPES = [
  { id: "inbound_call", label: "Inbound Call (prospect calls the school)" },
  { id: "outbound_callback", label: "Outbound Callback (school calls the prospect back)" },
  { id: "in_person", label: "In-Person (face-to-face conversation)" },
];

const PROMPT_TEMPLATE = `## Who You Are
Your name is [NAME]. You're [AGE] years old. [BRIEF BACKSTORY].

## Your Opening Line
Say only this, then wait: "[WHAT THEY SAY FIRST]"

## Your Situation (only reveal when asked)
- [DETAIL 1]
- [DETAIL 2]
- [DETAIL 3]

## How You React to Specific Topics (only when they come up)
- **If they ask about [TOPIC]**: [HOW YOU RESPOND]
- **If they mention [TOPIC]**: [HOW YOU RESPOND]`;

const DEFAULT_FORM = {
  title: "",
  description: "",
  contextType: "inbound_call",
  characterName: "",
  characterPrompt: PROMPT_TEMPLATE,
  openingLine: "",
  voiceId: "Elliot",
  voiceProvider: "vapi",
  scoringPrompt: "",
  isActive: true,
};

export default function CustomScenarios() {
  const { isGlobalAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [editingScenario, setEditingScenario] = useState(null); // null = closed, {} = new, {id:...} = editing
  const [form, setForm] = useState(DEFAULT_FORM);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [showScoringPrompt, setShowScoringPrompt] = useState(false);

  const { data: scenarios, isLoading } = useQuery({
    queryKey: ["custom-scenarios"],
    queryFn: fetchCustomScenarios,
    enabled: isGlobalAdmin,
  });

  const createMutation = useMutation({
    mutationFn: createCustomScenario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-scenarios"] });
      setEditingScenario(null);
      toast.success("Scenario created");
    },
    onError: (err) => toast.error(err.message || "Failed to create scenario"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateCustomScenario(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-scenarios"] });
      setEditingScenario(null);
      toast.success("Scenario updated");
    },
    onError: (err) => toast.error(err.message || "Failed to update scenario"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCustomScenario,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-scenarios"] });
      setDeleteTarget(null);
      setDeleteConfirmText("");
      toast.success("Scenario deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete scenario"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }) => updateCustomScenario(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-scenarios"] });
    },
    onError: (err) => toast.error(err.message || "Failed to toggle scenario"),
  });

  const openCreateForm = () => {
    setForm(DEFAULT_FORM);
    setShowScoringPrompt(false);
    setEditingScenario({});
  };

  const openEditForm = (scenario) => {
    setForm({
      title: scenario.title,
      description: scenario.description,
      contextType: scenario.contextType,
      characterName: scenario.characterName,
      characterPrompt: scenario.characterPrompt,
      openingLine: scenario.openingLine || "",
      voiceId: scenario.voiceId,
      voiceProvider: scenario.voiceProvider || "vapi",
      scoringPrompt: scenario.scoringPrompt || "",
      isActive: scenario.isActive,
    });
    setShowScoringPrompt(!!scenario.scoringPrompt);
    setEditingScenario(scenario);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...form,
      openingLine: form.openingLine || null,
      scoringPrompt: form.scoringPrompt || null,
    };
    if (editingScenario?.id) {
      updateMutation.mutate({ id: editingScenario.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  if (!isGlobalAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-12">
          <Card>
            <CardContent className="flex items-start gap-3 p-6">
              <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold">Access denied</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  This page is restricted to platform administrators.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 py-2">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Custom Scenarios</h1>
            <p className="text-muted-foreground mt-1">
              Create and manage training scenarios available to all schools.
            </p>
          </div>
          <Button onClick={openCreateForm} className="gap-2">
            <Plus className="w-4 h-4" />
            New scenario
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Drama className="w-4 h-4 text-primary" />
              Scenarios
              {scenarios && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({scenarios.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !scenarios || scenarios.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No custom scenarios yet. The 6 built-in scenarios are always available.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {scenarios.map((s) => (
                  <div key={s.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{s.title}</span>
                        <Badge variant="outline" className="text-xs font-mono">{s.slug}</Badge>
                        <Badge className={s.isActive
                          ? "bg-green-500/10 text-green-500 border-green-500/20 border"
                          : "bg-muted text-muted-foreground border"
                        }>
                          {s.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {s.characterName} — {s.description}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleActiveMutation.mutate({ id: s.id, isActive: !s.isActive })}
                        title={s.isActive ? "Deactivate" : "Activate"}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        {s.isActive ? <ToggleRight className="w-4 h-4" /> : <ToggleLeft className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditForm(s)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => { setDeleteTarget(s); setDeleteConfirmText(""); }}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit modal */}
      <Dialog open={editingScenario !== null} onOpenChange={(open) => { if (!open) setEditingScenario(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingScenario?.id ? "Edit scenario" : "Create scenario"}
            </DialogTitle>
            <DialogDescription>
              {editingScenario?.id
                ? "Update this custom training scenario."
                : "Define a new training scenario. It will be available to all schools."}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Birthday Party Inquiry"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="characterName">Character name *</Label>
                <Input
                  id="characterName"
                  value={form.characterName}
                  onChange={(e) => setForm(f => ({ ...f, characterName: e.target.value }))}
                  placeholder="e.g. Jessica"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description shown to staff when picking this scenario"
                rows={2}
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="contextType">Context type</Label>
                <Select value={form.contextType} onValueChange={(val) => setForm(f => ({ ...f, contextType: val }))}>
                  <SelectTrigger id="contextType"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONTEXT_TYPES.map(ct => (
                      <SelectItem key={ct.id} value={ct.id}>{ct.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="voiceId">Voice</Label>
                <Select value={form.voiceId} onValueChange={(val) => setForm(f => ({ ...f, voiceId: val }))}>
                  <SelectTrigger id="voiceId"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {VOICE_OPTIONS.map(v => (
                      <SelectItem key={v.id} value={v.id}>{v.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="openingLine">Opening line</Label>
              <Input
                id="openingLine"
                value={form.openingLine}
                onChange={(e) => setForm(f => ({ ...f, openingLine: e.target.value }))}
                placeholder="What the AI character says first (e.g. 'Hey, I was calling about your classes?')"
              />
              <p className="text-xs text-muted-foreground">Leave blank for outbound callbacks where the staff speaks first.</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="characterPrompt">Character prompt *</Label>
              <Textarea
                id="characterPrompt"
                value={form.characterPrompt}
                onChange={(e) => setForm(f => ({ ...f, characterPrompt: e.target.value }))}
                rows={12}
                className="font-mono text-xs"
                required
              />
              <p className="text-xs text-muted-foreground">
                Define the character's backstory, situation, and reactions. The shared behavior rules (speech style, difficulty modifiers, school details) are injected automatically.
              </p>
            </div>

            <div className="border-t pt-4">
              <button
                type="button"
                onClick={() => setShowScoringPrompt(!showScoringPrompt)}
                className="text-sm text-primary hover:underline"
              >
                {showScoringPrompt ? "Hide" : "Show"} custom scoring rubric (advanced)
              </button>
              {showScoringPrompt && (
                <div className="mt-3 space-y-1.5">
                  <Label htmlFor="scoringPrompt">Custom scoring prompt</Label>
                  <Textarea
                    id="scoringPrompt"
                    value={form.scoringPrompt}
                    onChange={(e) => setForm(f => ({ ...f, scoringPrompt: e.target.value }))}
                    rows={8}
                    className="font-mono text-xs"
                    placeholder="Leave blank to use the default inbound call scoring rubric."
                  />
                  <p className="text-xs text-muted-foreground">
                    If provided, this replaces the built-in scoring rubric for this scenario. Must instruct the LLM to return the standard JSON scorecard format.
                  </p>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setEditingScenario(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="gap-2">
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                {editingScenario?.id ? "Save changes" : "Create scenario"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmText(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete scenario</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.title}</strong>. Existing call records using this scenario will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">delete scenario</span> to confirm:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="delete scenario"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteMutation.mutate(deleteTarget?.id)}
              disabled={deleteConfirmText !== "delete scenario" || deleteMutation.isPending}
              className="gap-2"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete scenario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
