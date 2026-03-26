import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Edit, Send, CheckCircle, Printer, Trash2 } from "lucide-react";
import type { Invoice, Client, LineItem, Settings } from "@shared/schema";
import { format } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function formatCurrency(amount: number, currency: string = "GBP"): string {
  const locale = currency === "GBP" ? "en-GB" : currency === "EUR" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export default function InvoiceDetail() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: invoice, isLoading } = useQuery<Invoice>({
    queryKey: ["/api/invoices", params.id],
  });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: orgSettings } = useQuery<Settings>({ queryKey: ["/api/settings"] });

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

  const deleteInvoice = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/invoices/${params.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: "Invoice deleted" });
      navigate("/invoices");
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
          {invoice.status !== "paid" && (
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
          <Button
            variant="outline"
            size="sm"
            className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
            onClick={() => {
              if (confirm("Delete this invoice? This cannot be undone.")) {
                deleteInvoice.mutate();
              }
            }}
            disabled={deleteInvoice.isPending}
            data-testid="button-delete-invoice"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="flex items-center gap-3">
                  {orgSettings?.logoUrl ? (
                    <img
                      src={orgSettings.logoUrl}
                      alt="Business logo"
                      className="h-12 w-12 rounded-full object-contain border-2 border-primary/30 bg-card"
                      data-testid="img-invoice-logo"
                    />
                  ) : (
                    <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded font-bold tracking-[0.2em] text-xs uppercase">
                      INFLOW
                    </div>
                  )}
                  <div>
                    <p className="font-bold text-lg tracking-tight" data-testid="text-invoice-business-name">
                      {orgSettings?.businessName || "Inflow"}
                    </p>
                    {orgSettings?.vatNumber && (
                      <p className="text-xs text-muted-foreground">VAT: {orgSettings.vatNumber}</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Invoice</p>
                  <p className="text-lg font-bold tracking-tight">{invoice.invoiceNumber}</p>
                </div>
              </div>
              <Separator className="mb-6" />
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
                    <TableHead>Product / Service</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Cost</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, i) => (
                    <TableRow key={i} data-testid={`row-line-item-${i}`}>
                      <TableCell>
                        <div>
                          <p className="font-medium" data-testid={`text-line-item-name-${i}`}>{item.name || item.description || "Untitled item"}</p>
                          {item.name && item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5" data-testid={`text-line-item-desc-${i}`}>{item.description}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right tabular-nums" data-testid={`text-line-item-qty-${i}`}>{item.quantity}</TableCell>
                      <TableCell className="text-right tabular-nums" data-testid={`text-line-item-rate-${i}`}>
                        {formatCurrency(Number(item.rate), invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-medium" data-testid={`text-line-item-amount-${i}`}>
                        {formatCurrency(item.quantity * item.rate, invoice.currency)}
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
                    <span className="tabular-nums">{formatCurrency(Number(invoice.subtotal), invoice.currency)}</span>
                  </div>
                  {Number(invoice.taxRate) > 0 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">VAT ({invoice.taxRate}%)</span>
                      <span className="tabular-nums">{formatCurrency(Number(invoice.taxAmount), invoice.currency)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between gap-2 text-base font-semibold">
                    <span>Total ({invoice.currency})</span>
                    <span className="tabular-nums" data-testid="text-invoice-total">
                      {formatCurrency(Number(invoice.total), invoice.currency)}
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

              {(orgSettings?.vatNumber || orgSettings?.bankName || orgSettings?.sortCode) && (
                <>
                  <Separator className="my-5" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {orgSettings?.vatNumber && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">VAT Number</p>
                        <p className="text-sm font-medium" data-testid="text-vat-number">{orgSettings.vatNumber}</p>
                      </div>
                    )}
                    {(orgSettings?.bankName || orgSettings?.sortCode) && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">Bank Details</p>
                        <div className="text-sm space-y-0.5" data-testid="text-bank-details">
                          {orgSettings.bankName && <p className="font-medium">{orgSettings.bankName}</p>}
                          {orgSettings.accountName && <p className="text-muted-foreground">{orgSettings.accountName}</p>}
                          {orgSettings.sortCode && <p className="text-muted-foreground">Sort Code: {orgSettings.sortCode}</p>}
                          {orgSettings.accountNumber && <p className="text-muted-foreground">Account: {orgSettings.accountNumber}</p>}
                        </div>
                      </div>
                    )}
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
