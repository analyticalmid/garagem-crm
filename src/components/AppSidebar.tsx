import { LayoutDashboard, Target, LogOut, Car, DollarSign, FileDown, CheckSquare, ShoppingBag, TrendingUp, Settings2, Repeat2, KeyRound } from "lucide-react";
import { MouseEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { preloadRoute, prefetchRouteData } from "@/lib/routePreload";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { UpgradePlanModal } from "@/components/UpgradePlanModal";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarSeparator,
} from "@/components/ui/sidebar";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function PosVendaCycleIcon({ className }: { className?: string }) {
  return (
    <span className={cn("relative inline-flex h-[18px] w-[18px] items-center justify-center", className)}>
      <Repeat2 className="h-[18px] w-[18px]" strokeWidth={1.9} />
      <KeyRound className="absolute -bottom-[2px] -right-[3px] h-[10px] w-[10px] rounded-full bg-[hsl(var(--sidebar-background))] p-[1px]" strokeWidth={2.2} />
    </span>
  );
}

const baseNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Leads", href: "/leads", icon: Target },
  { name: "Prospeção", href: "/prevenda", icon: ShoppingBag },
  { name: "Veículos", href: "/veiculos", icon: Car },
  { name: "Vendas", href: "/vendas", icon: DollarSign },
  { name: "Pós-Venda", href: "/pos-venda", icon: PosVendaCycleIcon },
  { name: "Margem", href: "/margens", icon: TrendingUp },
  { name: "Tarefas", href: "/tarefas", icon: CheckSquare },
  { name: "WhatsApp", href: "/whatsapp", icon: WhatsAppIcon },
  { name: "Exportar", href: "/exportar", icon: FileDown },
  { name: "Configurações", href: "/configuracoes", icon: Settings2 },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut, profile, user, canViewAllLeads, isPro } = useAuth();
  const queryClient = useQueryClient();
  const [upgradeFeature, setUpgradeFeature] = useState<string | null>(null);

  const restrictedProRoutes: Record<string, string> = {
    "/prevenda": "Prospecção",
    "/pos-venda": "Pós-Venda",
  };

  const handleNavHover = (href: string) => {
    if (isPro && restrictedProRoutes[href]) return;

    preloadRoute(href);
    if (user?.id) {
      prefetchRouteData(href, { queryClient, userId: user.id, canViewAllLeads: !!canViewAllLeads });
    }
  };

  const handleNavClick = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (isPro && restrictedProRoutes[href]) {
      event.preventDefault();
      setUpgradeFeature(restrictedProRoutes[href]);
      return;
    }

    handleNavHover(href);
  };

  const handleLogout = async () => {
    await signOut();
    toast({
      title: "Logout realizado",
      description: "Até logo!"
    });
    navigate("/");
  };

  const navigation = baseNavigation;

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : profile?.email?.[0]?.toUpperCase() || '?';

  return (
    <>
    <Sidebar collapsible="none" className="border-r border-border/30">
      {/* Header — Logo */}
      <SidebarHeader className="h-16 border-b border-border/30 shrink-0">
        <div className="h-full w-full flex items-center justify-start gap-3 pl-3 pr-4">
          <img
            src="/logo-garagem.svg"
            alt="Garagem CRM"
            className="h-11 w-11 rounded-[14px] object-contain object-center shrink-0 shadow-[0_12px_28px_rgba(37,99,235,0.18)]"
          />
          <div className="flex h-full items-center">
            <span className="text-center font-bold text-base text-sidebar-foreground tracking-tight leading-tight">
              Garagem CRM
            </span>
          </div>
        </div>
      </SidebarHeader>

      {/* Navigation */}
      <SidebarContent className="px-3 py-4">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton asChild tooltip={item.name}>
                    <NavLink
                      to={item.href}
                      end
                      onMouseEnter={() => handleNavHover(item.href)}
                      onFocus={() => handleNavHover(item.href)}
                      onMouseDown={() => handleNavHover(item.href)}
                      onClick={(event) => handleNavClick(event, item.href)}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sidebar-muted transition-all duration-200 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground group"
                      activeClassName="!bg-primary/15 !text-primary glow-blue-sm"
                    >
                      <item.icon className="h-[18px] w-[18px] shrink-0 transition-colors" />
                      <span className="text-sm font-medium">{item.name}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — User + Logout */}
      <SidebarFooter className="border-t border-border/30 p-3">
        {profile && (
          <div className="flex items-center gap-3 px-2 mb-3 group-data-[state=collapsed]:hidden">
            <Avatar className="h-9 w-9 shrink-0 ring-2 ring-primary/20">
              <AvatarImage src={profile.avatar_url || undefined} alt={profile.full_name || profile.email || "Perfil"} />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {profile.full_name || profile.email}
              </p>
              <p className="text-[10px] text-sidebar-muted truncate">
                {profile.email}
              </p>
            </div>
          </div>
        )}
        <SidebarSeparator className="mb-2 group-data-[state=collapsed]:hidden opacity-30" />
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={handleLogout}
              tooltip="Sair"
              className="text-sidebar-muted hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all duration-200"
            >
              <LogOut className="h-4 w-4" />
              <span className="text-sm">Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
    <UpgradePlanModal
      open={Boolean(upgradeFeature)}
      featureName={upgradeFeature || undefined}
      onOpenChange={(open) => {
        if (!open) setUpgradeFeature(null);
      }}
    />
    </>
  );
}
