import type { QueryClient } from "@tanstack/react-query";
import { apiFetch, dataUrl } from "@/lib/api";

const routeImporters = {
  "/": () => import("@/views/Login"),
  "/checkout/:plan": () => import("@/views/Checkout"),
  "/checkout/sucesso": () => import("@/views/CheckoutSuccess"),
  "/redefinir-senha": () => import("@/views/ResetPassword"),
  "/dashboard": () => import("@/views/Dashboard"),
  "/leads": () => import("@/views/Leads"),
  "/leads/:id": () => import("@/views/LeadDetail"),
  "/prevenda": () => import("@/views/PrevendaLeads"),
  "/prevenda/:id": () => import("@/views/PrevendaLeadDetail"),
  "/veiculos": () => import("@/views/Vehicles"),
  "/veiculos/:id": () => import("@/views/VehicleDetail"),
  "/vendas": () => import("@/views/Vendas"),
  "/pos-venda": () => import("@/views/PosVenda"),
  "/tarefas": () => import("@/views/Tarefas"),
  "/exportar": () => import("@/views/Exportar"),
  "/margens": () => import("@/views/Margens"),
  "/configuracoes": () => import("@/views/Configuracoes"),
  "/usuarios": () => import("@/views/Usuarios"),
  "/whatsapp": () => import("@/views/Whatsapp"),
} as const;

const preloadedRoutes = new Set<string>();

function normalizeRoute(path: string) {
  const [pathname] = path.split("?");
  if (pathname.startsWith("/leads/")) return "/leads/:id";
  if (pathname.startsWith("/prevenda/")) return "/prevenda/:id";
  if (pathname.startsWith("/veiculos/")) return "/veiculos/:id";
  if (pathname.startsWith("/checkout/") && pathname !== "/checkout/sucesso") return "/checkout/:plan";
  return pathname;
}

export function preloadRoute(path: string) {
  const normalizedPath = normalizeRoute(path);
  if (preloadedRoutes.has(normalizedPath)) {
    return;
  }

  const importer = routeImporters[normalizedPath as keyof typeof routeImporters];
  if (!importer) {
    return;
  }

  preloadedRoutes.add(normalizedPath);
  void importer();
}

export function preloadRoutes(paths: string[]) {
  paths.forEach(preloadRoute);
}

type PrefetchContext = {
  queryClient: QueryClient;
  userId: string;
  canViewAllLeads: boolean;
};

const prefetchedQueries = new Set<string>();

export function prefetchRouteData(path: string, ctx: PrefetchContext) {
  const { queryClient, userId, canViewAllLeads } = ctx;
  const staleTime = 30 * 1000;
  const prefetch = <T,>(queryKey: readonly unknown[], queryFn: () => Promise<T>) =>
    queryClient.prefetchQuery({
      queryKey: [...queryKey],
      queryFn,
      staleTime,
    });

  switch (path) {
    case "/dashboard": {
      const key = "dashboard";
      if (prefetchedQueries.has(key)) return;
      prefetchedQueries.add(key);
      void prefetch(["dashboard"], () => apiFetch(dataUrl("dashboard")));
      break;
    }
    case "/leads": {
      const key = `leads-kanban-${userId}-${canViewAllLeads}`;
      if (prefetchedQueries.has(key)) return;
      prefetchedQueries.add(key);
      void prefetch(["leads-kanban", userId, canViewAllLeads], () => apiFetch(dataUrl("leads-kanban")));
      break;
    }
    case "/prevenda": {
      const key = "prevenda-leads";
      if (prefetchedQueries.has(key)) return;
      prefetchedQueries.add(key);
      void prefetch(["prevenda-leads"], () => apiFetch(dataUrl("prevenda-leads")));
      void prefetch(["profiles"], () => apiFetch(dataUrl("profiles-active")));
      break;
    }
    case "/veiculos": {
      const key = "vehicles-ativos";
      if (prefetchedQueries.has(key)) return;
      prefetchedQueries.add(key);
      void prefetch(["vehicles-ativos"], () => apiFetch(dataUrl("vehicles-active")));
      break;
    }
    case "/vendas": {
      const key = "sales-page";
      if (prefetchedQueries.has(key)) return;
      prefetchedQueries.add(key);
      void prefetch(["sales-page"], () => apiFetch(dataUrl("sales-page")));
      break;
    }
    case "/pos-venda": {
      const key = `pos-venda-cards-${userId}-${canViewAllLeads}`;
      if (prefetchedQueries.has(key)) return;
      prefetchedQueries.add(key);
      void prefetch(["pos-venda-cards", userId, canViewAllLeads], () => apiFetch(dataUrl("pos-venda-cards")));
      break;
    }
    case "/tarefas": {
      const key = "tasks";
      if (prefetchedQueries.has(key)) return;
      prefetchedQueries.add(key);
      void prefetch(["tasks"], () => apiFetch(dataUrl("tasks")));
      break;
    }
    case "/margens": {
      const key = "margens-data";
      if (prefetchedQueries.has(key)) return;
      prefetchedQueries.add(key);
      void prefetch(["margens-data"], () => apiFetch(dataUrl("margens")));
      break;
    }
    case "/exportar": {
      const key = "export-data";
      if (prefetchedQueries.has(key)) return;
      prefetchedQueries.add(key);
      void prefetch(["export-data"], () => apiFetch(dataUrl("export-data")));
      break;
    }
    case "/configuracoes": {
      const key = "notification-preferences";
      if (prefetchedQueries.has(key)) return;
      prefetchedQueries.add(key);
      void prefetch(["notification-preferences", userId], () => apiFetch(dataUrl("notification-preferences")));
      void prefetch(["notifications", userId], () => apiFetch(dataUrl("notifications")));
      break;
    }
  }
}

export { routeImporters };
