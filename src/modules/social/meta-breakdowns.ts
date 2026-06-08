import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/config";
import { decryptToken } from "@/modules/social/token-vault";

type BreakdownRow = {
  breakdown_type: string;
  breakdown_value: string;
  impressions: number;
  reach: number;
  spend: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
};

function graphUrl(path: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}${path}?${search.toString()}`;
}

function getCompleteLast30DaysTimeRange(now = new Date()) {
  const until = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const since = new Date(until);
  since.setUTCDate(until.getUTCDate() - 29);

  return {
    since: since.toISOString().slice(0, 10),
    until: until.toISOString().slice(0, 10)
  };
}

const BREAKDOWN_TYPES = ["age", "gender", "country", "device", "placement", "region"] as const;

export async function syncAdBreakdownsForOrganization(organizationId: string) {
  const supabase = createSupabaseAdminClient();

  const { data: accountForConnection } = await supabase
    .from("social_accounts")
    .select("oauth_connection_id")
    .eq("organization_id", organizationId)
    .eq("provider", "meta")
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  if (!accountForConnection?.oauth_connection_id) return [];

  const { data: connection } = await supabase
    .from("oauth_connections")
    .select("access_token_ciphertext,access_token_iv,access_token_tag,scopes")
    .eq("id", accountForConnection.oauth_connection_id)
    .eq("provider", "meta")
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (!connection || !connection.scopes?.includes("ads_read")) {
    return [];
  }

  const accessToken = decryptToken({
    ciphertext: connection.access_token_ciphertext,
    iv: connection.access_token_iv,
    tag: connection.access_token_tag
  });

  const adAccountsResponse = await fetch(
    graphUrl("/me/adaccounts", {
      fields: "id,name",
      access_token: accessToken
    }),
    { headers: { Accept: "application/json" } }
  );

  if (!adAccountsResponse.ok) return [];

  const adAccountsPayload = (await adAccountsResponse.json()) as {
    data?: { id: string; name?: string }[];
  };

  const timeRange = getCompleteLast30DaysTimeRange();
  const results = [];

  for (const adAccount of adAccountsPayload.data ?? []) {
    for (const breakdownType of BREAKDOWN_TYPES) {
      try {
        const breakdowns = await fetchBreakdown(
          adAccount.id,
          breakdownType,
          timeRange,
          accessToken
        );

        for (const row of breakdowns) {
          const { error } = await supabase.from("ad_breakdown_snapshots").upsert({
            organization_id: organizationId,
            ad_account_id: adAccount.id,
            ad_account_name: adAccount.name,
            campaign_id: row.campaignId ?? null,
            campaign_name: row.campaignName ?? null,
            metric_date_start: timeRange.since,
            metric_date_stop: timeRange.until,
            breakdown_type: row.breakdown_type,
            breakdown_value: row.breakdown_value,
            impressions: row.impressions,
            reach: row.reach,
            spend: row.spend,
            clicks: row.clicks,
            ctr: row.ctr,
            cpc: row.cpc,
            cpm: row.cpm,
            raw_payload: row
          }, {
            onConflict: "organization_id,ad_account_id,campaign_id,metric_date_start,metric_date_stop,breakdown_type,breakdown_value"
          });

          if (error) throw error;
        }

        results.push({ adAccountId: adAccount.id, breakdownType, ok: true });
      } catch (err) {
        results.push({
          adAccountId: adAccount.id,
          breakdownType,
          ok: false,
          error: err instanceof Error ? err.message : "Unknown"
        });
      }
    }
  }

  return results;
}

type BreakdownApiRow = {
  campaign_id?: string;
  campaign_name?: string;
  impressions?: string;
  reach?: string;
  spend?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  [key: string]: string | undefined;
};

async function fetchBreakdown(
  adAccountId: string,
  breakdownType: string,
  timeRange: { since: string; until: string },
  accessToken: string
): Promise<(BreakdownRow & { campaignId?: string; campaignName?: string })[]> {
  const response = await fetch(
    graphUrl(`/${adAccountId}/insights`, {
      level: "campaign",
      fields: "campaign_id,campaign_name,impressions,reach,spend,clicks,ctr,cpc,cpm",
      time_range: JSON.stringify(timeRange),
      breakdowns: breakdownType,
      access_token: accessToken
    }),
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message ?? `Breakdown API error ${response.status}`);
  }

  const payload = (await response.json()) as { data?: BreakdownApiRow[] };

  return (payload.data ?? []).map((row) => {
    const impressions = Number(row.impressions ?? 0);
    const spend = Number(row.spend ?? 0);
    const clicks = Number(row.clicks ?? 0);

    return {
      breakdown_type: breakdownType,
      breakdown_value: row[breakdownType] ?? "unknown",
      impressions,
      reach: Number(row.reach ?? 0),
      spend,
      clicks,
      ctr: Number(row.ctr ?? 0),
      cpc: clicks > 0 ? spend / clicks : 0,
      cpm: impressions > 0 ? (spend / impressions) * 1000 : 0,
      campaignId: row.campaign_id,
      campaignName: row.campaign_name
    };
  });
}

export async function getAdBreakdowns(
  organizationId: string,
  breakdownType?: string,
  campaignId?: string | null
) {
  const supabase = createSupabaseAdminClient();

  let query = supabase
    .from("ad_breakdown_snapshots")
    .select("*")
    .eq("organization_id", organizationId)
    .order("metric_date_stop", { ascending: false })
    .limit(100);

  if (breakdownType) {
    query = query.eq("breakdown_type", breakdownType);
  }

  if (campaignId) {
    query = query.eq("campaign_id", campaignId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
