import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { NotificationCenter } from "@/components/NotificationCenter";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SearchCommandBar } from "@/components/SearchCommandBar";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { preloadRoutes } from "@/lib/routePreload";

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { profile } = useAuth();
  const location = useLocation();

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '?';

  useEffect(() => {
    const preloadLikelyRoutes = () => {
      preloadRoutes([
        "/dashboard",
        "/leads",
        "/prevenda",
        "/veiculos",
        "/vendas",
        "/pos-venda",
        "/tarefas",
        "/configuracoes",
      ]);
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(preloadLikelyRoutes, { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = globalThis.setTimeout(preloadLikelyRoutes, 600);
    return () => globalThis.clearTimeout(timeoutId);
  }, []);

  return (
    <SidebarProvider>
      <div className="crm-shell-enter bg-app-shell min-h-screen flex w-full">
        <div className="crm-sidebar-enter">
          <AppSidebar />
        </div>
        <div className="crm-panel-enter flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {/* Header — Glass bar */}
          <header className="crm-header-enter h-16 border-b border-white/10 flex items-center justify-between px-6 bg-[rgba(8,14,28,0.58)] backdrop-blur-xl shrink-0">
            <div className="flex items-center gap-3 flex-1">
              <SearchCommandBar />
            </div>
            <div className="flex items-center gap-4">
              <NotificationCenter />
              <div className="h-6 w-px bg-border/50" />
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 ring-2 ring-primary/20">
                  <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.full_name || profile?.email || "Perfil"} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary text-xs font-bold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </header>
          <main className="flex-1 min-h-0 p-6 overflow-hidden bg-radial-glow relative">
            <div key={`${location.pathname}${location.search}`} className="crm-route-enter relative z-10 h-full min-h-0 overflow-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Layout;
