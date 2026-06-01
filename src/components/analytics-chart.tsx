"use client";

import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type ChartPoint = {
  day: string;
  reach: number;
  engagement: number;
};

type SyncResponse = {
  results?: { ok?: boolean; message?: string; reason?: string }[];
};

const fallbackBars = [
  { day: "L", reach: 0, engagement: 0 },
  { day: "M", reach: 0, engagement: 0 },
  { day: "M", reach: 0, engagement: 0 },
  { day: "J", reach: 0, engagement: 0 },
  { day: "V", reach: 0, engagement: 0 },
  { day: "S", reach: 0, engagement: 0 },
  { day: "D", reach: 0, engagement: 0 }
];

export function AnalyticsChart({ data }: { data: ChartPoint[] }) {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const bars = data.length > 0 ? data : fallbackBars;
  const maxValue = Math.max(1, ...bars.flatMap((bar) => [bar.reach, bar.engagement]));

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

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Rendimiento semanal</h2>
          <p className="text-sm text-muted">Alcance y engagement por dia</p>
        </div>
        <button
          className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-semibold hover:bg-panel disabled:opacity-60"
          disabled={syncing}
          onClick={() => void syncMetrics()}
          type="button"
        >
          <RefreshCw size={15} />
          {syncing ? "Sincronizando" : "Sincronizar"}
        </button>
      </div>
      <div className="flex h-72 items-end gap-3">
        {bars.map((bar, index) => (
          <div key={`${bar.day}-${index}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="flex h-56 w-full max-w-14 items-end justify-center gap-1">
              <span
                className="w-3 rounded-t bg-teal"
                style={{ height: `${Math.max(4, (bar.reach / maxValue) * 100)}%` }}
                title={`Alcance ${bar.reach}`}
              />
              <span
                className="w-3 rounded-t bg-coral"
                style={{ height: `${Math.max(4, (bar.engagement / maxValue) * 100)}%` }}
                title={`Engagement ${bar.engagement}`}
              />
            </div>
            <span className="text-xs font-semibold text-muted">{bar.day}</span>
          </div>
        ))}
      </div>
      {message ? <p className="mt-3 text-sm font-medium text-teal">{message}</p> : null}
    </section>
  );
}
