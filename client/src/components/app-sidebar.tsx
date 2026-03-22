import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { FileText, Users, Clock, LayoutDashboard, Plus, Settings } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Invoices", url: "/invoices", icon: FileText },
  { title: "Clients", url: "/clients", icon: Users },
  { title: "Schedules", url: "/schedules", icon: Clock },
  { title: "Settings", url: "/settings", icon: Settings },
];

interface OrgSettings {
  id: string;
  logoUrl: string | null;
  businessName: string | null;
}

export function AppSidebar() {
  const [location] = useLocation();
  const { isMobile, setOpenMobile } = useSidebar();
  const { data: settings } = useQuery<OrgSettings>({
    queryKey: ["/api/settings"],
  });

  const handleNavClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <Link href="/" onClick={handleNavClick}>
          <div className="flex items-center gap-3 cursor-pointer min-w-0" data-testid="link-logo">
            {settings?.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt="Logo"
                className="w-9 h-9 rounded-full object-contain border-2 border-primary/30"
                data-testid="img-sidebar-logo"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center border-2 border-primary/30">
                <span className="text-sm font-bold text-secondary-foreground tracking-tight">IN</span>
              </div>
            )}
            <span className="text-base font-bold tracking-tight uppercase leading-tight min-w-0 break-words">
              {settings?.businessName || "Inflo"}
            </span>
          </div>
        </Link>
      </SidebarHeader>
      <Separator />
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-[10px] tracking-widest font-semibold">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive = location === item.url || (item.url !== "/" && location.startsWith(item.url));
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild data-active={isActive}>
                      <Link href={item.url} onClick={handleNavClick} data-testid={`link-nav-${item.title.toLowerCase()}`}>
                        <item.icon className="w-4 h-4" />
                        <span className="font-medium">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase text-[10px] tracking-widest font-semibold">Quick Actions</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <Link href="/invoices/new" onClick={handleNavClick}>
              <Button className="w-full justify-start gap-2 font-semibold" size="sm" data-testid="button-new-invoice-sidebar">
                <Plus className="w-4 h-4" />
                New Invoice
              </Button>
            </Link>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4">
        <p className="text-[10px] text-muted-foreground text-center uppercase tracking-widest font-medium">Inflo v1.0</p>
      </SidebarFooter>
    </Sidebar>
  );
}
