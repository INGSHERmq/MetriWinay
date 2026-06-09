"use client";

import { useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  ComposedChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type FollowerDay = {
  date: string;
  followers: number;
  gained: number;
  lost: number;
};

type Props = {
  data: {
    days: FollowerDay[];
    totalGained: number;
    totalLost: number;
    netGrowth: number;
  };
};

export function FollowersGrowthChart({ data }: Props) {
  const [days] = useState(30);

  const sliced = data.days.slice(-days);
  const hasData = sliced.length > 0 && sliced.some((d) => d.followers > 0);

  const formatValue = (v: number) => {
    if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
    return String(v);
  };

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-4">
        <h2 className="text-base font-semibold">Crecimiento de seguidores</h2>
        <p className="text-sm text-muted">Evolucion diaria de seguidores</p>
      </div>

      {data.totalGained > 0 || data.totalLost > 0 ? (
        <div className="mb-4 grid grid-cols-3 gap-3">
          <div className="rounded-md border border-line p-3 text-center">
            <p className="text-xs text-muted">Ganados</p>
            <p className="text-lg font-semibold text-teal">+{data.totalGained.toLocaleString("es-PE")}</p>
          </div>
          <div className="rounded-md border border-line p-3 text-center">
            <p className="text-xs text-muted">Perdidos</p>
            <p className="text-lg font-semibold text-coral">-{data.totalLost.toLocaleString("es-PE")}</p>
          </div>
          <div className="rounded-md border border-line p-3 text-center">
            <p className="text-xs text-muted">Crecimiento neto</p>
            <p className={`text-lg font-semibold ${data.netGrowth >= 0 ? "text-teal" : "text-coral"}`}>
              {data.netGrowth >= 0 ? "+" : ""}{data.netGrowth.toLocaleString("es-PE")}
            </p>
          </div>
        </div>
      ) : null}

      <div style={{ minWidth: 0, height: 256 }}>
        {!hasData ? (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Sin datos de seguidores disponibles.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={256}>
            <ComposedChart data={sliced} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tickFormatter={(d: string) => {
                  const date = new Date(`${d}T00:00:00`);
                  return new Intl.DateTimeFormat("es-PE", { day: "numeric", month: "short" }).format(date);
                }}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={{ stroke: "#e2e8f0" }}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                yAxisId="left"
                tickFormatter={formatValue}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={45}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tickFormatter={formatValue}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                width={35}
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
                  const labels: Record<string, string> = {
                    followers: "Seguidores",
                    gained: "Ganados",
                    lost: "Perdidos"
                  };
                  return [num.toLocaleString("es-PE"), labels[String(name)] ?? String(name)];
                }}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="followers"
                stroke="#14b8a6"
                fill="#14b8a6"
                fillOpacity={0.15}
                strokeWidth={2}
                dot={false}
              />
              <Bar
                yAxisId="right"
                dataKey="gained"
                fill="#14b8a6"
                fillOpacity={0.6}
                radius={[2, 2, 0, 0]}
                maxBarSize={8}
              />
              <Bar
                yAxisId="right"
                dataKey="lost"
                fill="#f9737b"
                fillOpacity={0.6}
                radius={[2, 2, 0, 0]}
                maxBarSize={8}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  );
}
