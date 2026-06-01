import { CheckCircle2, Flag, Instagram, MoreHorizontal } from "lucide-react";
import type { SocialAccount } from "@/modules/social/types";

export function AccountCard({ account }: { account: SocialAccount }) {
  const Icon = account.accountType === "facebook_page" ? Flag : Instagram;
  const label =
    account.accountType === "facebook_page" ? "Meta / Facebook Page" : "Meta / Instagram Business";

  return (
    <article className="flex items-center justify-between rounded-md border border-line bg-white p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="grid size-11 shrink-0 place-items-center rounded-md bg-[#EAF2F1] text-teal">
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{account.username}</p>
          <p className="text-xs text-muted">{label}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden items-center gap-1 rounded-md bg-teal/10 px-2 py-1 text-xs font-semibold text-teal sm:inline-flex">
          <CheckCircle2 size={14} />
          Activa
        </span>
        <button
          className="grid size-9 place-items-center rounded-md border border-line text-muted hover:bg-panel"
          type="button"
          title="Mas opciones"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </article>
  );
}
