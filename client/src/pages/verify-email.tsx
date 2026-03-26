import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function VerifyEmail() {
  const [location] = useLocation();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (!token) {
      setStatus("error");
      setMessage("No verification token found in the link.");
      return;
    }

    fetch(`/api/auth/verify-email?token=${encodeURIComponent(token)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok && data.success) {
          setStatus("success");
          setMessage(data.email);
          queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        } else {
          setStatus("error");
          setMessage(data.message || "This link is invalid or has already been used.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("Something went wrong. Please try again.");
      });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-primary text-primary-foreground px-5 py-2 rounded font-bold tracking-[0.22em] text-sm uppercase w-fit mx-auto mb-6">
          INFLOW
        </div>

        {status === "loading" && (
          <>
            <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
            <h1 className="text-xl font-bold tracking-tight uppercase mb-2">Verifying your email…</h1>
            <p className="text-muted-foreground text-sm">Just a moment</p>
          </>
        )}

        {status === "success" && (
          <>
            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
            <h1 className="text-xl font-bold tracking-tight uppercase mb-2">Email verified</h1>
            <p className="text-muted-foreground text-sm mb-6">
              <strong>{message}</strong> is now verified. You're all set.
            </p>
            <Link href="/">
              <Button className="font-bold uppercase tracking-wide" data-testid="button-go-to-dashboard">
                Go to dashboard
              </Button>
            </Link>
          </>
        )}

        {status === "error" && (
          <>
            <XCircle className="w-12 h-12 mx-auto mb-4 text-destructive" />
            <h1 className="text-xl font-bold tracking-tight uppercase mb-2">Verification failed</h1>
            <p className="text-muted-foreground text-sm mb-6">{message}</p>
            <Link href="/">
              <Button variant="outline" className="font-bold uppercase tracking-wide">
                Back to app
              </Button>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
