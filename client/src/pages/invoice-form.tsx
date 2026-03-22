import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useParams, Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { CalendarClock, Plus, Trash2, ArrowLeft, Save } from "lucide-react";
import type { Client, Invoice, LineItem, Schedule, Settings } from "@shared/schema";
import { useState, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function formatCurrency(amount: number, currency: string = "GBP"): string {
  const locale = currency === "GBP" ? "en-GB" : currency === "EUR" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

function formatDateForInput(date: Date | string) {
  const d = new Date(date);
  return format(d, "yyyy-MM-dd");
}

export default function InvoiceForm() {
  const params = useParams<{ id: string }>();
  const isEdit = params.id && params.id !== "new";
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: settings } = useQuery<Settings>({ queryKey: ["/api/settings"] });
  const { data: nextNumberData } = useQuery<{ invoiceNumber: string }>({
    queryKey: ["/api/invoices/next-number"],
    enabled: !isEdit,
  });
  const { data: existingInvoice, isLoading: loadingInvoice } = useQuery<Invoice>({
    queryKey: ["/api/invoices", params.id],
    enabled: !!isEdit,
  });

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("draft");
  const [issueDate, setIssueDate] = useState(formatDateForInput(new Date()));
  const [dueDate, setDueDate] = useState(formatDateForInput(new Date(Date.now() + 30 * 86400000)));
  const [lineItems, setLineItems] = useState<LineItem[]>([{ name: "", description: "", quantity: 1, rate: 0 }]);
  const [taxRate, setTaxRate] = useState(20);
  const [vatExempt, setVatExempt] = useState(false);
  const [notes, setNotes] = useState("");
  const [fromName, setFromName] = useState("");
  const [fromEmail, setFromEmail] = useState("");
  const [fromAddress, setFromAddress] = useState("");
  const [currency, setCurrency] = useState("GBP");

  useEffect(() => {
    if (!isEdit && nextNumberData?.invoiceNumber) {
      setInvoiceNumber(nextNumberData.invoiceNumber);
    }
  }, [isEdit, nextNumberData]);

  useEffect(() => {
    if (existingInvoice) {
      setInvoiceNumber(existingInvoice.invoiceNumber);
      setClientId(existingInvoice.clientId || "");
      setStatus(existingInvoice.status);
      setIssueDate(formatDateForInput(existingInvoice.issueDate));
      setDueDate(formatDateForInput(existingInvoice.dueDate));
      setLineItems(existingInvoice.lineItems as LineItem[]);
      const rate = Number(existingInvoice.taxRate);
      setTaxRate(rate || 20);
      setVatExempt(rate === 0);
      setNotes(existingInvoice.notes || "");
      setFromName(existingInvoice.fromName || "");
      setFromEmail(existingInvoice.fromEmail || "");
      setFromAddress(existingInvoice.fromAddress || "");
      setCurrency(existingInvoice.currency);
    }
  }, [existingInvoice]);

  useEffect(() => {
    if (!isEdit && settings) {
      setFromName(settings.businessName || "");
      setFromEmail(settings.businessEmail || "");
      setFromAddress(settings.businessAddress || "");
    }
  }, [isEdit, settings]);

  const subtotal = lineItems.reduce((sum, item) => sum + item.quantity * item.rate, 0);
  const effectiveTaxRate = vatExempt ? 0 : taxRate;
  const taxAmount = subtotal * (effectiveTaxRate / 100);
  const total = subtotal + taxAmount;

  const addLineItem = () => {
    setLineItems([...lineItems, { name: "", description: "", quantity: 1, rate: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    if (field === "description" || field === "name") {
      updated[index] = { ...updated[index], [field]: value as string };
    } else {
      updated[index] = { ...updated[index], [field]: Number(value) || 0 };
    }
    setLineItems(updated);
  };

  const mutation = useMutation({
    mutationFn: async (data: any) => {
      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/invoices/${params.id}`, data);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/invoices", data);
      return res.json();
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      queryClient.invalidateQueries({ queryKey: ["/api/invoices/next-number"] });
      toast({ title: isEdit ? "Invoice updated" : "Invoice created", description: `Invoice ${invoiceNumber} has been saved.` });
      navigate(`/invoices/${result.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      invoiceNumber,
      clientId: clientId || null,
      status,
      issueDate: new Date(issueDate).toISOString(),
      dueDate: new Date(dueDate).toISOString(),
      lineItems,
      subtotal: subtotal.toFixed(2),
      taxRate: effectiveTaxRate.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      total: total.toFixed(2),
      notes: notes || null,
      fromName: fromName || null,
      fromEmail: fromEmail || null,
      fromAddress: fromAddress || null,
      currency,
    };
    mutation.mutate(data);
  };

  if (isEdit && loadingInvoice) {
    return (
      <div className="p-6 space-y-5 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/invoices")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-form-title">
            {isEdit ? "Edit Invoice" : "New Invoice"}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isEdit ? "Update invoice details" : "Create a new invoice for your client"}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="invoiceNumber">Invoice Number *</Label>
                      {!isEdit && <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Auto-generated</span>}
                    </div>
                    <Input
                      id="invoiceNumber"
                      value={invoiceNumber}
                      onChange={e => setInvoiceNumber(e.target.value)}
                      placeholder="INV-2026-001"
                      required
                      data-testid="input-invoice-number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client">Client</Label>
                    <Select value={clientId} onValueChange={setClientId}>
                      <SelectTrigger data-testid="select-client">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients?.map(c => (
                          <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select value={status} onValueChange={setStatus}>
                      <SelectTrigger data-testid="select-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="sent">Sent</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issueDate">Issue Date</Label>
                    <Input
                      id="issueDate"
                      type="date"
                      value={issueDate}
                      onChange={e => setIssueDate(e.target.value)}
                      data-testid="input-issue-date"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={dueDate}
                      onChange={e => setDueDate(e.target.value)}
                      data-testid="input-due-date"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Products & Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lineItems.map((item, index) => (
                  <div key={index} className="border-2 border-border rounded-lg p-4 space-y-3 relative" data-testid={`card-line-item-${index}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Item {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => removeLineItem(index)}
                        disabled={lineItems.length <= 1}
                        data-testid={`button-remove-line-${index}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Product / Service Name</Label>
                      <Input
                        placeholder="e.g. Website Design, Consultation, Logo Package"
                        value={item.name || ""}
                        onChange={e => updateLineItem(index, "name", e.target.value)}
                        data-testid={`input-line-name-${index}`}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs">Description</Label>
                      <Input
                        placeholder="Additional details about this item"
                        value={item.description}
                        onChange={e => updateLineItem(index, "description", e.target.value)}
                        data-testid={`input-line-desc-${index}`}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          placeholder="1"
                          value={item.quantity || ""}
                          onChange={e => updateLineItem(index, "quantity", e.target.value)}
                          data-testid={`input-line-qty-${index}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Unit Cost ({currency === "GBP" ? "£" : currency === "EUR" ? "€" : "$"})</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="0.00"
                          value={item.rate || ""}
                          onChange={e => updateLineItem(index, "rate", e.target.value)}
                          data-testid={`input-line-rate-${index}`}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs">Amount</Label>
                        <div className="h-9 px-3 flex items-center rounded-md bg-muted text-sm font-medium tabular-nums" data-testid={`text-line-amount-${index}`}>
                          {formatCurrency(item.quantity * item.rate, currency)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addLineItem} className="w-full" data-testid="button-add-line">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product or Service
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Payment terms, thank you note, or additional details..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  data-testid="input-notes"
                />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card>
              <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
                <CardTitle className="text-base font-medium">From</CardTitle>
                <Link href="/settings">
                  <span className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 cursor-pointer">Edit in Settings</span>
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="fromName">Your Name</Label>
                  <Input id="fromName" value={fromName} onChange={e => setFromName(e.target.value)} placeholder="Your name or business" data-testid="input-from-name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromEmail">Your Email</Label>
                  <Input id="fromEmail" type="email" value={fromEmail} onChange={e => setFromEmail(e.target.value)} placeholder="you@example.com" data-testid="input-from-email" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fromAddress">Your Address</Label>
                  <Textarea id="fromAddress" value={fromAddress} onChange={e => setFromAddress(e.target.value)} placeholder="Business address" rows={2} data-testid="input-from-address" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium">Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger data-testid="select-currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GBP">GBP (£)</SelectItem>
                      <SelectItem value="USD">USD ($)</SelectItem>
                      <SelectItem value="EUR">EUR (€)</SelectItem>
                      <SelectItem value="CAD">CAD ($)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <Label htmlFor="vat-exempt" className="cursor-pointer">VAT Exempt</Label>
                    <Switch
                      id="vat-exempt"
                      checked={vatExempt}
                      onCheckedChange={setVatExempt}
                      data-testid="switch-vat-exempt"
                    />
                  </div>
                  {!vatExempt && (
                    <div className="space-y-2">
                      <Label htmlFor="taxRate" className="text-xs text-muted-foreground">VAT Rate (%)</Label>
                      <Input
                        id="taxRate"
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={taxRate || ""}
                        onChange={e => setTaxRate(Number(e.target.value) || 0)}
                        data-testid="input-tax-rate"
                      />
                    </div>
                  )}
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium tabular-nums" data-testid="text-subtotal">
                      {formatCurrency(subtotal, currency)}
                    </span>
                  </div>
                  {effectiveTaxRate > 0 && (
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">VAT ({effectiveTaxRate}%)</span>
                      <span className="font-medium tabular-nums" data-testid="text-tax">
                        {formatCurrency(taxAmount, currency)}
                      </span>
                    </div>
                  )}
                  {vatExempt && (
                    <div className="flex justify-between gap-2 text-xs">
                      <span className="text-muted-foreground italic">VAT exempt</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between gap-2 text-base">
                    <span className="font-semibold">Total</span>
                    <span className="font-semibold tabular-nums" data-testid="text-total">
                      {formatCurrency(total, currency)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-save-invoice">
              <Save className="w-4 h-4 mr-2" />
              {mutation.isPending ? "Saving..." : isEdit ? "Update Invoice" : "Create Invoice"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
