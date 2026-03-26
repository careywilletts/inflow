import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/dashboard";
import Invoices from "@/pages/invoices";
import InvoiceForm from "@/pages/invoice-form";
import InvoiceDetail from "@/pages/invoice-detail";
import Clients from "@/pages/clients";
import Schedules from "@/pages/schedules";
import SettingsPage from "@/pages/settings";
import Login from "@/pages/login";
import Register from "@/pages/register";
import VerifyEmail from "@/pages/verify-email";
import CheckEmail from "@/pages/check-email";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import { useAuth } from "@/hooks/use-auth";

const PUBLIC_PREFIXES = ["/login", "/register", "/verify-email", "/forgot-password", "/reset-password"];

function isPublicPath(location: string) {
  return PUBLIC_PREFIXES.some(p => location === p || location.startsWith(p + "?"));
}

function ProtectedApp() {
  const [location, setLocation] = useLocation();
  const { isAuthenticated, isVerified, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-14 h-14 rounded-full bg-secondary flex items-center justify-center border-2 border-primary/30 mx-auto mb-4 animate-pulse">
            <span className="text-lg font-bold text-secondary-foreground tracking-tight">IN</span>
          </div>
          <p className="text-sm text-muted-foreground uppercase tracking-widest">Loading…</p>
        </div>
      </div>
    );
  }

  // Allow verify-email page always (token-based, no session needed)
  if (location.startsWith("/verify-email")) {
    return <VerifyEmail />;
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !isPublicPath(location)) {
    setLocation("/login");
    return null;
  }

  // Redirect authenticated users away from login/register
  if (isAuthenticated && (location === "/login" || location === "/register")) {
    setLocation("/");
    return null;
  }

  // Show public pages
  if (isPublicPath(location)) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/forgot-password" component={ForgotPassword} />
        <Route path="/reset-password" component={ResetPassword} />
      </Switch>
    );
  }

  // Show email check screen for unverified users
  if (isAuthenticated && !isVerified) {
    return <CheckEmail />;
  }

  // Authenticated + verified — show the full app
  return (
    <SidebarProvider style={{ "--sidebar-width": "16rem", "--sidebar-width-icon": "3rem" } as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 p-2 border-b h-12 shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <Route path="/" component={Dashboard} />
              <Route path="/invoices" component={Invoices} />
              <Route path="/invoices/new" component={InvoiceForm} />
              <Route path="/invoices/:id/edit" component={InvoiceForm} />
              <Route path="/invoices/:id" component={InvoiceDetail} />
              <Route path="/clients" component={Clients} />
              <Route path="/schedules" component={Schedules} />
              <Route path="/settings" component={SettingsPage} />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ProtectedApp />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
