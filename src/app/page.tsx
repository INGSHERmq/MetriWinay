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
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { AccountCard } from "@/components/account-card";
import { AccountFilter } from "@/components/account-filter";
import { AdBreakdowns } from "@/components/ad-breakdowns";
import { AlertManager } from "@/components/alert-manager";
import { AdsPerformanceChart } from "@/components/ads-performance-chart";
import { AnalyticsChart } from "@/components/analytics-chart";
import { CampaignComparisonChart } from "@/components/campaign-comparison-chart";
import { CampaignFilter } from "@/components/campaign-filter";
import { BrandedContentPanel } from "@/components/branded-content-panel";
import { FollowersGrowthChart } from "@/components/followers-growth-chart";
import { AppShell } from "@/components/app-shell";
import { InboxPanel } from "@/components/inbox-panel";
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
  searchParams: Promise<{ section?: string; account?: string; campaign?: string; provider?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  await ensureDefaultOrganization({ userId: user.id, email: user.email });
  const { section, account, campaign, provider } = await searchParams;
  const workspace = await getWorkspaceData(account ?? null, campaign ?? null, provider ?? null);
  const activeSection = section && validSections.has(section) ? section : "dashboard";

  return (
    <AppShell activeSection={activeSection} organizationName={workspace.organizationName}>
      {activeSection === "dashboard" ? <DashboardView workspace={workspace} activeSection={activeSection} /> : null}
      {activeSection === "publicaciones" ? (
        <PublishingView workspace={workspace} />
      ) : null}
      {activeSection === "analiticas" ? <AnalyticsView workspace={workspace} activeSection={activeSection} activeCampaignId={campaign ?? null} /> : null}
      {activeSection === "reportes" ? <ReportsView workspace={workspace} /> : null}
      {activeSection === "inbox" ? <InboxView workspace={workspace} /> : null}
      {activeSection === "conexiones" ? <ConnectionsView workspace={workspace} /> : null}
      {activeSection === "ajustes" ? <SettingsView workspace={workspace} /> : null}
    </AppShell>
  );
}

function ProviderFilter({ activeProvider, section }: { activeProvider: string | null; section: string }) {
  const sectionParam = section !== "dashboard" ? `&section=${section}` : "";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`?${sectionParam}`}
        className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${
          !activeProvider
            ? "border-teal bg-teal/10 text-teal"
            : "border-line bg-white text-muted hover:bg-panel"
        }`}
      >
        Todas
      </a>
      <a
        href={`?provider=meta${sectionParam}`}
        className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${
          activeProvider === "meta"
            ? "border-blue-500 bg-blue-50 text-blue-600"
            : "border-line bg-white text-muted hover:bg-panel"
        }`}
      >
        Facebook
      </a>
      <a
        href={`?provider=tiktok${sectionParam}`}
        className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${
          activeProvider === "tiktok"
            ? "border-black bg-gray-100 text-black"
            : "border-line bg-white text-muted hover:bg-panel"
        }`}
      >
        TikTok
      </a>
    </div>
  );
}

function DashboardView({ workspace, activeSection }: { workspace: WorkspaceData; activeSection: string }) {
  return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <ProviderFilter activeProvider={workspace.activeProvider} section={activeSection} />
          {workspace.accounts.length > 1 ? (
            <AccountFilter accounts={workspace.accounts} activeAccountId={workspace.activeAccountId} activeProvider={workspace.activeProvider} section={activeSection} />
          ) : null}
        </div>
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
                  <div className="flex items-start gap-2">
                    <span className="self-start rounded-md bg-teal/10 px-2 py-1 text-xs font-semibold text-teal">
                      {item.postType === "story" ? "Historia" : item.postType === "reel" ? "Reel" : "Feed"}
                    </span>
                    <span className="self-start rounded-md bg-panel px-2 py-1 text-xs font-semibold text-ink">
                      {item.status}
                    </span>
                  </div>
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
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1fr]">
        <PostComposer accounts={workspace.accounts} organizationId={workspace.organizationId} />
        <QueuePanel workspace={workspace} />
      </div>
      <BrandedContentPanel accounts={workspace.accounts} />
    </div>
  );
}

function TrendBadge({ change }: { change: number }) {
  if (change === 0) return <Minus size={14} className="text-muted" />;
  const isUp = change > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-semibold ${isUp ? "text-teal" : "text-coral"}`}>
      {isUp ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

function AnalyticsView({ workspace, activeSection, activeCampaignId }: { workspace: WorkspaceData; activeSection: string; activeCampaignId: string | null }) {
  const accountParam = workspace.activeAccountId ? `account=${workspace.activeAccountId}` : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <ProviderFilter activeProvider={workspace.activeProvider} section={activeSection} />
        {workspace.accounts.length > 1 ? (
          <AccountFilter accounts={workspace.accounts} activeAccountId={workspace.activeAccountId} activeProvider={workspace.activeProvider} section={activeSection} />
        ) : null}
      </div>

      <section className="metric-grid gap-4">
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <div className="mb-2 flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-md bg-teal/10 text-teal"><Eye size={19} /></span>
            <TrendBadge change={workspace.comparison.reachChange} />
          </div>
          <p className="text-sm text-muted">Alcance</p>
          <p className="mt-1 text-2xl font-semibold">{workspace.metrics.reach.toLocaleString("es-PE")}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <div className="mb-2 flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-md bg-coral/10 text-coral"><HeartHandshake size={19} /></span>
            <TrendBadge change={workspace.comparison.engagementChange} />
          </div>
          <p className="text-sm text-muted">Engagement</p>
          <p className="mt-1 text-2xl font-semibold">{workspace.metrics.engagement.toLocaleString("es-PE")}</p>
        </div>
        <div className="rounded-md border border-line bg-white p-4 shadow-soft">
          <div className="mb-2 flex items-center justify-between">
            <span className="grid size-10 place-items-center rounded-md bg-gold/10 text-gold"><Users size={19} /></span>
            <TrendBadge change={workspace.comparison.followerChange} />
          </div>
          <p className="text-sm text-muted">Seguidores</p>
          <p className="mt-1 text-2xl font-semibold">{workspace.metrics.followers.toLocaleString("es-PE")}</p>
        </div>
        <MetricCard label="Posts activos" value={workspace.metrics.posts} change="real" icon={Activity} tone="ink" />
      </section>

      {workspace.activeProvider !== "tiktok" && workspace.metrics.impressionsUnique > 0 ? (
        <section className="rounded-md border border-line bg-white p-5 shadow-soft">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Detalle de pagina</h2>
            <p className="text-sm text-muted">Desglose organico vs pagado y crecimiento</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-md border border-line p-3">
              <p className="text-xs text-muted">Alcance unico</p>
              <p className="text-lg font-semibold">{workspace.metrics.impressionsUnique.toLocaleString("es-PE")}</p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-xs text-muted">Imp. organicas</p>
              <p className="text-lg font-semibold">{workspace.metrics.impressionsOrganic.toLocaleString("es-PE")}</p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-xs text-muted">Imp. pagadas</p>
              <p className="text-lg font-semibold">{workspace.metrics.impressionsPaid.toLocaleString("es-PE")}</p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-xs text-muted">Usuarios comprometidos</p>
              <p className="text-lg font-semibold">{workspace.metrics.engagedUsers.toLocaleString("es-PE")}</p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-xs text-muted">Nuevos fans</p>
              <p className="text-lg font-semibold text-teal">+{workspace.metrics.fanAdds.toLocaleString("es-PE")}</p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-xs text-muted">Fans perdidos</p>
              <p className="text-lg font-semibold text-coral">-{workspace.metrics.fanRemoves.toLocaleString("es-PE")}</p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-xs text-muted">Crecimiento neto</p>
              <p className="text-lg font-semibold">{(workspace.metrics.fanAdds - workspace.metrics.fanRemoves).toLocaleString("es-PE")}</p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-xs text-muted">Vistas de pagina</p>
              <p className="text-lg font-semibold">{workspace.metrics.pageViews.toLocaleString("es-PE")}</p>
            </div>
          </div>
        </section>
      ) : null}

      {workspace.activeProvider === "tiktok" ? (
        <section className="rounded-md border border-line bg-white p-5 shadow-soft">
          <div className="mb-4">
            <h2 className="text-base font-semibold">Resumen de TikTok</h2>
            <p className="text-sm text-muted">Metricas de videos y perfil disponibles con tus permisos actuales</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-md border border-line p-3">
              <p className="text-xs text-muted">Vistas totales (videos)</p>
              <p className="text-lg font-semibold">{workspace.metrics.reach.toLocaleString("es-PE")}</p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-xs text-muted">Likes totales (videos)</p>
              <p className="text-lg font-semibold">{workspace.metrics.engagement.toLocaleString("es-PE")}</p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-xs text-muted">Comentarios (videos)</p>
              <p className="text-lg font-semibold">{workspace.metrics.impressionsUnique.toLocaleString("es-PE")}</p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-xs text-muted">Compartidos (videos)</p>
              <p className="text-lg font-semibold">{workspace.metrics.impressionsPaid.toLocaleString("es-PE")}</p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-xs text-muted">Videos publicados</p>
              <p className="text-lg font-semibold">{workspace.metrics.impressionsOrganic.toLocaleString("es-PE")}</p>
            </div>
            <div className="rounded-md border border-line p-3">
              <p className="text-xs text-muted">Siguiendo</p>
              <p className="text-lg font-semibold">{workspace.metrics.fanAdds.toLocaleString("es-PE")}</p>
            </div>
          </div>
        </section>
      ) : null}

      {workspace.activeProvider !== "tiktok" ? (
        <>
          <div className="space-y-2">
            <div>
              <h2 className="text-base font-semibold">Metricas de anuncios</h2>
              <p className="text-sm text-muted">Rendimiento general y por campana</p>
            </div>
            <CampaignFilter
              campaigns={workspace.campaigns}
              activeCampaignId={activeCampaignId}
              section={activeSection}
              accountParam={accountParam}
            />
          </div>

          <section className="metric-grid gap-4">
            <MetricCard label="Alcance ads" value={workspace.adMetrics.reach} change="ads" icon={Eye} tone="teal" />
            <MetricCard label="Impresiones" value={workspace.adMetrics.impressions} change="ads" icon={Megaphone} tone="teal" />
            <MetricCard label="Gasto" value={workspace.adMetrics.spend} valueLabel={formatCurrency(workspace.adMetrics.spend, workspace.adMetrics.currency)} change="ads" icon={DollarSign} tone="coral" />
            <MetricCard label="Clicks" value={workspace.adMetrics.clicks} change="ads" icon={MousePointerClick} tone="gold" />
            <MetricCard label="CTR" value={workspace.adMetrics.ctr} valueLabel={formatPercent(workspace.adMetrics.ctr)} change="ads" icon={Percent} tone="ink" />
            <MetricCard label="CPC" value={workspace.adMetrics.cpc} valueLabel={formatCurrency(workspace.adMetrics.cpc, workspace.adMetrics.currency)} change="ads" icon={DollarSign} tone="teal" />
            <MetricCard label="CPM" value={workspace.adMetrics.cpm} valueLabel={formatCurrency(workspace.adMetrics.cpm, workspace.adMetrics.currency)} change="ads" icon={DollarSign} tone="coral" />
            <MetricCard label="Resultados" value={workspace.adMetrics.actions} change="ads" icon={ListChecks} tone="gold" />
            <MetricCard label="Costo por ThruPlay" value={workspace.adMetrics.costPerThruPlay} valueLabel={formatCurrency(workspace.adMetrics.costPerThruPlay, workspace.adMetrics.currency)} change="ads" icon={PlayCircle} tone="ink" />
            <MetricCard label="Costo por resultado" value={workspace.adMetrics.costPerResult} valueLabel={formatCurrency(workspace.adMetrics.costPerResult, workspace.adMetrics.currency)} change="ads" icon={Target} tone="teal" />
          </section>

          <CampaignComparisonChart data={workspace.campaignComparison} />

          <AdsPerformanceChart data={workspace.adChart} />

          <AdBreakdowns organizationId={workspace.organizationId} campaignId={activeCampaignId} />
        </>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <AnalyticsChart data={workspace.chart} />
        <FollowersGrowthChart data={workspace.followerGrowth} />
      </div>
    </div>
  );
}

function ReportsView({ workspace }: { workspace: WorkspaceData }) {
  return (
    <div className="space-y-6">
      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Reportes</h2>
            <p className="text-sm text-muted">Exporta metricas a CSV o JSON</p>
          </div>
          <div className="flex gap-2">
            <a
              href={`/api/reports/export?format=csv`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-sm font-semibold hover:bg-panel"
              download
            >
              Exportar CSV
            </a>
            <a
              href={`/api/reports/export?format=json`}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ink px-3 text-sm font-semibold text-white hover:bg-[#25313f]"
              download
            >
              Exportar JSON
            </a>
          </div>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <MetricCard label="Alcance" value={workspace.metrics.reach} change="real" icon={Eye} tone="teal" />
          <MetricCard label="Engagement" value={workspace.metrics.engagement} change="real" icon={HeartHandshake} tone="coral" />
          <MetricCard label="Seguidores" value={workspace.metrics.followers} change="real" icon={Users} tone="gold" />
        </div>
      </section>
    </div>
  );
}

function InboxView({ workspace }: { workspace: WorkspaceData }) {
  return (
    <InboxPanel
      accounts={workspace.accounts}
      organizationId={workspace.organizationId}
    />
  );
}

function ConnectionsView({ workspace }: { workspace: WorkspaceData }) {
  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Conexiones</h2>
          <p className="text-sm text-muted">Cuentas importadas desde Meta y TikTok.</p>
        </div>
        <div className="flex gap-2">
          <a
            className="inline-flex h-10 items-center gap-2 rounded-md bg-black px-3 text-sm font-semibold text-white"
            href="/api/oauth/tiktok/authorize"
          >
            TikTok
          </a>
          <a
            className="inline-flex h-10 items-center gap-2 rounded-md bg-coral px-3 text-sm font-semibold text-white"
            href="/api/oauth/meta/authorize"
          >
            Conectar Meta
          </a>
        </div>
      </div>
      <div className="space-y-3">
        {workspace.accounts.length === 0 ? (
          <div className="rounded-md border border-dashed border-line bg-panel p-4 text-sm text-muted">
            Aun no hay cuentas conectadas.
          </div>
        ) : (
          workspace.accounts.map((account) => (
            <AccountCard account={account} key={account.id} />
          ))
        )}
      </div>
    </section>
  );
}

function SettingsView({ workspace }: { workspace: WorkspaceData }) {
  return (
    <div className="space-y-6">
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
      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <AlertManager />
      </section>
    </div>
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
