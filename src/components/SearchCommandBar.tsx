import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command";
import { preloadRoute } from "@/lib/routePreload";

const ROUTES = [
  { label: "Dashboard", keywords: ["dashboard", "inicio", "início"], path: "/dashboard" },
  { label: "Leads", keywords: ["leads", "lead"], path: "/leads" },
  { label: "Prospeção", keywords: ["prospeccao", "prospecção", "pré-venda", "prevenda", "pre-venda", "pre venda"], path: "/prevenda" },
  { label: "Veículos", keywords: ["veículos", "veiculos", "veiculo", "veículo", "carro", "carros"], path: "/veiculos" },
  { label: "Vendas", keywords: ["vendas", "venda"], path: "/vendas" },
  { label: "Margem", keywords: ["financeiro", "margens", "margem"], path: "/margens" },
  { label: "Tarefas", keywords: ["tarefas", "tarefa"], path: "/tarefas" },
  { label: "Exportar", keywords: ["exportar", "export"], path: "/exportar" },
  { label: "Configurações", keywords: ["config", "configuracoes", "configurações", "ajustes"], path: "/configuracoes" },
  { label: "Usuários", keywords: ["usuários", "usuarios", "usuario", "usuário"], path: "/configuracoes?aba=usuarios" },
];

const QUICK_ACTIONS = [
  { label: "Ir para Dashboard", path: "/dashboard" },
  { label: "Ir para Leads", path: "/leads" },
  { label: "Ir para Veículos", path: "/veiculos" },
  { label: "Ir para Vendas", path: "/vendas" },
  { label: "Novo Lead", path: "/leads" },
];

function looksLikePhone(term: string): boolean {
  const digits = term.replace(/\D/g, "");
  return digits.length >= 4 || /[+(]/.test(term);
}

export function SearchCommandBar() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  // Ctrl+K / Cmd+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = useCallback(
    (path: string) => {
      preloadRoute(path);
      setOpen(false);
      setSearch("");
      navigate(path);
    },
    [navigate]
  );

  const handleHeaderEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    const term = (e.target as HTMLInputElement).value.trim();
    if (!term) {
      setOpen(true);
      return;
    }

    // Check route match first
    const lower = term.toLowerCase();
    const routeMatch = ROUTES.find((r) =>
      r.keywords.some((k) => k.includes(lower) || lower.includes(k))
    );
    if (routeMatch) {
      navigate(routeMatch.path);
      return;
    }

    // Intent detection
    if (looksLikePhone(term)) {
      navigate(`/leads?search=${encodeURIComponent(term)}`);
    } else {
      navigate(`/veiculos?search=${encodeURIComponent(term)}`);
    }
  };

  const handleSelect = (path: string) => go(path);

  const trimmed = search.trim().toLowerCase();

  const matchedRoutes = trimmed
    ? ROUTES.filter((r) =>
        r.keywords.some((k) => k.includes(trimmed) || trimmed.includes(k)) ||
        r.label.toLowerCase().includes(trimmed)
      )
    : [];

  return (
    <>
      {/* Inline header input */}
      <div className="relative flex items-center w-full max-w-2xl">
        <Search className="absolute left-3 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar leads, veículos, vendas, tarefas…"
          className="w-full h-10 pl-9 pr-16 text-sm bg-white/[0.03] border border-white/[0.06] rounded-xl outline-none placeholder:text-muted-foreground/60 text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all backdrop-blur-sm"
          onKeyDown={handleHeaderEnter}
          onClick={() => setOpen(true)}
          readOnly
        />
        <kbd className="absolute right-3 pointer-events-none hidden sm:inline-flex h-5 items-center gap-0.5 rounded-md border border-white/[0.08] bg-white/[0.03] px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          ⌘K
        </kbd>
      </div>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Buscar leads, veículos, vendas, tarefas…"
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>

          {!trimmed && (
            <CommandGroup heading="Ações rápidas">
              {QUICK_ACTIONS.map((action) => (
                <CommandItem
                  key={action.label}
                  onMouseEnter={() => preloadRoute(action.path)}
                  onSelect={() => handleSelect(action.path)}
                >
                  {action.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {trimmed && matchedRoutes.length > 0 && (
            <CommandGroup heading="Navegar">
              {matchedRoutes.map((route) => (
                <CommandItem
                  key={route.path}
                  onMouseEnter={() => preloadRoute(route.path)}
                  onSelect={() => handleSelect(route.path)}
                >
                  Ir para {route.label}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {trimmed && (
            <CommandGroup heading="Buscar em…">
              <CommandItem
                onSelect={() =>
                  go(`/leads?search=${encodeURIComponent(search.trim())}`)
                }
              >
                Buscar "{search.trim()}" em Leads
              </CommandItem>
              <CommandItem
                onSelect={() =>
                  go(`/veiculos?search=${encodeURIComponent(search.trim())}`)
                }
              >
                Buscar "{search.trim()}" em Veículos
              </CommandItem>
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
