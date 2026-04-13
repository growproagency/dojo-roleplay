import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchSchoolMembers,
  fetchSchoolInvites,
  createSchoolInvite,
  revokeSchoolInvite,
  removeSchoolMember,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Users,
  Mail,
  Trash2,
  Copy,
  CheckCircle2,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import { useState } from "react";
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

export default function Members() {
  const { user: currentUser, isSchoolAdmin } = useAuth();
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("staff");
  const [copiedToken, setCopiedToken] = useState(null);
  const [lastInviteUrl, setLastInviteUrl] = useState(null);

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ["school", "members"],
    queryFn: fetchSchoolMembers,
    enabled: isSchoolAdmin,
  });

  const { data: invites, isLoading: invitesLoading } = useQuery({
    queryKey: ["school", "invites"],
    queryFn: fetchSchoolInvites,
    enabled: isSchoolAdmin,
  });

  const createInviteMutation = useMutation({
    mutationFn: createSchoolInvite,
    onSuccess: (invite) => {
      queryClient.invalidateQueries({ queryKey: ["school", "invites"] });
      setInviteEmail("");
      setInviteRole("staff");
      setLastInviteUrl(invite.acceptUrl);
      toast.success("Invite created. Share the link below.");
    },
    onError: (err) => toast.error(err.message || "Failed to create invite"),
  });

  const revokeInviteMutation = useMutation({
    mutationFn: revokeSchoolInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school", "invites"] });
      toast.success("Invite revoked");
    },
    onError: (err) => toast.error(err.message || "Failed to revoke invite"),
  });

  const removeMemberMutation = useMutation({
    mutationFn: removeSchoolMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["school", "members"] });
      toast.success("Member removed from school");
    },
    onError: (err) => toast.error(err.message || "Failed to remove member"),
  });

  const handleCreateInvite = (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    createInviteMutation.mutate({ email: inviteEmail.trim(), role: inviteRole });
  };

  const handleCopyLink = (url, token) => {
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    toast.success("Invite link copied!");
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleRemoveMember = (member) => {
    if (member.id === currentUser?.id) {
      toast.error("You cannot remove yourself");
      return;
    }
    if (!confirm(`Remove ${member.name || member.email} from the school?`)) return;
    removeMemberMutation.mutate(member.id);
  };

  const handleRevokeInvite = (invite) => {
    if (!confirm(`Revoke the invite for ${invite.email}?`)) return;
    revokeInviteMutation.mutate(invite.id);
  };

  if (!isSchoolAdmin) {
    return (
      <DashboardLayout>
        <div className="max-w-3xl mx-auto py-12">
          <Card>
            <CardContent className="flex items-start gap-3 p-6">
              <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold">Access denied</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Only school admins can manage members. Contact your school admin if you need access.
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
      <div className="max-w-5xl mx-auto space-y-8 py-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground mt-1">
            Manage staff and invites for your school.
          </p>
        </div>

        {/* Create invite */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" />
              Invite a new member
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateInvite} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 space-y-1.5 w-full">
                <Label htmlFor="invite-email">Email</Label>
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="staff@example.com"
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
                    <SelectItem value="staff">Staff</SelectItem>
                    <SelectItem value="school_admin">School Admin</SelectItem>
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
                    onClick={() => handleCopyLink(lastInviteUrl, "latest")}
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
          </CardContent>
        </Card>

        {/* Pending invites */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              Pending invites
              {invites && invites.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({invites.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invitesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !invites || invites.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No pending invites.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {invites.map((invite) => {
                  const acceptUrl = `${window.location.origin}/invite/${invite.token}`;
                  return (
                    <div key={invite.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate">{invite.email}</span>
                          <RoleBadge role={invite.role} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expires {formatDate(invite.expiresAt)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyLink(acceptUrl, invite.token)}
                          className="gap-1.5"
                        >
                          {copiedToken === invite.token ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                          <span className="hidden sm:inline">Copy link</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevokeInvite(invite)}
                          disabled={revokeInviteMutation.isPending}
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

        {/* Members list */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Active members
              {members && members.length > 0 && (
                <span className="text-xs text-muted-foreground font-normal">
                  ({members.length})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {membersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : !members || members.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                No members yet.
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
                          <RoleBadge role={member.role} />
                          {isSelf && (
                            <Badge variant="outline" className="text-xs">
                              You
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {member.email}
                          {member.phoneNumber ? ` • ${member.phoneNumber}` : ""}
                        </p>
                      </div>
                      {!isSelf && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveMember(member)}
                          disabled={removeMemberMutation.isPending}
                          className="text-destructive hover:text-destructive shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
