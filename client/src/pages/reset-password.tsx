import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff, CheckCircle, XCircle } from "lucide-react";

export default function ResetPassword() {
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("token");
    if (t) setToken(t);
  }, []);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/auth/reset-password", { token, password });
      return res.json();
    },
    onSuccess: () => {
      setDone(true);
    },
    onError: (err: any) => {
      let message = "Reset failed. The link may have expired.";
      try {
        const jsonStr = err.message?.slice(err.message.indexOf("{"));
        if (jsonStr) {
          const body = JSON.parse(jsonStr);
          if (body?.message) message = body.message;
        }
      } catch {}
      toast({ title: "Error", description: message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    mutation.mutate();
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-sm">
          <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold tracking-tight uppercase mb-2">Invalid link</h1>
          <p className="text-muted-foreground text-sm mb-6">This password reset link is missing or invalid.</p>
          <Link href="/forgot-password">
            <Button className="font-bold uppercase tracking-wide">Request a new link</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="bg-primary text-primary-foreground px-5 py-2 rounded font-bold tracking-[0.22em] text-sm uppercase w-fit mx-auto mb-4">
            INFLOW
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">Inflow</h1>
        </div>

        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold tracking-tight uppercase">Choose new password</CardTitle>
            <CardDescription>Enter and confirm your new password below</CardDescription>
          </CardHeader>
          <CardContent>
            {done ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-6">Your password has been updated successfully.</p>
                <Link href="/login">
                  <Button className="w-full font-bold uppercase tracking-wide" data-testid="button-go-to-login">
                    Sign in with new password
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">New password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pr-10"
                      data-testid="input-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirm new password</Label>
                  <div className="relative">
                    <Input
                      id="confirm"
                      type={showConfirm ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      className="pr-10"
                      data-testid="input-confirm-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      tabIndex={-1}
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <Button
                  type="submit"
                  className="w-full font-bold uppercase tracking-wide"
                  disabled={mutation.isPending}
                  data-testid="button-reset-password"
                >
                  {mutation.isPending ? "Updating…" : "Set new password"}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
