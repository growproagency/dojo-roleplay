import DashboardLayout from "@/components/DashboardLayout";
import {
  fetchAdminSchool,
  fetchAdminSchools,
  changeAdminUserRole,
  assignAdminUserSchool,
  deleteAdminUser,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  School,
  Users,
  ArrowLeft,
  Trash2,
  ShieldAlert,
  MapPin,
  DollarSign,
  Tag,
  User,
} from "lucide-react";
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
      toast.success("Member removed from school");
    },
    onError: (err) => toast.error(err.message || "Failed to remove member"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: deleteAdminUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "school", schoolId] });
      queryClient.invalidateQueries({ queryKey: ["admin", "schools"] });
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

  const handleUnassign = (member) => {
    if (member.id === currentUser?.id) {
      toast.error("You cannot remove yourself");
      return;
    }
    if (!confirm(`Remove ${member.name || member.email} from this school? They will keep their account but lose school access.`)) return;
    unassignMutation.mutate(member.id);
  };

  const handleDeleteUser = (member) => {
    if (member.id === currentUser?.id) {
      toast.error("You cannot delete yourself");
      return;
    }
    if (!confirm(`Permanently delete ${member.name || member.email}? This removes their account, NOT just school membership. This cannot be undone.`)) return;
    deleteUserMutation.mutate(member.id);
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
                          onClick={() => handleUnassign(member)}
                          disabled={isSelf || unassignMutation.isPending}
                          title="Remove from school"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <User className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(member)}
                          disabled={isSelf || deleteUserMutation.isPending}
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
    </DashboardLayout>
  );
}
