import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Upload, Trash2, Save, ImageIcon } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface OrgSettings {
  id: string | null;
  logoUrl: string | null;
  businessName: string | null;
}

export default function SettingsPage() {
  const { data: settings, isLoading } = useQuery<OrgSettings>({
    queryKey: ["/api/settings"],
  });
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [businessName, setBusinessName] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (settings?.businessName) {
      setBusinessName(settings.businessName);
    }
  }, [settings]);

  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest("PUT", "/api/settings", { businessName: name });
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

  const handleSaveName = (e: React.FormEvent) => {
    e.preventDefault();
    updateNameMutation.mutate(businessName);
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium">Business Name</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveName} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="Your business name"
                data-testid="input-business-name"
              />
              <p className="text-xs text-muted-foreground">This appears in the sidebar and on your invoices</p>
            </div>
            <Button type="submit" size="sm" disabled={updateNameMutation.isPending} data-testid="button-save-settings">
              <Save className="w-4 h-4 mr-2" />
              {updateNameMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
