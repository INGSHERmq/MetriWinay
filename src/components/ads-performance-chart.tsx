"use client";

import { useState } from "react";
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

type AdChartPoint = {
  day: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
};

type Props = {
  data: AdChartPoint[];
};

const METRICS = [
  { key: "spend", label: "Gasto", color: "#14b8a6", format: (v: number) => `S/ ${v.toFixed(2)}` },
  { key: "impressions", label: "Impresiones", color: "#f9737b", format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v) },
  { key: "reach", label: "Alcance", color: "#eab308", format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v) },
  { key: "clicks", label: "Clicks", color: "#64748b", format: (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v) }
] as const;

export function AdsPerformanceChart({ data }: Props) {
  const [visible, setVisible] = useState<Set<string>>(new Set(["spend", "impressions"]));

  if (data.length === 0) return null;

  const toggleMetric = (key: string) => {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const formatTick = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return String(v);
  };

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Rendimiento de anuncios</h2>
        <p className="text-sm text-muted">Evolucion diaria de campanas pagadas</p>
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

      <div style={{ minWidth: 0, height: 288 }}>
        <ResponsiveContainer width="100%" height={288}>
          <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="day"
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              tickFormatter={formatTick}
              tick={{ fontSize: 12, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              width={50}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                fontSize: 12
              }}
              formatter={(value, name) => {
                const num = Number(value) || 0;
                const m = METRICS.find((x) => x.key === name);
                return [m ? m.format(num) : num.toLocaleString("es-PE"), m?.label ?? String(name)];
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
      </div>
    </section>
  );
}
