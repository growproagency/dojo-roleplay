import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchAdminSchool,
  fetchAdminSchools,
  changeAdminUserRole,
  assignAdminUserSchool,
  deleteAdminUser,
  fetchAdminSchoolInvites,
  createAdminSchoolInvite,
  revokeAdminSchoolInvite,
  resetAdminUserPassword,
  fetchAdminUsers,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  School,
  Users,
  ArrowLeft,
  Trash2,
  ShieldAlert,
  MapPin,
  DollarSign,
  Tag,
  User,
  AlertTriangle,
  Mail,
  UserPlus,
  Copy,
  CheckCircle2,
  KeyRound,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useRoute } from "wouter";
import { toast } from "sonner";

function RoleBadge({ role }) {
  const config = {
    global_admin: { label: "Global Admin", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    admin: { label: "Global Admin", className: "bg-purple-500/10 text-purple-400 border-purple-500/20" },
    school_admin: { label: "School Admin", className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
    staff: { label: "Staff", className: "bg-green-500/10 text-green-400 border-green-500/20" },
  };
  const c = config[role] ?? { label: role, className: "bg-muted text-muted-foreground" };
  return <Badge className={`${c.className} border`}>{c.label}</Badge>;
}

function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminSchoolDetail() {
  const [, params] = useRoute("/admin/schools/:id");
  const [, setLocation] = useLocation();
  const { isGlobalAdmin, user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const schoolId = params?.id ? parseInt(params.id, 10) : null;

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [unassignTarget, setUnassignTarget] = useState(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("school_admin");
  const [lastInviteUrl, setLastInviteUrl] = useState(null);
  const [copiedToken, setCopiedToken] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [showAddExisting, setShowAddExisting] = useState(false);
  const [addUserId, setAddUserId] = useState("");
  const [addRole, setAddRole] = useState("staff");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "school", schoolId],
    queryFn: () => fetchAdminSchool(schoolId),
    enabled: isGlobalAdmin && schoolId != null,
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ userId, role }) => changeAdminUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "school", schoolId] });
      toast.success("Role updated");
    },
    onError: (err) => toast.error(err.message || "Failed to change role"),
  });

  const unassignMutation = useMutation({
    mutationFn: (userId) => assignAdminUserSchool(userId, null),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "school", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "schools"] });
      setUnassignTarget(null);
      toast.success("Member removed from school");
    },
    onError: (err) => toast.error(err.message || "Failed to remove member"),
  });

  const { data: invites } = useQuery({
    queryKey: ["admin", "school-invites", schoolId],
    queryFn: () => fetchAdminSchoolInvites(schoolId),
    enabled: isGlobalAdmin && schoolId != null,
  });

  const createInviteMutation = useMutation({
    mutationFn: (data) => createAdminSchoolInvite(schoolId, data),
    onSuccess: (invite) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "school-invites", schoolId] });
      setInviteEmail("");
      setLastInviteUrl(invite.acceptUrl);
      toast.success("Invite created. Share the link below.");
    },
    onError: (err) => toast.error(err.message || "Failed to create invite"),
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId) => revokeAdminSchoolInvite(schoolId, inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "school-invites", schoolId] });
      toast.success("Invite revoked");
    },
    onError: (err) => toast.error(err.message || "Failed to revoke invite"),
  });

  const { data: allUsers } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: fetchAdminUsers,
    enabled: isGlobalAdmin && showAddExisting,
  });

  const unattachedUsers = (allUsers || []).filter(u => !u.schoolId);

  const addExistingMutation = useMutation({
    mutationFn: async ({ userId, role }) => {
      // Assign school then update role
      await assignAdminUserSchool(userId, schoolId);
      await changeAdminUserRole(userId, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "school", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "schools"] });
      setShowAddExisting(false);
      setAddUserId("");
      setAddRole("staff");
      toast.success("User added to school");
    },
    onError: (err) => toast.error(err.message || "Failed to add user"),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: resetAdminUserPassword,
    onSuccess: (result) => {
      setResetResult(result);
      toast.success("Recovery link generated");
    },
    onError: (err) => toast.error(err.message || "Failed to generate recovery link"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "school", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "schools"] });
      setDeleteTarget(null);
      setDeleteConfirmText("");
      toast.success("User deleted");
    },
    onError: (err) => toast.error(err.message || "Failed to delete user"),
  });

  const handleRoleChange = (member, newRole) => {
    if (member.id === currentUser?.id) {
      toast.error("You cannot change your own role");
      return;
    }
    changeRoleMutation.mutate({ userId: member.id, role: newRole });
  };

  const openUnassignModal = (member) => {
    if (member.id === currentUser?.id) {
      toast.error("You cannot remove yourself");
      return;
    }
    setUnassignTarget(member);
  };

  const openDeleteModal = (member) => {
    if (member.id === currentUser?.id) {
      toast.error("You cannot delete yourself");
      return;
    }
    setDeleteTarget(member);
    setDeleteConfirmText("");
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  const school = data?.school;
  const members = data?.members ?? [];

  if (!school) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-12">
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">School not found.</p>
              <Button variant="outline" onClick={() => setLocation("/admin/schools")} className="mt-4">
                Back to schools
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  const address = [school.streetAddress, school.city, school.state, school.zipCode]
    .filter(Boolean)
    .join(", ");

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6 py-2">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/admin/schools")}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <School className="w-5 h-5 text-primary" />
            </div>
            {school.name}
          </h1>
          {school.slug && (
            <p className="text-sm text-muted-foreground mt-1 ml-13">
              Slug: <span className="font-mono">{school.slug}</span>
            </p>
          )}
        </div>

        {/* School info cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <Users className="w-3.5 h-3.5" /> Members
              </div>
              <p className="text-2xl font-bold">{members.length}</p>
            </CardContent>
          </Card>
          {address && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <MapPin className="w-3.5 h-3.5" /> Location
                </div>
                <p className="text-sm font-medium">{address}</p>
              </CardContent>
            </Card>
          )}
          {school.introOffer && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <Tag className="w-3.5 h-3.5" /> Intro Offer
                </div>
                <p className="text-sm font-medium">{school.introOffer}</p>
              </CardContent>
            </Card>
          )}
          {(school.priceRangeLow || school.priceRangeHigh) && (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <DollarSign className="w-3.5 h-3.5" /> Pricing
                </div>
                <p className="text-sm font-medium">
                  {school.priceRangeLow && school.priceRangeHigh
                    ? `$${school.priceRangeLow} – $${school.priceRangeHigh}/mo`
                    : school.priceRangeLow
                    ? `From $${school.priceRangeLow}/mo`
                    : `Up to $${school.priceRangeHigh}/mo`}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Invite section */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Invite to this school
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddExisting(true)}
              className="gap-2"
            >
              <User className="w-4 h-4" />
              Add existing user
            </Button>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!inviteEmail.trim()) return;
                createInviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
              }}
              className="flex flex-col sm:flex-row gap-3 items-end"
            >
              <div className="flex-1 space-y-1.5 w-full">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="schooladmin@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5 w-full sm:w-44">
                <Label htmlFor="invite-role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="invite-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school_admin">School Admin</SelectItem>
                    <SelectItem value="staff">Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                type="submit"
                disabled={createInviteMutation.isPending}
                className="gap-2 w-full sm:w-auto"
              >
                {createInviteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Mail className="w-4 h-4" />
                )}
                Create invite
              </Button>
            </form>

            {lastInviteUrl && (
              <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <p className="text-xs text-muted-foreground mb-2 font-medium">
                  Share this link with the new member:
                </p>
                <div className="flex items-center gap-2 p-2 rounded bg-background border">
                  <span className="font-mono text-xs flex-1 truncate text-foreground">
                    {lastInviteUrl}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(lastInviteUrl);
                      setCopiedToken("latest");
                      toast.success("Invite link copied!");
                      setTimeout(() => setCopiedToken(null), 2000);
                    }}
                    className="p-1.5 rounded hover:bg-accent transition-colors shrink-0"
                    title="Copy link"
                  >
                    {copiedToken === "latest" ? (
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                    ) : (
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {invites && invites.length > 0 && (
              <div className="mt-6">
                <p className="text-xs font-medium text-muted-foreground mb-2">
                  Pending invites ({invites.length})
                </p>
                <div className="divide-y divide-border">
                  {invites.map((invite) => {
                    const acceptUrl = `${window.location.origin}/invite/${invite.token}`;
                    return (
                      <div key={invite.id} className="flex items-center justify-between gap-3 py-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium truncate">{invite.email}</span>
                            <RoleBadge role={invite.role} />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Expires {formatDate(invite.expiresAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              navigator.clipboard.writeText(acceptUrl);
                              setCopiedToken(invite.token);
                              toast.success("Invite link copied!");
                              setTimeout(() => setCopiedToken(null), 2000);
                            }}
                          >
                            {copiedToken === invite.token ? (
                              <CheckCircle2 className="w-4 h-4 text-green-400" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm(`Revoke invite for ${invite.email}?`)) {
                                revokeInviteMutation.mutate(invite.id);
                              }
                            }}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Members table */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Members
              <span className="text-xs text-muted-foreground font-normal">({members.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No members in this school.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {members.map((member) => {
                  const isSelf = member.id === currentUser?.id;
                  return (
                    <div key={member.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">
                            {member.name || member.email}
                          </span>
                          {isSelf && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {member.email}
                          {member.phoneNumber ? ` • ${member.phoneNumber}` : ""}
                        </p>
                      </div>

                      {/* Role selector */}
                      <div className="shrink-0 w-36">
                        <Select
                          value={member.role}
                          onValueChange={(val) => handleRoleChange(member, val)}
                          disabled={isSelf || changeRoleMutation.isPending}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="school_admin">School Admin</SelectItem>
                            <SelectItem value="global_admin">Global Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetPasswordMutation.mutate(member.id)}
                          disabled={isSelf || resetPasswordMutation.isPending}
                          title="Reset password"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <KeyRound className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openUnassignModal(member)}
                          disabled={isSelf}
                          title="Remove from school"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <User className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openDeleteModal(member)}
                          disabled={isSelf}
                          title="Delete user permanently"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Remove from school modal */}
      <Dialog open={!!unassignTarget} onOpenChange={(open) => { if (!open) setUnassignTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Remove member
            </DialogTitle>
            <DialogDescription>
              Remove <strong>{unassignTarget?.name || unassignTarget?.email}</strong> from {school?.name}? They will keep their account but lose access to this school.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setUnassignTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => unassignMutation.mutate(unassignTarget?.id)}
              disabled={unassignMutation.isPending}
              className="gap-2"
            >
              {unassignMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Remove from school
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add existing user modal */}
      <Dialog open={showAddExisting} onOpenChange={(open) => { if (!open) setShowAddExisting(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5 text-primary" />
              Add existing user
            </DialogTitle>
            <DialogDescription>
              Attach an existing user who isn't currently in any school. They must already have an account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="add-user">User</Label>
              {unattachedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-2">
                  No unattached users. Every existing user already belongs to a school.
                </p>
              ) : (
                <Select value={addUserId} onValueChange={setAddUserId}>
                  <SelectTrigger id="add-user">
                    <SelectValue placeholder="Select a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {unattachedUsers.map(u => (
                      <SelectItem key={u.id} value={String(u.id)}>
                        {u.name ? `${u.name} — ${u.email}` : u.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {unattachedUsers.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="add-role">Role</Label>
                <Select value={addRole} onValueChange={setAddRole}>
                  <SelectTrigger id="add-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="school_admin">School Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowAddExisting(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addExistingMutation.mutate({ userId: parseInt(addUserId, 10), role: addRole })}
              disabled={!addUserId || addExistingMutation.isPending || unattachedUsers.length === 0}
              className="gap-2"
            >
              {addExistingMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Add to school
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password reset link modal */}
      <Dialog open={!!resetResult} onOpenChange={(open) => { if (!open) setResetResult(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" />
              Password reset link
            </DialogTitle>
            <DialogDescription>
              Share this link with <strong>{resetResult?.email}</strong>. When they open it, they'll be able to set a new password.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="p-2 rounded bg-secondary border text-xs font-mono break-all">
              {resetResult?.link}
            </div>
            <Button
              onClick={() => {
                if (resetResult?.link) {
                  navigator.clipboard.writeText(resetResult.link);
                  toast.success("Link copied!");
                }
              }}
              variant="outline"
              className="w-full gap-2"
            >
              <Copy className="w-4 h-4" />
              Copy link
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete user modal */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) { setDeleteTarget(null); setDeleteConfirmText(""); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete user permanently</DialogTitle>
            <DialogDescription>
              This will permanently delete <strong>{deleteTarget?.name || deleteTarget?.email}</strong> and all their data. This is NOT the same as removing them from a school — their account will be gone forever.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Type <span className="font-mono font-semibold text-foreground">delete user</span> to confirm:
            </p>
            <Input
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="delete user"
              autoFocus
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleteTarget(null); setDeleteConfirmText(""); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteUserMutation.mutate(deleteTarget?.id)}
              disabled={deleteConfirmText !== "delete user" || deleteUserMutation.isPending}
              className="gap-2"
            >
              {deleteUserMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4" />
              )}
              Delete user
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
