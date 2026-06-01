import {
  Activity,
  DollarSign,
  Eye,
  HeartHandshake,
  ListChecks,
  Megaphone,
  MousePointerClick,
  Percent,
  PlayCircle,
  Target,
  Users
} from "lucide-react";
import { redirect } from "next/navigation";
import { AccountCard } from "@/components/account-card";
import { AnalyticsChart } from "@/components/analytics-chart";
import { AppShell } from "@/components/app-shell";
import { MetricCard } from "@/components/metric-card";
import { PostComposer } from "@/components/post-composer";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatCurrency, formatPercent } from "@/lib/utils";
import { ensureDefaultOrganization } from "@/modules/workspace/onboarding";
import { getWorkspaceData, type WorkspaceData } from "@/modules/workspace/queries";

const validSections = new Set([
  "dashboard",
  "publicaciones",
  "analiticas",
  "reportes",
  "inbox",
  "conexiones",
  "ajustes"
]);

export default async function Home({
  searchParams
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await ensureDefaultOrganization({ userId: user.id, email: user.email });
  const workspace = await getWorkspaceData();
  const { section } = await searchParams;
  const activeSection = section && validSections.has(section) ? section : "dashboard";

  return (
    <AppShell activeSection={activeSection} organizationName={workspace.organizationName}>
      {activeSection === "dashboard" ? <DashboardView workspace={workspace} /> : null}
      {activeSection === "publicaciones" ? (
        <PublishingView workspace={workspace} />
      ) : null}
      {activeSection === "analiticas" ? <AnalyticsView workspace={workspace} /> : null}
      {activeSection === "reportes" ? <ReportsView workspace={workspace} /> : null}
      {activeSection === "inbox" ? <InboxView /> : null}
      {activeSection === "conexiones" ? <ConnectionsView workspace={workspace} /> : null}
      {activeSection === "ajustes" ? <SettingsView workspace={workspace} /> : null}
    </AppShell>
  );
}

function DashboardView({ workspace }: { workspace: WorkspaceData }) {
  return (
      <div className="space-y-6">
        <section className="metric-grid gap-4">
          <MetricCard
            label="Alcance"
            value={workspace.metrics.reach}
            change="real"
            icon={Eye}
            tone="teal"
          />
          <MetricCard
            label="Engagement"
            value={workspace.metrics.engagement}
            change="real"
            icon={HeartHandshake}
            tone="coral"
          />
          <MetricCard
            label="Seguidores"
            value={workspace.metrics.followers}
            change="real"
            icon={Users}
            tone="gold"
          />
          <MetricCard
            label="Posts activos"
            value={workspace.metrics.posts}
            change="real"
            icon={Activity}
            tone="ink"
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
          <AnalyticsChart data={workspace.chart} />
          <PostComposer
            accounts={workspace.accounts}
            organizationId={workspace.organizationId}
          />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <div className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Cuentas conectadas</h2>
                <p className="text-sm text-muted">OAuth2, tokens cifrados y refresh automatico.</p>
              </div>
            </div>
            <div className="space-y-3">
              {workspace.accounts.length === 0 ? (
                <div className="rounded-md border border-dashed border-line bg-panel p-4 text-sm text-muted">
                  Aun no hay cuentas conectadas. Usa Conectar Meta para importar tus paginas e Instagram Business.
                </div>
              ) : null}
              {workspace.accounts.map((account) => (
                <AccountCard key={account.id} account={account} />
              ))}
            </div>
          </div>

          <div className="rounded-md border border-line bg-white p-5 shadow-soft">
            <div className="mb-4">
              <h2 className="text-base font-semibold">Cola de publicaciones</h2>
              <p className="text-sm text-muted">Jobs priorizados por fecha, red y limite de API.</p>
            </div>
            <div className="space-y-3">
              {workspace.queue.length === 0 ? (
                <div className="rounded-md border border-dashed border-line bg-panel p-4 text-sm text-muted">
                  No hay publicaciones programadas todavia.
                </div>
              ) : null}
              {workspace.queue.map((item) => (
                <article
                  key={item.id}
                  className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-line p-4"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{item.title}</p>
                    <p className="text-xs text-muted">{item.date}</p>
                  </div>
                  <span className="self-start rounded-md bg-panel px-2 py-1 text-xs font-semibold text-ink">
                    {item.status}
                  </span>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
  );
}

function PublishingView({ workspace }: { workspace: WorkspaceData }) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1fr]">
      <PostComposer accounts={workspace.accounts} organizationId={workspace.organizationId} />
      <QueuePanel workspace={workspace} />
    </div>
  );
}

function AnalyticsView({ workspace }: { workspace: WorkspaceData }) {
  return (
    <div className="space-y-6">
      <section className="metric-grid gap-4">
        <MetricCard label="Alcance" value={workspace.metrics.reach} change="real" icon={Eye} tone="teal" />
        <MetricCard
          label="Engagement"
          value={workspace.metrics.engagement}
          change="real"
          icon={HeartHandshake}
          tone="coral"
        />
        <MetricCard label="Seguidores" value={workspace.metrics.followers} change="real" icon={Users} tone="gold" />
      </section>
      <section className="metric-grid gap-4">
        <MetricCard
          label="Alcance ads"
          value={workspace.adMetrics.reach}
          change="ads"
          icon={Eye}
          tone="teal"
        />
        <MetricCard
          label="Impresiones"
          value={workspace.adMetrics.impressions}
          change="ads"
          icon={Megaphone}
          tone="teal"
        />
        <MetricCard
          label="Gasto"
          value={workspace.adMetrics.spend}
          valueLabel={formatCurrency(workspace.adMetrics.spend, workspace.adMetrics.currency)}
          change="ads"
          icon={DollarSign}
          tone="coral"
        />
        <MetricCard
          label="Clicks"
          value={workspace.adMetrics.clicks}
          change="ads"
          icon={MousePointerClick}
          tone="gold"
        />
        <MetricCard
          label="CTR"
          value={workspace.adMetrics.ctr}
          valueLabel={formatPercent(workspace.adMetrics.ctr)}
          change="ads"
          icon={Percent}
          tone="ink"
        />
        <MetricCard
          label="CPC"
          value={workspace.adMetrics.cpc}
          valueLabel={formatCurrency(workspace.adMetrics.cpc, workspace.adMetrics.currency)}
          change="ads"
          icon={DollarSign}
          tone="teal"
        />
        <MetricCard
          label="CPM"
          value={workspace.adMetrics.cpm}
          valueLabel={formatCurrency(workspace.adMetrics.cpm, workspace.adMetrics.currency)}
          change="ads"
          icon={DollarSign}
          tone="coral"
        />
        <MetricCard
          label="Resultados"
          value={workspace.adMetrics.actions}
          change="ads"
          icon={ListChecks}
          tone="gold"
        />
        <MetricCard
          label="Costo por ThruPlay"
          value={workspace.adMetrics.costPerThruPlay}
          valueLabel={formatCurrency(workspace.adMetrics.costPerThruPlay, workspace.adMetrics.currency)}
          change="ads"
          icon={PlayCircle}
          tone="ink"
        />
        <MetricCard
          label="Costo por resultado"
          value={workspace.adMetrics.costPerResult}
          valueLabel={formatCurrency(workspace.adMetrics.costPerResult, workspace.adMetrics.currency)}
          change="ads"
          icon={Target}
          tone="teal"
        />
      </section>
      <AnalyticsChart data={workspace.chart} />
    </div>
  );
}

function ReportsView({ workspace }: { workspace: WorkspaceData }) {
  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <h2 className="text-base font-semibold">Reportes</h2>
      <p className="mt-1 text-sm text-muted">
        Resumen actual listo para exportar cuando agreguemos PDF/CSV.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <MetricCard label="Alcance" value={workspace.metrics.reach} change="real" icon={Eye} tone="teal" />
        <MetricCard label="Engagement" value={workspace.metrics.engagement} change="real" icon={HeartHandshake} tone="coral" />
        <MetricCard label="Seguidores" value={workspace.metrics.followers} change="real" icon={Users} tone="gold" />
      </div>
    </section>
  );
}

function InboxView() {
  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <h2 className="text-base font-semibold">Inbox</h2>
      <p className="mt-1 text-sm text-muted">
        Bandeja preparada para comentarios y mensajes cuando habilitemos permisos de mensajeria.
      </p>
    </section>
  );
}

function ConnectionsView({ workspace }: { workspace: WorkspaceData }) {
  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Conexiones</h2>
          <p className="text-sm text-muted">Cuentas importadas desde Meta.</p>
        </div>
        <a
          className="inline-flex h-10 items-center gap-2 rounded-md bg-coral px-3 text-sm font-semibold text-white"
          href="/api/oauth/meta/authorize"
        >
          Conectar Meta
        </a>
      </div>
      <div className="space-y-3">
        {workspace.accounts.map((account) => (
          <AccountCard account={account} key={account.id} />
        ))}
      </div>
    </section>
  );
}

function SettingsView({ workspace }: { workspace: WorkspaceData }) {
  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <h2 className="text-base font-semibold">Ajustes</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-line p-4">
          <p className="text-sm font-semibold">Workspace</p>
          <p className="mt-1 text-sm text-muted">{workspace.organizationName}</p>
        </div>
        <div className="rounded-md border border-line p-4">
          <p className="text-sm font-semibold">Cuentas conectadas</p>
          <p className="mt-1 text-sm text-muted">{workspace.accounts.length}</p>
        </div>
      </div>
    </section>
  );
}

function QueuePanel({ workspace }: { workspace: WorkspaceData }) {
  return (
    <div className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Cola de publicaciones</h2>
        <p className="text-sm text-muted">Jobs priorizados por fecha, red y limite de API.</p>
      </div>
      <div className="space-y-3">
        {workspace.queue.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-panel p-4 text-sm text-muted">
            No hay publicaciones programadas todavia.
          </div>
        ) : null}
        {workspace.queue.map((item) => (
          <article
            key={item.id}
            className="grid grid-cols-[1fr_auto] gap-3 rounded-md border border-line p-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{item.title}</p>
              <p className="text-xs text-muted">{item.date}</p>
            </div>
            <span className="self-start rounded-md bg-panel px-2 py-1 text-xs font-semibold text-ink">
              {item.status}
            </span>
          </article>
        ))}
      </div>
    </div>
  );
}
