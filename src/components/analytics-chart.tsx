"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type ChartPoint = {
  day: string;
  reach: number;
  engagement: number;
  impressions: number;
  followers: number;
};

type SyncResponse = {
  results?: { ok?: boolean; message?: string; reason?: string }[];
};

const METRICS = [
  { key: "reach", label: "Alcance", color: "#14b8a6" },
  { key: "engagement", label: "Engagement", color: "#f9737b" },
  { key: "impressions", label: "Impresiones", color: "#eab308" },
  { key: "followers", label: "Seguidores", color: "#64748b" }
] as const;

export function AnalyticsChart({ data }: { data: ChartPoint[] }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [visible, setVisible] = useState<Set<string>>(new Set(["reach", "engagement"]));
  const [days, setDays] = useState(7);

  const filtered = useMemo(
    () => (data.length > 0 ? data.slice(-days) : []),
    [data, days]
  );

  const toggleMetric = (key: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const syncMetrics = useCallback(async (showMessage = true) => {
    setSyncing(true);
    if (showMessage) setMessage(null);
    const response = await fetch("/api/analytics/sync", { method: "POST" });
    setSyncing(false);

    const payload = (await response.json().catch(() => null)) as SyncResponse | null;
    const failedResult = payload?.results?.find((result) => result.ok === false);

    if (!response.ok || failedResult) {
      if (showMessage) setMessage("No se pudieron sincronizar metricas.");
      if (failedResult?.message && showMessage) setMessage(`Meta: ${failedResult.message}`);
      return;
    }

    if (showMessage) setMessage("Metricas sincronizadas.");
    router.refresh();
  }, [router]);

  useEffect(() => {
    const lastAutoSync = Number(window.sessionStorage.getItem("metriwinay:lastAutoSync") ?? 0);
    const now = Date.now();

    if (now - lastAutoSync > 2 * 60 * 1000) {
      window.sessionStorage.setItem("metriwinay:lastAutoSync", String(now));
      void syncMetrics(false);
    }

    const intervalId = window.setInterval(() => {
      window.sessionStorage.setItem("metriwinay:lastAutoSync", String(Date.now()));
      void syncMetrics(false);
    }, 5 * 60 * 1000);

    return () => window.clearInterval(intervalId);
  }, [syncMetrics]);

  const formatValue = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return String(v);
  };

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Rendimiento</h2>
          <p className="text-sm text-muted">Alcance, engagement, impresiones y seguidores</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-md border border-line text-xs font-semibold">
            {[7, 14].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDays(d)}
                className={`px-2.5 py-1.5 transition ${
                  days === d ? "bg-ink text-white" : "bg-white text-muted hover:bg-panel"
                }`}
              >
                {d}d
              </button>
            ))}
          </div>
          <button
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line bg-white px-2.5 text-xs font-semibold hover:bg-panel disabled:opacity-60"
            disabled={syncing}
            onClick={() => void syncMetrics()}
            type="button"
          >
            <RefreshCw size={13} className={syncing ? "animate-spin" : ""} />
            {syncing ? "Sincronizando" : "Sincronizar"}
          </button>
        </div>
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        {METRICS.map((m) => (
          <button
            key={m.key}
            type="button"
            onClick={() => toggleMetric(m.key)}
            className={`inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-xs font-semibold transition ${
              visible.has(m.key)
                ? "text-white"
                : "border border-line bg-white text-muted hover:bg-panel"
            }`}
            style={visible.has(m.key) ? { backgroundColor: m.color } : {}}
          >
            {m.label}
          </button>
        ))}
      </div>

      <div className="h-72">
        {filtered.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Sin datos disponibles. Sincroniza las metricas.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={filtered} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatValue}
                tick={{ fontSize: 12, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                  fontSize: 13
                }}
                formatter={(value, name) => {
                  const num = Number(value) || 0;
                  const m = METRICS.find((x) => x.key === name);
                  return [num.toLocaleString("es-PE"), m?.label ?? String(name)];
                }}
              />
              <Legend />
              {METRICS.map(
                (m) =>
                  visible.has(m.key) && (
                    <Line
                      key={m.key}
                      type="monotone"
                      dataKey={m.key}
                      stroke={m.color}
                      strokeWidth={2}
                      dot={{ r: 3, fill: m.color }}
                      activeDot={{ r: 5 }}
                      connectNulls
                    />
                  )
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {message ? <p className="mt-3 text-sm font-medium text-teal">{message}</p> : null}
    </section>
  );
}
