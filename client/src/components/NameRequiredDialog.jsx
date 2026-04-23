import { updateMe } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, User } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function NameRequiredDialog() {
  const { user, refresh } = useAuth();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");

  const needsName = !!user && !user.name?.trim();

  const saveMutation = useMutation({
    mutationFn: (data) => updateMe(data),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      await refresh();
      toast.success("Name saved");
    },
    onError: (err) => toast.error(err.message || "Failed to save name"),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    saveMutation.mutate({ name: trimmed });
  };

  if (!needsName) return null;

  const prevent = (e) => e.preventDefault();

  return (
    <Dialog open>
      <DialogContent
        showCloseButton={false}
        onEscapeKeyDown={prevent}
        onPointerDownOutside={prevent}
        onInteractOutside={prevent}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            What should we call you?
          </DialogTitle>
          <DialogDescription>
            Add your name so your calls and leaderboard entries aren't blank.
            You can change this anytime from your profile.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="required-name">Display name</Label>
            <Input
              id="required-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Tom"
              maxLength={255}
              disabled={saveMutation.isPending}
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={!name.trim() || saveMutation.isPending}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
