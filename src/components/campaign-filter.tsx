import { Megaphone } from "lucide-react";

type CampaignFilterProps = {
  campaigns: { id: string; name: string }[];
  activeCampaignId: string | null;
  section: string;
  accountParam: string;
};

export function CampaignFilter({ campaigns, activeCampaignId, section, accountParam }: CampaignFilterProps) {
  if (campaigns.length === 0) return null;

  const sectionParam = section !== "dashboard" ? `section=${section}` : "";
  const baseParams = [sectionParam, accountParam].filter(Boolean).join("&");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={`?${baseParams}`}
        className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${
          !activeCampaignId
            ? "border-teal bg-teal/10 text-teal"
            : "border-line bg-white text-muted hover:bg-panel"
        }`}
      >
        Todas las campanas
      </a>
      {campaigns.map((campaign) => {
        const isActive = activeCampaignId === campaign.id;
        const params = new URLSearchParams();
        if (sectionParam) params.set("section", section);
        if (accountParam) {
          const accountValue = accountParam.replace("account=", "");
          if (accountValue) params.set("account", accountValue);
        }
        params.set("campaign", campaign.id);
        return (
          <a
            key={campaign.id}
            href={`?${params.toString()}`}
            className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors ${
              isActive
                ? "border-teal bg-teal/10 text-teal"
                : "border-line bg-white text-muted hover:bg-panel"
            }`}
          >
            <Megaphone size={16} className="shrink-0" />
            <span className="truncate max-w-40">{campaign.name}</span>
          </a>
        );
      })}
    </div>
  );
}
