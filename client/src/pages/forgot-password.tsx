import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

export default function ForgotPassword() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/forgot-password", { email });
    },
    onSuccess: () => {
      setSent(true);
    },
    onError: () => {
      // Always show success to avoid revealing whether an email exists
      setSent(true);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center border-2 border-primary/30 mx-auto mb-4">
            <span className="text-lg font-bold text-secondary-foreground tracking-tight">IN</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">Inflow</h1>
          <p className="text-muted-foreground text-sm mt-1">Smart invoice automation</p>
        </div>

        <Card className="border-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg font-bold tracking-tight uppercase">Reset password</CardTitle>
            <CardDescription>
              {sent
                ? "Check your inbox"
                : "Enter your email and we'll send you a reset link"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="text-center py-4">
                <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground mb-6">
                  If an account exists for <strong>{email}</strong>, you'll receive a password reset email shortly. Check your spam folder if it doesn't arrive.
                </p>
                <Link href="/login">
                  <Button variant="outline" className="w-full font-bold uppercase tracking-wide" data-testid="button-back-to-login">
                    Back to sign in
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@yourbusiness.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    data-testid="input-email"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full font-bold uppercase tracking-wide"
                  disabled={mutation.isPending}
                  data-testid="button-send-reset"
                >
                  {mutation.isPending ? "Sending…" : "Send reset link"}
                </Button>
                <p className="text-center text-sm text-muted-foreground">
                  <Link href="/login" className="text-primary font-semibold hover:underline" data-testid="link-back-to-login">
                    Back to sign in
                  </Link>
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
