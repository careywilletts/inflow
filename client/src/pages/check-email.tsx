import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw } from "lucide-react";

export default function CheckEmail() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [sent, setSent] = useState(false);

  const resendMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/auth/resend-verification"),
    onSuccess: () => {
      setSent(true);
      toast({ title: "Email sent", description: "Check your inbox for the new verification link." });
    },
    onError: () => {
      toast({ title: "Failed to send", description: "Please try again in a moment.", variant: "destructive" });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center border-2 border-primary/30 mx-auto mb-6">
          <span className="text-lg font-bold text-secondary-foreground tracking-tight">IN</span>
        </div>

        <Mail className="w-12 h-12 mx-auto mb-4 text-primary" />
        <h1 className="text-2xl font-bold tracking-tight uppercase mb-2">Check your email</h1>
        <p className="text-muted-foreground text-sm mb-1">
          We sent a verification link to
        </p>
        <p className="font-semibold text-sm mb-6 break-all">{user?.email}</p>
        <p className="text-muted-foreground text-sm mb-8">
          Click the link in the email to activate your account. Once verified, click the button below or refresh this page.
        </p>

        <div className="space-y-3">
          <Button
            onClick={handleRefresh}
            className="w-full font-bold uppercase tracking-wide"
            data-testid="button-ive-verified"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            I've verified my email
          </Button>

          <Button
            variant="outline"
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending || sent}
            className="w-full font-bold uppercase tracking-wide"
            data-testid="button-resend-verification"
          >
            {resendMutation.isPending ? "Sending…" : sent ? "Email sent ✓" : "Resend verification email"}
          </Button>

          <button
            onClick={logout}
            className="text-xs text-muted-foreground hover:text-foreground underline mt-2 block mx-auto"
            data-testid="button-sign-out-unverified"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
