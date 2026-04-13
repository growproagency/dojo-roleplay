import DashboardLayout from "@/components/DashboardLayout";
import { updateMe } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save, User, Phone, Mail } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Profile() {
  const { user, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");

  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setPhoneNumber(user.phoneNumber ?? "");
    }
  }, [user]);

  const saveMutation = useMutation({
    mutationFn: (data) => updateMe(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      await refresh();
      toast.success("Profile updated");
    },
    onError: (err) => toast.error(err.message || "Failed to update profile"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = phoneNumber.trim();
    if (trimmed && !/^\+[1-9]\d{1,14}$/.test(trimmed)) {
      toast.error("Phone number must be in E.164 format, e.g. +639171234567");
      return;
    }
    saveMutation.mutate({
      name: name.trim() || undefined,
      phoneNumber: trimmed || null,
    });
  };

  return (
    <DashboardLayout>
      <div className="max-w-2xl mx-auto space-y-8 py-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Profile</h1>
          <p className="text-muted-foreground mt-1">
            Update your name and phone number for caller ID matching.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              Personal info
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </Label>
                <Input id="email" value={user?.email ?? ""} disabled readOnly />
                <p className="text-xs text-muted-foreground">
                  Email is managed by your account provider and can't be changed here.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="name">Display name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone number
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+639171234567"
                />
                <p className="text-xs text-muted-foreground">
                  Use international (E.164) format starting with{" "}
                  <span className="font-mono">+</span>. This number lets Dojo Roleplay
                  recognize you when you call from your phone. Leave blank to disable phone calls.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="gap-2"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Save changes
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
