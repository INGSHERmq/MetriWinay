"use client";

import { Bell, BellOff, Plus, Trash2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type AlertRule = {
  id: string;
  name: string;
  metric_type: string;
  condition: string;
  threshold: number;
  social_account_id: string | null;
  enabled: boolean;
  last_triggered_at: string | null;
};

type AlertEvent = {
  id: string;
  alert_rule_id: string;
  message: string;
  metric_value: number;
  threshold: number;
  acknowledged: boolean;
  created_at: string;
  alert_rules?: { name: string };
};

const metricOptions = [
  { value: "cpc", label: "CPC" },
  { value: "ctr", label: "CTR" },
  { value: "cpm", label: "CPM" },
  { value: "spend", label: "Gasto" },
  { value: "impressions", label: "Impresiones" },
  { value: "reach", label: "Alcance" },
  { value: "clicks", label: "Clicks" },
  { value: "engagement_drop", label: "Caida de engagement (%)" },
  { value: "cost_per_result", label: "Costo por resultado" }
];

const conditionOptions = [
  { value: "gt", label: "Mayor a" },
  { value: "lt", label: "Menor a" },
  { value: "gte", label: "Mayor o igual a" },
  { value: "lte", label: "Menor o igual a" }
];

export function AlertManager() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [events, setEvents] = useState<AlertEvent[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [metricType, setMetricType] = useState("cpc");
  const [condition, setCondition] = useState("gt");
  const [threshold, setThreshold] = useState("");

  const fetchAlerts = useCallback(async () => {
    const response = await fetch("/api/alerts?events=true");
    if (response.ok) {
      const data = (await response.json()) as { rules: AlertRule[]; events: AlertEvent[] };
      setRules(data.rules);
      setEvents(data.events);
    }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  async function createRule() {
    if (!name || !threshold) return;

    const response = await fetch("/api/alerts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, metric_type: metricType, condition, threshold: Number(threshold) })
    });

    if (response.ok) {
      setShowForm(false);
      setName("");
      setThreshold("");
      fetchAlerts();
    }
  }

  async function toggleRule(id: string, enabled: boolean) {
    await fetch("/api/alerts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, enabled: !enabled })
    });
    fetchAlerts();
  }

  async function deleteRule(id: string) {
    await fetch(`/api/alerts?id=${id}`, { method: "DELETE" });
    fetchAlerts();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Alertas de rendimiento</h2>
          <p className="text-sm text-muted">Notificaciones cuando las metricas superan umbrales</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fetchAlerts()}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-line bg-white px-3 text-sm font-semibold hover:bg-panel"
          >
            <RefreshCw size={14} />
            Recargar
          </button>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-ink px-3 text-sm font-semibold text-white hover:bg-[#25313f]"
          >
            <Plus size={14} />
            Nueva alerta
          </button>
        </div>
      </div>

      {showForm && (
        <div className="rounded-md border border-line bg-panel p-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <input
              className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none ring-teal/20 focus:ring-4"
              placeholder="Nombre de la alerta"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <select
              className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none"
              value={metricType}
              onChange={(e) => setMetricType(e.target.value)}
            >
              {metricOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              className="h-10 rounded-md border border-line bg-white px-3 text-sm outline-none"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              {conditionOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <div className="flex gap-2">
              <input
                className="h-10 flex-1 rounded-md border border-line bg-white px-3 text-sm outline-none ring-teal/20 focus:ring-4"
                type="number"
                step="0.01"
                placeholder="Umbral"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
              <button
                type="button"
                onClick={createRule}
                className="inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-semibold text-white hover:bg-[#25313f]"
              >
                Crear
              </button>
            </div>
          </div>
        </div>
      )}

      {rules.length === 0 && !showForm ? (
        <p className="rounded-md border border-dashed border-line bg-panel p-4 text-sm text-muted">
          No hay alertas configuradas. Crea una para empezar.
        </p>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className={`flex items-center justify-between rounded-md border border-line p-3 ${
                !rule.enabled ? "opacity-50" : ""
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold">{rule.name}</p>
                <p className="text-xs text-muted">
                  {metricOptions.find((m) => m.value === rule.metric_type)?.label ?? rule.metric_type}{" "}
                  {conditionOptions.find((c) => c.value === rule.condition)?.label ?? rule.condition}{" "}
                  {rule.threshold}
                  {rule.last_triggered_at
                    ? ` — Ultima alerta: ${new Date(rule.last_triggered_at).toLocaleDateString("es-PE")}`
                    : ""}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleRule(rule.id, rule.enabled)}
                  className="rounded p-1.5 text-muted hover:bg-panel"
                  title={rule.enabled ? "Desactivar" : "Activar"}
                >
                  {rule.enabled ? <Bell size={15} /> : <BellOff size={15} />}
                </button>
                <button
                  type="button"
                  onClick={() => deleteRule(rule.id)}
                  className="rounded p-1.5 text-muted hover:bg-coral/10 hover:text-coral"
                  title="Eliminar"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {events.length > 0 && (
        <>
          <h3 className="text-sm font-semibold">Historial de alertas</h3>
          <div className="space-y-2">
            {events.slice(0, 20).map((event) => (
              <div key={event.id} className="rounded-md border border-coral/20 bg-coral/5 p-3">
                <p className="text-sm font-medium">{event.message}</p>
                <p className="mt-1 text-xs text-muted">
                  {new Date(event.created_at).toLocaleString("es-PE")}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
