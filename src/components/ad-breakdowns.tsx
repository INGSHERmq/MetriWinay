"use client";

import { BarChart3, RefreshCw, Users, MapPin, Smartphone, LayoutGrid } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type BreakdownRow = {
  id: string;
  breakdown_type: string;
  breakdown_value: string;
  impressions: number;
  reach: number;
  spend: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
};

type Props = {
  organizationId: string | null;
  campaignId?: string | null;
};

const breakdownLabels: Record<string, { label: string; icon: typeof BarChart3 }> = {
  age: { label: "Edad", icon: Users },
  gender: { label: "Genero", icon: Users },
  country: { label: "Pais", icon: MapPin },
  device: { label: "Dispositivo", icon: Smartphone },
  placement: { label: "Ubicacion", icon: LayoutGrid },
  region: { label: "Region", icon: MapPin }
};

const breakdownColors: Record<string, string> = {
  "18-24": "bg-teal",
  "25-34": "bg-coral",
  "35-44": "bg-gold",
  "45-54": "bg-ink",
  "55-64": "bg-teal/60",
  "65+": "bg-coral/60",
  male: "bg-teal",
  female: "bg-coral",
  unknown: "bg-muted",
  mobile: "bg-teal",
  desktop: "bg-coral",
  tablet: "bg-gold",
  feed: "bg-teal",
  stories: "bg-coral",
  marketplace: "bg-gold",
  video_feeds: "bg-ink"
};

export function AdBreakdowns({ organizationId, campaignId }: Props) {
  const [data, setData] = useState<BreakdownRow[]>([]);
  const [activeType, setActiveType] = useState<string>("age");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({ organizationId, type: activeType });
      if (campaignId) params.set("campaignId", campaignId);
      const res = await fetch(`/api/analytics/breakdowns?${params.toString()}`);
      const json = (await res.json()) as { breakdowns?: BreakdownRow[] };
      setData(json.breakdowns ?? []);
    } catch {
      setData([]);
    }

    setLoading(false);
  }, [organizationId, activeType, campaignId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function syncBreakdowns() {
    if (!organizationId) return;
    setSyncing(true);

    try {
      await fetch("/api/analytics/sync", { method: "POST" });
      await fetchData();
    } catch {
      // ignore
    }

    setSyncing(false);
  }

  const types = Object.keys(breakdownLabels);

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Desglose de anuncios</h2>
          <p className="text-sm text-muted">Rendimiento por segmento</p>
        </div>
        <button
          type="button"
          onClick={syncBreakdowns}
          disabled={syncing}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-xs font-semibold hover:bg-panel disabled:opacity-60"
        >
          <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
          {syncing ? "Sincronizando..." : "Sincronizar"}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {types.map((type) => {
          const info = breakdownLabels[type];
          const Icon = info.icon;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setActiveType(type)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold transition ${
                activeType === type
                  ? "bg-ink text-white"
                  : "border border-line bg-white text-ink hover:bg-panel"
              }`}
            >
              <Icon size={13} />
              {info.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="py-8 text-center text-sm text-muted">Cargando...</p>
      ) : data.length === 0 ? (
        <p className="rounded-md border border-dashed border-line bg-panel p-4 text-sm text-muted">
          No hay datos de desglose disponibles. Sincroniza las analiticas primero.
        </p>
      ) : (
        <div className="space-y-3">
          {data.map((row) => {
            const maxValue = Math.max(...data.map((d) => d.impressions), 1);
            const barWidth = (row.impressions / maxValue) * 100;
            const color = breakdownColors[row.breakdown_value] ?? "bg-teal";

            return (
              <div key={row.id}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{row.breakdown_value}</span>
                  <span className="text-xs text-muted">
                    {row.impressions.toLocaleString("es-PE")} imp. | ${row.spend.toFixed(2)} | CTR {row.ctr.toFixed(2)}%
                  </span>
                </div>
                <div className="h-3 w-full overflow-hidden rounded-full bg-panel">
                  <div
                    className={`h-full rounded-full ${color} transition-all`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
