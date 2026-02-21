import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, Send, CheckCircle, Printer } from "lucide-react";
import type { Invoice, Client, LineItem } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function InvoiceDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ["/api/invoices", params.id],
  });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });

  const client = invoice?.clientId ? clients?.find(c => c.id === invoice.clientId) : undefined;

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const res = await apiRequest("PATCH", `/api/invoices/${params.id}`, { status: newStatus });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="p-6 space-y-5 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-6 text-center">
        <p>Invoice not found</p>
        <Link href="/invoices">
          <Button variant="outline" className="mt-4">Back to Invoices</Button>
        </Link>
      </div>
    );
  }

  const lineItems = invoice.lineItems as LineItem[];

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")} data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-invoice-number">
                {invoice.invoiceNumber}
              </h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">
              Created {format(new Date(invoice.issueDate), "MMMM d, yyyy")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {invoice.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatus.mutate("sent")}
              disabled={updateStatus.isPending}
              data-testid="button-mark-sent"
            >
              <Send className="w-4 h-4 mr-2" />
              Mark as Sent
            </Button>
          )}
          {invoice.status === "sent" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => updateStatus.mutate("paid")}
              disabled={updateStatus.isPending}
              data-testid="button-mark-paid"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Mark as Paid
            </Button>
          )}
          <Link href={`/invoices/${invoice.id}/edit`}>
            <Button variant="outline" size="sm" data-testid="button-edit-invoice">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" size="sm" onClick={() => window.print()} data-testid="button-print">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="grid grid-cols-2 gap-6 mb-6">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">From</p>
                  <p className="font-medium">{invoice.fromName || "Not specified"}</p>
                  {invoice.fromEmail && <p className="text-sm text-muted-foreground">{invoice.fromEmail}</p>}
                  {invoice.fromAddress && <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.fromAddress}</p>}
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">To</p>
                  {client ? (
                    <>
                      <p className="font-medium">{client.name}</p>
                      {client.company && <p className="text-sm text-muted-foreground">{client.company}</p>}
                      <p className="text-sm text-muted-foreground">{client.email}</p>
                      {client.address && <p className="text-sm text-muted-foreground whitespace-pre-line">{client.address}</p>}
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">No client assigned</p>
                  )}
                </div>
              </div>

              <Separator className="mb-5" />

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Rate</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>{item.description || "Untitled item"}</TableCell>
                      <TableCell className="text-right tabular-nums">{item.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        ${Number(item.rate).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium">
                        ${(item.quantity * item.rate).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator className="my-4" />

              <div className="flex justify-end">
                <div className="w-64 space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="tabular-nums">${Number(invoice.subtotal).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                  </div>
                  {Number(invoice.taxRate) > 0 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Tax ({invoice.taxRate}%)</span>
                      <span className="tabular-nums">${Number(invoice.taxAmount).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between gap-2 text-base font-semibold">
                    <span>Total ({invoice.currency})</span>
                    <span className="tabular-nums" data-testid="text-invoice-total">
                      ${Number(invoice.total).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              {invoice.notes && (
                <>
                  <Separator className="my-5" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Notes</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{invoice.notes}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Invoice Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={invoice.status} />
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Issue Date</span>
                <span className="tabular-nums">{format(new Date(invoice.issueDate), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Due Date</span>
                <span className="tabular-nums">{format(new Date(invoice.dueDate), "MMM d, yyyy")}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Currency</span>
                <span>{invoice.currency}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
