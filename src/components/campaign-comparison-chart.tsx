"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type CampaignRow = {
  campaignId: string;
  campaignName: string;
  impressions: number;
  reach: number;
  spend: number;
  clicks: number;
  ctr: number;
};

type Props = {
  data: CampaignRow[];
};

const METRICS = [
  { key: "impressions", label: "Impresiones", color: "#14b8a6" },
  { key: "reach", label: "Alcance", color: "#f9737b" },
  { key: "spend", label: "Gasto", color: "#eab308" },
  { key: "clicks", label: "Clicks", color: "#64748b" }
] as const;

export function CampaignComparisonChart({ data }: Props) {
  const [metric, setMetric] = useState<string>("spend");

  if (data.length === 0) return null;

  const activeMetric = METRICS.find((m) => m.key === metric) ?? METRICS[2];

  const sorted = [...data].sort((a, b) => {
    const aVal = a[metric as keyof CampaignRow] as number;
    const bVal = b[metric as keyof CampaignRow] as number;
    return bVal - aVal;
  });

  const formatValue = (v: number) => {
    if (metric === "spend") return `S/ ${v.toFixed(2)}`;
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return String(v);
  };

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Comparativa de campanas</h2>
          <p className="text-sm text-muted">Rendimiento por campana publicitaria</p>
        </div>
        <div className="flex overflow-hidden rounded-md border border-line text-xs font-semibold">
          {METRICS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMetric(m.key)}
              className={`px-2.5 py-1.5 transition ${
                metric === m.key
                  ? "bg-ink text-white"
                  : "bg-white text-muted hover:bg-panel"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={formatValue}
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={{ stroke: "#e2e8f0" }}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="campaignName"
              tick={{ fontSize: 11, fill: "#64748b" }}
              axisLine={false}
              tickLine={false}
              width={120}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #e2e8f0",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                fontSize: 12
              }}
              formatter={(value) => {
                const num = Number(value) || 0;
                const formatted = metric === "spend"
                  ? `S/ ${num.toFixed(2)}`
                  : num.toLocaleString("es-PE");
                return [formatted, activeMetric.label];
              }}
            />
            <Bar
              dataKey={metric}
              fill={activeMetric.color}
              radius={[0, 4, 4, 0]}
              maxBarSize={24}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
