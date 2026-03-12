import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Plus, Search } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Invoice, Client } from "@shared/schema";
import { format } from "date-fns";
import { useState, useMemo, useEffect } from "react";
import { useSearch } from "wouter";

function formatCurrency(amount: number, currency: string = "GBP"): string {
  const locale = currency === "GBP" ? "en-GB" : currency === "EUR" ? "de-DE" : "en-US";
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(amount);
}

export default function Invoices() {
  const searchString = useSearch();
  const { data: invoices, isLoading } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    const params = new URLSearchParams(searchString);
    const status = params.get("status");
    if (status) setStatusFilter(status);
  }, [searchString]);

  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    clients?.forEach(c => map.set(c.id, c));
    return map;
  }, [clients]);

  const filtered = useMemo(() => {
    if (!invoices) return [];
    return invoices.filter(inv => {
      const matchSearch = search === "" ||
        inv.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
        (inv.clientId && clientMap.get(inv.clientId)?.name.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === "all" || inv.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, search, statusFilter, clientMap]);

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-invoices-title">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage and track all your invoices</p>
        </div>
        <Link href="/invoices/new">
          <Button data-testid="button-create-invoice">
            <Plus className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </Link>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="input-search-invoices"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]" data-testid="select-status-filter">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="sent">Sent</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <FileText className="w-12 h-12 text-muted-foreground/30 mb-4" />
              <h3 className="text-base font-medium mb-1">No invoices found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || statusFilter !== "all" ? "Try adjusting your filters" : "Create your first invoice to get started"}
              </p>
              {!search && statusFilter === "all" && (
                <Link href="/invoices/new">
                  <Button size="sm" data-testid="button-create-first">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invoice
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(invoice => {
                  const client = invoice.clientId ? clientMap.get(invoice.clientId) : undefined;
                  return (
                    <TableRow key={invoice.id} className="cursor-pointer" data-testid={`row-invoice-${invoice.id}`}>
                      <TableCell>
                        <Link href={`/invoices/${invoice.id}`}>
                          <span className="font-medium text-primary cursor-pointer" data-testid={`link-invoice-${invoice.id}`}>
                            {invoice.invoiceNumber}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {client?.name || "No client"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={invoice.status} />
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {format(new Date(invoice.issueDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">
                        {format(new Date(invoice.dueDate), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(Number(invoice.total), invoice.currency)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
