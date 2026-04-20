import { LayoutDashboard, Target, LogOut, Car, DollarSign, FileDown, CheckSquare, ShoppingBag, TrendingUp, Settings2, Repeat2, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { preloadRoute } from "@/lib/routePreload";
import { cn } from "@/lib/utils";
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
  { name: "Exportar", href: "/exportar", icon: FileDown },
  { name: "Configurações", href: "/configuracoes", icon: Settings2 },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut, isAdmin, profile } = useAuth();

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
                      onMouseEnter={() => preloadRoute(item.href)}
                      onFocus={() => preloadRoute(item.href)}
                      onMouseDown={() => preloadRoute(item.href)}
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
  );
}
