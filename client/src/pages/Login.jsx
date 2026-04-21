import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Loader2, School } from "lucide-react";

export default function Login() {
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState(null);

  // If the user came from an invite link, pre-fill email and default to sign up
  const pendingInviteToken = typeof window !== "undefined"
    ? sessionStorage.getItem("dojo:pendingInviteToken")
    : null;
  const postLoginPath = pendingInviteToken
    ? `/invite/${pendingInviteToken}`
    : "/dashboard";

  useEffect(() => {
    const storedEmail = sessionStorage.getItem("dojo:inviteEmail");
    const storedMode = sessionStorage.getItem("dojo:inviteMode");
    if (storedEmail) {
      setEmail(storedEmail);
      setInviteEmail(storedEmail);
      setIsSignUp(storedMode !== "signin");
      // Clean up so it doesn't persist across unrelated visits
      sessionStorage.removeItem("dojo:inviteEmail");
      sessionStorage.removeItem("dojo:inviteMode");
    }
  }, []);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    // Block signup when not from an invite — this is an invite-only platform
    if (isSignUp && !pendingInviteToken) {
      toast.error("Dojo Roleplay is invite-only. Please ask your school admin for an invite link.");
      return;
    }
    setLoading(true);
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        // With email confirmation disabled, the user is immediately signed in
        if (data?.session) {
          toast.success("Account created!");
          setLocation(postLoginPath);
        } else {
          toast.success("Check your email for a confirmation link!");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setLocation(postLoginPath);
      }
    } catch (err) {
      toast.error(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: `${window.location.origin}${postLoginPath}` },
    });
    if (error) toast.error(error.message);
  };

  const isFromInvite = !!inviteEmail || !!pendingInviteToken;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          {isFromInvite && isSignUp && (
            <div className="mx-auto w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <School className="w-5 h-5 text-primary" />
            </div>
          )}
          <CardTitle className="text-2xl">
            {isSignUp
              ? isFromInvite ? "Create your account" : "Create Account"
              : "Sign In"}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {isSignUp
              ? isFromInvite
                ? "Set up your account to join the team"
                : "Sign up to start training"
              : isFromInvite
                ? "Sign in to accept your invite"
                : "Sign in to your training dashboard"}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OAuth buttons */}
          <Button variant="outline" onClick={() => handleOAuthLogin("google")} className="w-full bg-transparent">
            Continue with Google
          </Button>

          <div className="relative">
            <Separator />
            <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
              or
            </span>
          </div>

          {/* Email/password form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                readOnly={!!inviteEmail}
                className={`bg-background ${inviteEmail ? "opacity-70" : ""}`}
              />
              {inviteEmail && (
                <p className="text-xs text-muted-foreground">
                  This email was set by your invite. Use this exact email to join.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">
                {isSignUp ? "Create a password" : "Password"}
              </Label>
              <Input
                id="password"
                type="password"
                placeholder={isSignUp ? "At least 6 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="bg-background"
                autoFocus={!!inviteEmail}
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isSignUp
                ? isFromInvite ? "Create account & continue" : "Sign Up"
                : isFromInvite ? "Sign in & continue" : "Sign In"}
            </Button>
          </form>

          {isFromInvite ? (
            <p className="text-center text-sm text-muted-foreground">
              {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="text-primary hover:underline font-medium"
              >
                {isSignUp ? "Sign in" : "Sign up"}
              </button>
            </p>
          ) : (
            <p className="text-center text-xs text-muted-foreground">
              Dojo Roleplay is invite-only. Contact your school admin for an invite link.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
