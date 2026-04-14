import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchAdminSchools,
  createAdminSchool,
  deleteAdminSchool,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Loader2,
  School,
  Plus,
  Trash2,
  ChevronRight,
  Users,
  ShieldAlert,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminSchools() {
  const { isGlobalAdmin } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const { data: schools, isLoading } = useQuery({
    queryKey: ["admin", "schools"],
    queryFn: fetchAdminSchools,
    enabled: isGlobalAdmin,
  });

  const createMutation = useMutation({
    mutationFn: createAdminSchool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "schools"] });
      setNewSchoolName("");
      setShowCreate(false);
      toast.success("School created");
    },
    onError: (err) => toast.error(err.message || "Failed to create school"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAdminSchool,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "schools"] });
      setDeleteTarget(null);
      setDeleteConfirmText("");
      toast.success("School deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete school"),
  });

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;
    createMutation.mutate({ name: newSchoolName.trim() });
  };

  const openDeleteModal = (school) => {
    setDeleteTarget(school);
    setDeleteConfirmText("");
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget || deleteConfirmText !== "delete school") return;
    deleteMutation.mutate(deleteTarget.id);
  };

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
            <h1 className="text-2xl font-bold tracking-tight">All Schools</h1>
            <p className="text-muted-foreground mt-1">
              Manage schools across the platform.
            </p>
          </div>
          <Button onClick={() => setShowCreate(!showCreate)} className="gap-2">
            <Plus className="w-4 h-4" />
            New school
          </Button>
        </div>

        {showCreate && (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleCreate} className="flex gap-3 items-end">
                <div className="flex-1 space-y-1.5">
                  <Label htmlFor="school-name">School name</Label>
                  <Input
                    id="school-name"
                    value={newSchoolName}
                    onChange={(e) => setNewSchoolName(e.target.value)}
                    placeholder="e.g. Gracie MMA Tampa"
                    required
                  />
                </div>
                <Button type="submit" disabled={createMutation.isPending} className="gap-2">
                  {createMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Create
                </Button>
                <Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <School className="w-4 h-4 text-primary" />
              Schools
              {schools && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({schools.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !schools || schools.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No schools yet. Create one to get started.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {schools.map((school) => (
                  <div
                    key={school.id}
                    className="flex items-center justify-between gap-3 py-3 group"
                  >
                    <button
                      onClick={() => setLocation(`/admin/schools/${school.id}`)}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left"
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <School className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium">{school.name}</span>
                          {school.slug && (
                            <Badge variant="outline" className="text-xs font-mono">
                              {school.slug}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {school.memberCount} member{school.memberCount !== 1 ? "s" : ""}
                          </span>
                          <span>Created {formatDate(school.createdAt)}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
                    </button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openDeleteModal(school)}
                      className="text-destructive hover:text-destructive shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete confirmation modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmText(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete school</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name}</strong> and unassign all its members. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">delete school</span> to confirm:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="delete school"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={deleteConfirmText !== "delete school" || deleteMutation.isPending}
              className="gap-2"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete school
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
