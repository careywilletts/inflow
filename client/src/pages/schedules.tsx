import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Plus, CalendarClock, Pause, Play, Trash2, Pencil } from "lucide-react";
import type { Schedule, Invoice, Client } from "@shared/schema";
import { format } from "date-fns";
import { useState, useMemo } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Schedules() {
  const { data: schedulesData, isLoading } = useQuery<Schedule[]>({ queryKey: ["/api/schedules"] });
  const { data: invoices } = useQuery<Invoice[]>({ queryKey: ["/api/invoices"] });
  const { data: clients } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedFrequency, setSelectedFrequency] = useState("");
  const [nextSendDate, setNextSendDate] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  const [editInvoiceId, setEditInvoiceId] = useState("");
  const [editClientId, setEditClientId] = useState("");
  const [editFrequency, setEditFrequency] = useState("");
  const [editNextDate, setEditNextDate] = useState("");

  const invoiceMap = useMemo(() => {
    const map = new Map<string, Invoice>();
    invoices?.forEach(i => map.set(i.id, i));
    return map;
  }, [invoices]);

  const clientMap = useMemo(() => {
    const map = new Map<string, Client>();
    clients?.forEach(c => map.set(c.id, c));
    return map;
  }, [clients]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/schedules", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setOpen(false);
      setSelectedInvoiceId("");
      setSelectedClientId("");
      setSelectedFrequency("");
      setNextSendDate("");
      toast({ title: "Schedule created", description: "Invoice will be sent automatically." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/schedules/${id}`, { isActive });
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: vars.isActive ? "Schedule resumed" : "Schedule paused" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/schedules/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      toast({ title: "Schedule deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/schedules/${editingSchedule!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
      setEditOpen(false);
      setEditingSchedule(null);
      toast({ title: "Schedule updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setEditInvoiceId(schedule.invoiceId || "");
    setEditClientId(schedule.clientId || "");
    setEditFrequency(schedule.frequency);
    setEditNextDate(format(new Date(schedule.nextSendDate), "yyyy-MM-dd"));
    setEditOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editInvoiceId || !editClientId || !editFrequency || !editNextDate) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    editMutation.mutate({
      invoiceId: editInvoiceId,
      clientId: editClientId,
      frequency: editFrequency,
      nextSendDate: new Date(editNextDate).toISOString(),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId || !selectedClientId || !selectedFrequency || !nextSendDate) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      invoiceId: selectedInvoiceId,
      clientId: selectedClientId,
      frequency: selectedFrequency,
      nextSendDate: new Date(nextSendDate).toISOString(),
      isActive: true,
    });
  };

  const frequencyLabel = (f: string) => {
    switch (f) {
      case "weekly": return "Weekly";
      case "monthly": return "Monthly";
      case "quarterly": return "Quarterly";
      case "yearly": return "Yearly";
      default: return f;
    }
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-schedules-title">Schedules</h1>
          <p className="text-sm text-muted-foreground mt-1">Automate your recurring invoices</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-schedule">
              <Plus className="w-4 h-4 mr-2" />
              New Schedule
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Create Schedule</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Invoice Template *</Label>
                <Select value={selectedInvoiceId} onValueChange={setSelectedInvoiceId}>
                  <SelectTrigger data-testid="select-schedule-invoice">
                    <SelectValue placeholder="Select an invoice" />
                  </SelectTrigger>
                  <SelectContent>
                    {invoices?.map(inv => (
                      <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger data-testid="select-schedule-client">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients?.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequency *</Label>
                <Select value={selectedFrequency} onValueChange={setSelectedFrequency}>
                  <SelectTrigger data-testid="select-schedule-frequency">
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Next Send Date *</Label>
                <Input
                  type="date"
                  value={nextSendDate}
                  onChange={e => setNextSendDate(e.target.value)}
                  data-testid="input-schedule-date"
                />
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="outline" data-testid="button-cancel-schedule">Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={createMutation.isPending} data-testid="button-save-schedule">
                  {createMutation.isPending ? "Creating..." : "Create Schedule"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-md" />)}
        </div>
      ) : !schedulesData || schedulesData.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <CalendarClock className="w-12 h-12 text-muted-foreground/30 mb-4" />
          <h3 className="text-base font-medium mb-1">No schedules yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Set up automated invoicing for recurring clients</p>
        </div>
      ) : (
        <div className="space-y-3">
          {schedulesData.map(schedule => {
            const inv = schedule.invoiceId ? invoiceMap.get(schedule.invoiceId) : undefined;
            const cl = schedule.clientId ? clientMap.get(schedule.clientId) : undefined;
            return (
              <Card key={schedule.id} className="hover-elevate" data-testid={`card-schedule-${schedule.id}`}>
                <CardContent className="p-5">
                  <div className="flex items-start sm:items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className={`w-10 h-10 rounded-md flex items-center justify-center shrink-0 ${
                        schedule.isActive ? "bg-primary/10" : "bg-muted"
                      }`}>
                        {schedule.isActive
                          ? <Play className="w-4 h-4 text-primary" />
                          : <Pause className="w-4 h-4 text-muted-foreground" />
                        }
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium" data-testid={`text-schedule-invoice-${schedule.id}`}>
                            {inv?.invoiceNumber || "Unknown Invoice"}
                          </p>
                          <Badge variant={schedule.isActive ? "default" : "secondary"} className="text-xs">
                            {schedule.isActive ? "Active" : "Paused"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {cl?.name || "Unknown Client"} &middot; {frequencyLabel(schedule.frequency)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Next Send</p>
                        <p className="text-sm font-medium tabular-nums">
                          {format(new Date(schedule.nextSendDate), "MMM d, yyyy")}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => openEdit(schedule)}
                        data-testid={`button-edit-schedule-${schedule.id}`}
                        title="Edit schedule"
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5"
                        onClick={() => toggleMutation.mutate({ id: schedule.id, isActive: !schedule.isActive })}
                        disabled={toggleMutation.isPending}
                        data-testid={`button-toggle-schedule-${schedule.id}`}
                      >
                        {schedule.isActive
                          ? <><Pause className="w-3.5 h-3.5" /> Pause</>
                          : <><Play className="w-3.5 h-3.5" /> Resume</>
                        }
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(schedule.id)}
                        disabled={deleteMutation.isPending}
                        data-testid={`button-delete-schedule-${schedule.id}`}
                        title="Delete schedule"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Schedule</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Invoice Template *</Label>
              <Select value={editInvoiceId} onValueChange={setEditInvoiceId}>
                <SelectTrigger data-testid="select-edit-invoice">
                  <SelectValue placeholder="Select an invoice" />
                </SelectTrigger>
                <SelectContent>
                  {invoices?.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>{inv.invoiceNumber}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select value={editClientId} onValueChange={setEditClientId}>
                <SelectTrigger data-testid="select-edit-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequency *</Label>
              <Select value={editFrequency} onValueChange={setEditFrequency}>
                <SelectTrigger data-testid="select-edit-frequency">
                  <SelectValue placeholder="Select frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Next Send Date *</Label>
              <Input
                type="date"
                value={editNextDate}
                onChange={e => setEditNextDate(e.target.value)}
                data-testid="input-edit-date"
              />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline" data-testid="button-cancel-edit-schedule">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={editMutation.isPending} data-testid="button-save-edit-schedule">
                {editMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
