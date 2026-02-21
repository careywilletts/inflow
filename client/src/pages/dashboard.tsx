import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { FileText, Users, Clock, PoundSterling, Plus, ArrowRight, TrendingUp } from "lucide-react";
import type { Invoice, Client, Schedule } from "@shared/schema";
import { format } from "date-fns";

function formatCurrency(amount: number, currency: string = "GBP"): string {
  const locale = currency === "GBP" ? "en-GB" : currency === "EUR" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

function StatCard({ title, value, icon: Icon, description, loading, accent }: {
  title: string;
  value: string;
  icon: any;
  description?: string;
  loading?: boolean;
  accent?: "green" | "pink";
}) {
  const iconBg = accent === "pink" ? "bg-secondary" : "bg-primary/15";
  const iconColor = accent === "pink" ? "text-secondary-foreground" : "text-primary";
  return (
    <Card className="hover-elevate border-2">
      <CardContent className="p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <p className="text-2xl font-bold tracking-tight">{value}</p>
            )}
            {description && (
              <p className="text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          <div className={`rounded-full ${iconBg} p-3`}>
            <Icon className={`w-5 h-5 ${iconColor}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { data: invoices, isLoading: loadingInvoices } = useQuery<Invoice[]>({
    queryKey: ["/api/invoices"],
  });
  const { data: clients, isLoading: loadingClients } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });
  const { data: schedulesData, isLoading: loadingSchedules } = useQuery<Schedule[]>({
    queryKey: ["/api/schedules"],
  });

  const totalRevenue = invoices?.filter(i => i.status === "paid").reduce((sum, i) => sum + Number(i.total), 0) ?? 0;
  const pendingAmount = invoices?.filter(i => i.status === "sent").reduce((sum, i) => sum + Number(i.total), 0) ?? 0;
  const recentInvoices = invoices?.slice(0, 5) ?? [];
  const activeSchedules = schedulesData?.filter(s => s.isActive).length ?? 0;
  const loading = loadingInvoices || loadingClients || loadingSchedules;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Your invoice overview at a glance</p>
        </div>
        <Link href="/invoices/new">
          <Button data-testid="button-create-invoice">
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Revenue"
          value={formatCurrency(totalRevenue)}
          icon={PoundSterling}
          description="From paid invoices"
          loading={loading}
          accent="green"
        />
        <StatCard
          title="Pending"
          value={formatCurrency(pendingAmount)}
          icon={TrendingUp}
          description="Awaiting payment"
          loading={loading}
          accent="pink"
        />
        <StatCard
          title="Total Clients"
          value={String(clients?.length ?? 0)}
          icon={Users}
          description="Active clients"
          loading={loading}
          accent="green"
        />
        <StatCard
          title="Active Schedules"
          value={String(activeSchedules)}
          icon={Clock}
          description="Automated invoices"
          loading={loading}
          accent="pink"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base font-medium">Recent Invoices</CardTitle>
            <Link href="/invoices">
              <Button variant="ghost" size="sm" data-testid="button-view-all-invoices">
                View all
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : recentInvoices.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No invoices yet</p>
                <Link href="/invoices/new">
                  <Button variant="outline" size="sm" className="mt-3" data-testid="button-create-first-invoice">
                    Create your first invoice
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {recentInvoices.map(invoice => (
                  <Link key={invoice.id} href={`/invoices/${invoice.id}`}>
                    <div className="flex items-center justify-between gap-2 p-3 rounded-md hover-elevate cursor-pointer" data-testid={`card-invoice-${invoice.id}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <FileText className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{invoice.invoiceNumber}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(invoice.issueDate), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <StatusBadge status={invoice.status} />
                        <span className="text-sm font-medium tabular-nums">
                          {formatCurrency(Number(invoice.total), invoice.currency)}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
            <CardTitle className="text-base font-medium">Upcoming Schedules</CardTitle>
            <Link href="/schedules">
              <Button variant="ghost" size="sm" data-testid="button-view-all-schedules">
                View all
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="px-5 pb-5">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : !schedulesData || schedulesData.filter(s => s.isActive).length === 0 ? (
              <div className="text-center py-8">
                <Clock className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No active schedules</p>
                <Link href="/schedules">
                  <Button variant="outline" size="sm" className="mt-3" data-testid="button-create-first-schedule">
                    Set up automation
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-1">
                {schedulesData.filter(s => s.isActive).slice(0, 5).map(schedule => (
                  <div key={schedule.id} className="flex items-center justify-between gap-2 p-3 rounded-md" data-testid={`card-schedule-${schedule.id}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium capitalize">{schedule.frequency}</p>
                        <p className="text-xs text-muted-foreground">
                          Next: {format(new Date(schedule.nextSendDate), "MMM d, yyyy")}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize shrink-0">{schedule.frequency}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Badge({ variant, className, children }: { variant: string; className?: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${
      variant === "outline" ? "ring-border text-muted-foreground" : "ring-primary/20 bg-primary/10 text-primary"
    } ${className || ""}`}>
      {children}
    </span>
  );
}
