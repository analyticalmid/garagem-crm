import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Layout from "./components/Layout";
import { Loader2 } from "lucide-react";
import NotFound from "./views/NotFound";
import { routeImporters } from "@/lib/routePreload";

const Login = lazy(routeImporters["/"]);
const Dashboard = lazy(routeImporters["/dashboard"]);
const Leads = lazy(routeImporters["/leads"]);
const LeadDetail = lazy(routeImporters["/leads/:id"]);
const PrevendaLeads = lazy(routeImporters["/prevenda"]);
const PrevendaLeadDetail = lazy(routeImporters["/prevenda/:id"]);
const Usuarios = lazy(routeImporters["/usuarios"]);
const Vehicles = lazy(routeImporters["/veiculos"]);
const VehicleDetail = lazy(routeImporters["/veiculos/:id"]);
const Vendas = lazy(routeImporters["/vendas"]);
const PosVenda = lazy(routeImporters["/pos-venda"]);
const Tarefas = lazy(routeImporters["/tarefas"]);
const Exportar = lazy(routeImporters["/exportar"]);
const Margens = lazy(routeImporters["/margens"]);
const Configuracoes = lazy(routeImporters["/configuracoes"]);

const queryClient = new QueryClient();

function PageLoader() {
  return (
    <div className="crm-loader-enter flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="crm-loader-orb flex h-14 w-14 items-center justify-center rounded-full border border-primary/20 bg-primary/10 text-primary shadow-[0_0_40px_rgba(37,99,235,0.18)]">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </div>
        <p className="text-sm font-medium tracking-[0.18em] text-primary/80 uppercase">Carregando CRM</p>
      </div>
    </div>
  );
}

function SuspendedPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageLoader />}>{children}</Suspense>;
}

function App() {
  return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <SuspendedPage>
            <Routes>
              <Route path="/" element={<Login />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Layout><Dashboard /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/leads" element={
              <ProtectedRoute>
                <Layout><Leads /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/leads/:id" element={
              <ProtectedRoute>
                <Layout><LeadDetail /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/prevenda" element={
              <ProtectedRoute>
                <Layout><PrevendaLeads /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/prevenda/:id" element={
              <ProtectedRoute>
                <Layout><PrevendaLeadDetail /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/veiculos" element={
              <ProtectedRoute>
                <Layout><Vehicles /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/veiculos/:id" element={
              <ProtectedRoute>
                <Layout><VehicleDetail /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/vendas" element={
              <ProtectedRoute>
                <Layout><Vendas /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/pos-venda" element={
              <ProtectedRoute>
                <Layout><PosVenda /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/tarefas" element={
              <ProtectedRoute>
                <Layout><Tarefas /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/exportar" element={
              <ProtectedRoute requiredRoles={["admin", "gerente"]}>
                <Layout><Exportar /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/margens" element={
              <ProtectedRoute requiredRoles={["admin", "gerente"]}>
                <Layout><Margens /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/configuracoes" element={
              <ProtectedRoute>
                <Layout><Configuracoes /></Layout>
              </ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute requiredRoles={["admin"]}>
                <Usuarios />
              </ProtectedRoute>
            } />
            <Route path="/config" element={<Navigate to="/configuracoes" replace />} />
            <Route path="*" element={<NotFound />} />
            </Routes>
          </SuspendedPage>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  );
}

export default App;
