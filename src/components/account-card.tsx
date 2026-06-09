import { CheckCircle2, Flag, Instagram, Music2, MoreHorizontal } from "lucide-react";
import type { SocialAccount } from "@/modules/social/types";

function accountIcon(type: SocialAccount["accountType"]) {
  switch (type) {
    case "facebook_page": return Flag;
    case "instagram_business": return Instagram;
    case "tiktok_user":
    case "tiktok_business": return Music2;
    default: return Instagram;
  }
}

function accountLabel(type: SocialAccount["accountType"]) {
  switch (type) {
    case "facebook_page": return "Meta / Facebook Page";
    case "instagram_business": return "Meta / Instagram Business";
    case "tiktok_user": return "TikTok / Usuario";
    case "tiktok_business": return "TikTok / Business";
    default: return "Red social";
  }
}

function accountBg(type: SocialAccount["accountType"]) {
  switch (type) {
    case "facebook_page":
    case "instagram_business": return "bg-[#EAF2F1] text-teal";
    case "tiktok_user":
    case "tiktok_business": return "bg-gray-100 text-black";
    default: return "bg-[#EAF2F1] text-teal";
  }
}

export function AccountCard({ account }: { account: SocialAccount }) {
  const Icon = accountIcon(account.accountType);

  return (
    <article className="flex items-center justify-between rounded-md border border-line bg-white p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`grid size-11 shrink-0 place-items-center rounded-md ${accountBg(account.accountType)}`}>
          <Icon size={20} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{account.username}</p>
          <p className="text-xs text-muted">{accountLabel(account.accountType)}</p>
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
