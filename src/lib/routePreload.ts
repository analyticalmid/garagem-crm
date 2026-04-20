const routeImporters = {
  "/": () => import("@/views/Login"),
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
} as const;

const preloadedRoutes = new Set<string>();

function normalizeRoute(path: string) {
  const [pathname] = path.split("?");
  if (pathname.startsWith("/leads/")) return "/leads/:id";
  if (pathname.startsWith("/prevenda/")) return "/prevenda/:id";
  if (pathname.startsWith("/veiculos/")) return "/veiculos/:id";
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

export { routeImporters };
