import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Upload, Trash2, Save, ImageIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Settings } from "@shared/schema";

export default function SettingsPage() {
  const { data: settings, isLoading } = useQuery<Settings>({
    queryKey: ["/api/settings"],
  });
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [businessName, setBusinessName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [ccEmail1, setCcEmail1] = useState("");
  const [ccEmail2, setCcEmail2] = useState("");
  const [vatNumber, setVatNumber] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountName, setAccountName] = useState("");
  const [sortCode, setSortCode] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [invoicePrefix, setInvoicePrefix] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings) {
      setBusinessName(settings.businessName || "");
      setBusinessEmail(settings.businessEmail || "");
      setBusinessAddress(settings.businessAddress || "");
      setCcEmail1(settings.ccEmail1 || "");
      setCcEmail2(settings.ccEmail2 || "");
      setVatNumber(settings.vatNumber || "");
      setBankName(settings.bankName || "");
      setAccountName(settings.accountName || "");
      setSortCode(settings.sortCode || "");
      setAccountNumber(settings.accountNumber || "");
      setInvoicePrefix(settings.invoicePrefix || "");
    }
  }, [settings]);

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: Record<string, string | null>) => {
      const res = await apiRequest("PUT", "/api/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Settings saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteLogo = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", "/api/settings/logo");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Logo removed" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 2MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("logo", file);
      const res = await fetch("/api/settings/logo", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Upload failed");
      }
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({ title: "Logo uploaded" });
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSaveAll = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettingsMutation.mutate({
      businessName: businessName || null,
      businessEmail: businessEmail || null,
      businessAddress: businessAddress || null,
      ccEmail1: ccEmail1 || null,
      ccEmail2: ccEmail2 || null,
      vatNumber: vatNumber || null,
      bankName: bankName || null,
      accountName: accountName || null,
      sortCode: sortCode || null,
      accountNumber: accountNumber || null,
      invoicePrefix: invoicePrefix.trim().toUpperCase() || null,
    });
  };

  return (
    <div className="p-6 space-y-5 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight" data-testid="text-settings-title">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Customize your business identity</p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Business Logo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-md border-2 border-dashed border-border flex items-center justify-center overflow-hidden bg-muted/30" data-testid="container-logo-preview">
              {settings?.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt="Business logo"
                  className="w-full h-full object-contain"
                  data-testid="img-settings-logo"
                />
              ) : (
                <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
              )}
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                Upload your logo (PNG, JPEG, or WebP, max 2MB)
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  data-testid="input-logo-file"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  data-testid="button-upload-logo"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Uploading..." : "Upload Logo"}
                </Button>
                {settings?.logoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteLogo.mutate()}
                    disabled={deleteLogo.isPending}
                    data-testid="button-remove-logo"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSaveAll} className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Business Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="Your business name"
                data-testid="input-business-name"
              />
              <p className="text-xs text-muted-foreground">Appears in the sidebar and on your invoices</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessEmail">Business Email</Label>
              <Input
                id="businessEmail"
                type="email"
                value={businessEmail}
                onChange={e => setBusinessEmail(e.target.value)}
                placeholder="invoices@yourbusiness.com"
                data-testid="input-business-email"
              />
              <p className="text-xs text-muted-foreground">A copy of every sent invoice goes to this address</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="businessAddress">Business Address</Label>
              <Textarea
                id="businessAddress"
                value={businessAddress}
                onChange={e => setBusinessAddress(e.target.value)}
                placeholder={"123 Example Street\nLondon EC1A 1BB"}
                rows={3}
                data-testid="input-business-address"
              />
              <p className="text-xs text-muted-foreground">Appears on all new invoices in the From section</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ccEmail1">CC Email 1 <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="ccEmail1"
                type="email"
                value={ccEmail1}
                onChange={e => setCcEmail1(e.target.value)}
                placeholder="colleague@example.com"
                data-testid="input-cc-email-1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ccEmail2">CC Email 2 <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                id="ccEmail2"
                type="email"
                value={ccEmail2}
                onChange={e => setCcEmail2(e.target.value)}
                placeholder="accountant@example.com"
                data-testid="input-cc-email-2"
              />
              <p className="text-xs text-muted-foreground">Up to 2 extra people will be CC'd on every sent invoice</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="vatNumber">VAT Number</Label>
              <Input
                id="vatNumber"
                value={vatNumber}
                onChange={e => setVatNumber(e.target.value)}
                placeholder="e.g. GB 123 4567 89"
                data-testid="input-vat-number"
              />
              <p className="text-xs text-muted-foreground">Displayed at the bottom of your invoices</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoicePrefix">Invoice Number Prefix</Label>
              <Input
                id="invoicePrefix"
                value={invoicePrefix}
                onChange={e => setInvoicePrefix(e.target.value.toUpperCase())}
                placeholder="e.g. INV or BFS"
                maxLength={10}
                data-testid="input-invoice-prefix"
              />
              <p className="text-xs text-muted-foreground">New invoices will be numbered {(invoicePrefix.trim() || "INV").toUpperCase()}-{new Date().getFullYear()}-001, -002, etc.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">These details appear at the bottom of your invoices so clients know where to send payment.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={bankName}
                  onChange={e => setBankName(e.target.value)}
                  placeholder="e.g. Barclays"
                  data-testid="input-bank-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountName">Account Name</Label>
                <Input
                  id="accountName"
                  value={accountName}
                  onChange={e => setAccountName(e.target.value)}
                  placeholder="e.g. Inflo Studio Ltd"
                  data-testid="input-account-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sortCode">Sort Code</Label>
                <Input
                  id="sortCode"
                  value={sortCode}
                  onChange={e => setSortCode(e.target.value)}
                  placeholder="e.g. 20-45-67"
                  data-testid="input-sort-code"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value)}
                  placeholder="e.g. 12345678"
                  data-testid="input-account-number"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={updateSettingsMutation.isPending} data-testid="button-save-settings">
          <Save className="w-4 h-4 mr-2" />
          {updateSettingsMutation.isPending ? "Saving..." : "Save All Settings"}
        </Button>
      </form>
    </div>
  );
}
