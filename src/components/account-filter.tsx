import { Flag, Instagram } from "lucide-react";
import type { SocialAccount } from "@/modules/social/types";

type AccountFilterProps = {
  accounts: SocialAccount[];
  activeAccountId: string | null;
  section: string;
};

const accountIcon = (type?: string) => {
  const Icon = type === "instagram_business" ? Instagram : Flag;
  return <Icon size={16} />;
};

export function AccountFilter({ accounts, activeAccountId, section }: AccountFilterProps) {
  if (accounts.length <= 1) return null;

  const sectionParam = section !== "dashboard" ? `section=${section}` : "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`?${sectionParam}`}
        className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${
          !activeAccountId
            ? "border-teal bg-teal/10 text-teal"
            : "border-line bg-white text-muted hover:bg-panel"
        }`}
      >
        Todas las cuentas
      </a>
      {accounts.map((account) => {
        const isActive = activeAccountId === account.id;
        const href = `?account=${account.id}${sectionParam ? `&${sectionParam}` : ""}`;
        return (
          <a
            key={account.id}
            href={href}
            className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${
              isActive
                ? "border-teal bg-teal/10 text-teal"
                : "border-line bg-white text-muted hover:bg-panel"
            }`}
          >
            <span className="shrink-0">{accountIcon(account.accountType)}</span>
            <span className="truncate max-w-32">{account.username}</span>
          </a>
        );
      })}
    </div>
  );
}
