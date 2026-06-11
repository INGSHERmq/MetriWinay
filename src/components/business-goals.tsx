"use client";

import { useState } from "react";
import { Target, TrendingUp, Trash2, Plus, ChevronDown, Facebook, Music2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatNumber } from "@/lib/utils";
import { upsertBusinessGoal, deleteBusinessGoal, type GoalWithProgress } from "@/modules/social/business-goals";

type Props = {
  goals: GoalWithProgress[];
  organizationId: string | null;
};

type Filter = "todas" | "meta" | "tiktok";

export function BusinessGoals({ goals, organizationId }: Props) {
  const [filter, setFilter] = useState<Filter>("todas");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const filtered = filter === "todas"
    ? goals
    : goals.filter((g) => g.accountProvider === filter);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    try {
      const form = new FormData(e.currentTarget);
      await upsertBusinessGoal(form);
    } catch {
      setPending(false);
    }
  }

  async function handleDelete(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const goalId = form.get("goalId") as string;
    if (!goalId || !confirm("Eliminar esta meta?")) return;
    await deleteBusinessGoal(form);
  }

  if (!organizationId) {
    return (
      <section className="rounded-md border border-line bg-white p-5 shadow-soft">
        <h2 className="text-base font-semibold">Metas de negocio</h2>
        <p className="mt-2 text-sm text-muted">Carga un workspace para gestionar tus metas.</p>
      </section>
    );
  }

  return (
    <section className="rounded-md border border-line bg-white p-5 shadow-soft">
      <div className="mb-1 flex items-center gap-2">
        <Target size={20} className="text-teal" />
        <h2 className="text-base font-semibold">METAS DE NEGOCIO</h2>
      </div>
      <p className="mb-4 text-sm text-muted">Define objetivos de seguidores por cuenta y sigue tu progreso.</p>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {[
          { key: "todas" as Filter, label: "Todas" },
          { key: "meta" as Filter, label: "Facebook", icon: Facebook, activeColor: "border-blue-500 bg-blue-50 text-blue-600" },
          { key: "tiktok" as Filter, label: "TikTok", icon: Music2, activeColor: "border-black bg-gray-100 text-black" },
        ].map(({ key, label, icon: Icon, activeColor }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors",
              filter === key
                ? activeColor ?? "border-teal bg-teal/10 text-teal"
                : "border-line bg-white text-muted hover:bg-panel"
            )}
          >
            {Icon && <Icon size={15} />}
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-md border border-dashed border-line bg-panel p-6 text-center text-sm text-muted">
          No hay cuentas{filter !== "todas" ? ` de ${filter}` : ""} conectadas.
          Conecta redes sociales desde la seccion Conexiones.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div key={item.accountId} className="rounded-md border border-line">
              <div
                className="flex cursor-pointer items-center justify-between px-4 py-3"
                onClick={() => setExpandedId(expandedId === item.accountId ? null : item.accountId)}
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-panel text-xs font-semibold text-muted">
                    {item.accountAvatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.accountAvatar} alt="" className="size-full object-cover" />
                    ) : (
                      item.accountUsername.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{item.accountUsername}</p>
                    <p className="text-xs text-muted capitalize">
                      {item.accountProvider === "meta" ? "Facebook / Instagram" : "TikTok"}
                    </p>
                  </div>
                </div>

                {item.goal ? (
                  <GoalBadge current={item.currentFollowers} target={item.goal.target_value} />
                ) : (
                  <span className="text-xs text-muted">Sin meta</span>
                )}

                <ChevronDown
                  size={16}
                  className={cn(
                    "ml-2 shrink-0 text-muted transition-transform",
                    expandedId === item.accountId && "rotate-180"
                  )}
                />
              </div>

              {expandedId === item.accountId && (
                <div className="border-t border-line px-4 py-4">
                  {item.goal ? (
                    <div className="space-y-3">
                      <GoalProgressCard
                        current={item.currentFollowers}
                        target={item.goal.target_value}
                      />
                      <form onSubmit={handleDelete}>
                        <input type="hidden" name="goalId" value={item.goal.id} />
                        <button
                          type="submit"
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-coral hover:underline"
                        >
                          <Trash2 size={13} />
                          Eliminar meta
                        </button>
                      </form>
                    </div>
                  ) : (
                    <CreateGoalForm
                      organizationId={organizationId}
                      socialAccountId={item.accountId}
                      currentFollowers={item.currentFollowers}
                      pending={pending}
                      onSubmit={handleSubmit}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function GoalBadge({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  const color =
    pct >= 100 ? "text-teal bg-teal/10" : pct >= 50 ? "text-gold bg-gold/10" : "text-coral bg-coral/10";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold", color)}>
      <TrendingUp size={13} />
      {pct}%
    </span>
  );
}

function GoalProgressCard({ current, target }: { current: number; target: number }) {
  const pct = Math.min(100, (current / target) * 100);
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-muted">{formatNumber(current)} / {formatNumber(target)} seguidores</span>
        <span className="font-semibold">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-panel">
        <div
          className="h-full rounded-full transition-all"
          style={{
            width: `${Math.min(100, pct)}%`,
            backgroundColor: pct >= 100 ? "#089981" : pct >= 50 ? "#f0b429" : "#f97066",
          }}
        />
      </div>
      <p className="text-xs text-muted">
        {pct >= 100
          ? "Meta cumplida! Sigue asi."
          : `Faltan ${formatNumber(target - current)} seguidores para alcanzar la meta.`}
      </p>
    </div>
  );
}

function CreateGoalForm({
  organizationId,
  socialAccountId,
  currentFollowers,
  pending,
  onSubmit,
}: {
  organizationId: string;
  socialAccountId: string;
  currentFollowers: number;
  pending: boolean;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => Promise<void>;
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <input type="hidden" name="organizationId" value={organizationId} />
      <input type="hidden" name="socialAccountId" value={socialAccountId} />
      <input type="hidden" name="goalType" value="followers" />

      <div>
        <p className="mb-1 text-sm font-medium">Seguidores actuales</p>
        <p className="text-lg font-semibold text-teal">{formatNumber(currentFollowers)}</p>
      </div>

      <div>
        <label htmlFor={`target-${socialAccountId}`} className="mb-1 block text-sm font-medium">
          Meta de seguidores
        </label>
        <input
          id={`target-${socialAccountId}`}
          name="targetValue"
          type="number"
          min={1}
          required
          placeholder="Ej: 10000"
          className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-teal focus:ring-1 focus:ring-teal"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-teal px-4 text-sm font-semibold text-white transition hover:bg-teal/90 disabled:opacity-50"
      >
        <Plus size={16} />
        {pending ? "Guardando..." : "Crear meta"}
      </button>
    </form>
  );
}
