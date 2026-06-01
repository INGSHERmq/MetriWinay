import { ArrowUpRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { formatNumber } from "@/lib/utils";

type MetricCardProps = {
  label: string;
  value: number;
  valueLabel?: ReactNode;
  change: string;
  icon: LucideIcon;
  tone: "teal" | "coral" | "gold" | "ink";
};

const toneClasses = {
  teal: "bg-teal/10 text-teal",
  coral: "bg-coral/10 text-coral",
  gold: "bg-gold/10 text-gold",
  ink: "bg-ink/10 text-ink"
};

export function MetricCard({ label, value, valueLabel, change, icon: Icon, tone }: MetricCardProps) {
  return (
    <article className="rounded-md border border-line bg-white p-4 shadow-soft">
      <div className="mb-5 flex items-center justify-between">
        <span className={`grid size-10 place-items-center rounded-md ${toneClasses[tone]}`}>
          <Icon size={19} />
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-panel px-2 py-1 text-xs font-semibold text-teal">
          <ArrowUpRight size={14} />
          {change}
        </span>
      </div>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{valueLabel ?? formatNumber(value)}</p>
    </article>
  );
}
