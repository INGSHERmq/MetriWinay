import {
  BarChart3,
  CalendarClock,
  FileText,
  Home,
  Inbox,
  PlugZap,
  Settings,
  Sparkles,
  LogOut,
  Target
} from "lucide-react";
import Link from "next/link";
import { signOutAction } from "@/app/(auth)/actions";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", icon: Home, section: "dashboard" },
  { label: "Publicaciones", icon: CalendarClock, section: "publicaciones" },
  { label: "Analiticas", icon: BarChart3, section: "analiticas" },
  { label: "Metas", icon: Target, section: "metas" },
  { label: "Reportes", icon: FileText, section: "reportes" },
  { label: "Inbox", icon: Inbox, section: "inbox" },
  { label: "Conexiones", icon: PlugZap, section: "conexiones" },
  { label: "Ajustes", icon: Settings, section: "ajustes" }
];

export function AppShell({
  children,
  organizationName = "Workspace",
  activeSection = "dashboard"
}: {
  children: React.ReactNode;
  organizationName?: string;
  activeSection?: string;
}) {
  return (
    <div className="min-h-screen bg-panel text-ink">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-line bg-white px-4 py-5 lg:block">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="grid size-10 place-items-center rounded-md bg-teal text-white">
            <Sparkles size={20} />
          </div>
          <div>
            <p className="text-base font-semibold leading-tight">MetriWinay</p>
            <p className="text-xs text-muted">Social intelligence</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.label}
              className={cn(
                "flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-medium text-muted transition hover:bg-panel hover:text-ink",
                "aria-[current=page]:bg-ink aria-[current=page]:text-white aria-[current=page]:hover:bg-ink aria-[current=page]:hover:text-white"
              )}
              aria-current={activeSection === item.section ? "page" : undefined}
              href={`/?section=${item.section}`}
              title={item.label}
            >
              <item.icon size={18} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex min-h-16 items-center justify-between border-b border-line bg-white/92 px-4 backdrop-blur md:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal">
              {organizationName}
            </p>
            <h1 className="text-xl font-semibold md:text-2xl">Panel unificado</h1>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/api/oauth/tiktok/authorize"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-black px-3 text-sm font-semibold text-white shadow-soft transition hover:bg-gray-800"
            >
              <PlugZap size={16} />
              TikTok
            </a>
            <a
              href="/api/oauth/meta/authorize"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-coral px-3 text-sm font-semibold text-white shadow-soft transition hover:bg-[#cf594b]"
            >
              <PlugZap size={16} />
              Conectar Meta
            </a>
            <form action={signOutAction}>
              <button
                className="grid size-10 place-items-center rounded-md border border-line text-muted transition hover:bg-panel hover:text-ink"
                title="Cerrar sesion"
                type="submit"
              >
                <LogOut size={17} />
              </button>
            </form>
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 md:px-8">{children}</main>
      </div>
    </div>
  );
}
