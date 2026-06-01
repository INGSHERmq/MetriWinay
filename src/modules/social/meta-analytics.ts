import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/config";
import { decryptToken } from "@/modules/social/token-vault";
import { ingestMetricSnapshot } from "@/modules/social/analytics";

type AccountRow = {
  id: string;
  organization_id: string;
  provider_account_id: string;
  username: string;
  account_type: "facebook_page" | "instagram_business";
  account_access_token_ciphertext: string | null;
  account_access_token_iv: string | null;
  account_access_token_tag: string | null;
};

type InsightValue = {
  name: string;
  values?: { value?: number; end_time?: string }[];
};

function getCompleteLast30DaysTimeRange(now = new Date()) {
  const until = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
  const since = new Date(until);
  since.setUTCDate(until.getUTCDate() - 29);

  return {
    since: since.toISOString().slice(0, 10),
    until: until.toISOString().slice(0, 10)
  };
}

function graphUrl(path: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}${path}?${search.toString()}`;
}

function getAccountToken(account: AccountRow) {
  if (
    !account.account_access_token_ciphertext ||
    !account.account_access_token_iv ||
    !account.account_access_token_tag
  ) {
    return null;
  }

  return decryptToken({
    ciphertext: account.account_access_token_ciphertext,
    iv: account.account_access_token_iv,
    tag: account.account_access_token_tag
  });
}

export async function syncMetaAnalyticsForOrganization(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: accounts, error } = await supabase
    .from("social_accounts")
    .select(
      "id,organization_id,provider_account_id,username,account_type,account_access_token_ciphertext,account_access_token_iv,account_access_token_tag"
    )
    .eq("organization_id", organizationId)
    .eq("provider", "meta")
    .eq("status", "ACTIVE");

  if (error) throw error;

  const results = [];
  for (const account of (accounts ?? []) as AccountRow[]) {
    results.push(await syncMetaAccountAnalytics(account));
  }

  results.push(...(await syncMetaAdsAnalyticsForOrganization(organizationId)));
  return results;
}

async function syncMetaAccountAnalytics(account: AccountRow) {
  const accessToken = getAccountToken(account);
  if (!accessToken) {
    return { accountId: account.id, ok: false, reason: "missing_page_token" };
  }

  if (account.account_type === "instagram_business") {
    return syncInstagramSnapshot(account, accessToken);
  }

  return syncFacebookPageSnapshot(account, accessToken);
}

async function syncFacebookPageSnapshot(account: AccountRow, accessToken: string) {
  const today = new Date().toISOString().slice(0, 10);
  const profileResponse = await fetch(
    graphUrl(`/${account.provider_account_id}`, {
      fields: "fan_count,followers_count,talking_about_count",
      access_token: accessToken
    }),
    { headers: { Accept: "application/json" } }
  );

  const profile = profileResponse.ok
    ? ((await profileResponse.json()) as {
        fan_count?: number;
        followers_count?: number;
        talking_about_count?: number;
      })
    : {};

  const insights = await fetchPageInsights(account, accessToken);
  await ingestMetricSnapshot({
    organizationId: account.organization_id,
    socialAccountId: account.id,
    providerMetricId: "meta_page_daily",
    metricDate: today,
    impressions: insights.impressions,
    reach: insights.reach,
    engagement: insights.engagement || profile.talking_about_count || 0,
    followers: profile.followers_count ?? profile.fan_count ?? 0
  });

  return { accountId: account.id, ok: true };
}

async function syncInstagramSnapshot(account: AccountRow, accessToken: string) {
  const today = new Date().toISOString().slice(0, 10);
  const response = await fetch(
    graphUrl(`/${account.provider_account_id}`, {
      fields: "followers_count,media_count",
      access_token: accessToken
    }),
    { headers: { Accept: "application/json" } }
  );

  const profile = response.ok
    ? ((await response.json()) as { followers_count?: number; media_count?: number })
    : {};

  await ingestMetricSnapshot({
    organizationId: account.organization_id,
    socialAccountId: account.id,
    providerMetricId: "meta_instagram_profile",
    metricDate: today,
    impressions: 0,
    reach: 0,
    engagement: 0,
    followers: profile.followers_count ?? 0
  });

  return { accountId: account.id, ok: response.ok };
}

async function fetchPageInsights(account: AccountRow, accessToken: string) {
  const since = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000).toString();
  const until = Math.floor(Date.now() / 1000).toString();
  const response = await fetch(
    graphUrl(`/${account.provider_account_id}/insights`, {
      metric: "page_impressions,page_post_engagements",
      period: "day",
      since,
      until,
      access_token: accessToken
    }),
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    return { impressions: 0, reach: 0, engagement: 0 };
  }

  const payload = (await response.json()) as { data?: InsightValue[] };
  const getTotal = (name: string) =>
    payload.data
      ?.find((item) => item.name === name)
      ?.values?.reduce((sum, item) => sum + Number(item.value ?? 0), 0) ?? 0;

  const impressions = getTotal("page_impressions");
  return {
    impressions,
    reach: impressions,
    engagement: getTotal("page_post_engagements")
  };
}

export async function syncMetaAdsAnalyticsForOrganization(organizationId: string) {
  const supabase = createSupabaseAdminClient();
  const { data: accountForConnection, error: accountError } = await supabase
    .from("social_accounts")
    .select("oauth_connection_id")
    .eq("organization_id", organizationId)
    .eq("provider", "meta")
    .eq("status", "ACTIVE")
    .limit(1)
    .maybeSingle();

  if (accountError) throw accountError;
  if (!accountForConnection?.oauth_connection_id) return [];

  const { data: connection, error } = await supabase
    .from("oauth_connections")
    .select("access_token_ciphertext,access_token_iv,access_token_tag,scopes")
    .eq("id", accountForConnection.oauth_connection_id)
    .eq("provider", "meta")
    .eq("status", "ACTIVE")
    .maybeSingle();

  if (error) throw error;
  if (!connection) return [];
  if (!connection.scopes?.includes("ads_read")) {
    return [
      {
        ok: false,
        reason: "missing_ads_read",
        message:
          "La conexion de Meta no tiene el permiso ads_read. Vuelve a conectar Meta despues de agregar Marketing API/ads_read en la app."
      }
    ];
  }

  const accessToken = decryptToken({
    ciphertext: connection.access_token_ciphertext,
    iv: connection.access_token_iv,
    tag: connection.access_token_tag
  });

  const adAccountsResponse = await fetch(
    graphUrl("/me/adaccounts", {
      fields: "id,name,account_status,currency,timezone_name",
      access_token: accessToken
    }),
    { headers: { Accept: "application/json" } }
  );

  if (!adAccountsResponse.ok) {
    const errorPayload = (await adAccountsResponse.json().catch(() => null)) as {
      error?: { message?: string; code?: number; type?: string };
    } | null;

    return [
      {
        ok: false,
        reason: "adaccounts_unavailable",
        message:
          errorPayload?.error?.message === "API access blocked."
            ? "Meta bloqueo el acceso a Marketing API. Revisa que la app tenga Marketing API agregado, ads_read aprobado/activo y que el usuario tenga acceso a la cuenta publicitaria."
            : errorPayload?.error?.message ?? `Meta Ads API error ${adAccountsResponse.status}`,
        code: errorPayload?.error?.code,
        type: errorPayload?.error?.type
      }
    ];
  }

  const adAccountsPayload = (await adAccountsResponse.json()) as {
    data?: { id: string; name?: string; currency?: string }[];
  };
  const timeRange = getCompleteLast30DaysTimeRange();

  const results = [];
  for (const adAccount of adAccountsPayload.data ?? []) {
    const insightsResponse = await fetch(
      graphUrl(`/${adAccount.id}/insights`, {
        fields:
          "impressions,reach,spend,clicks,ctr,cpc,cpm,actions,cost_per_action_type,video_thruplay_watched_actions,date_start,date_stop",
        time_range: JSON.stringify(timeRange),
        access_token: accessToken
      }),
      { headers: { Accept: "application/json" } }
    );

    if (!insightsResponse.ok) {
      const errorPayload = (await insightsResponse.json().catch(() => null)) as {
        error?: { message?: string; code?: number; type?: string };
      } | null;

      results.push({
        adAccountId: adAccount.id,
        ok: false,
        reason: "insights_unavailable",
        message: errorPayload?.error?.message ?? `Meta Insights API error ${insightsResponse.status}`,
        code: errorPayload?.error?.code,
        type: errorPayload?.error?.type
      });
      continue;
    }

    const insightsPayload = (await insightsResponse.json()) as {
      data?: {
        impressions?: string;
        reach?: string;
        spend?: string;
        clicks?: string;
        ctr?: string;
        cpc?: string;
        cpm?: string;
        actions?: { action_type: string; value: string }[];
        cost_per_action_type?: { action_type: string; value: string }[];
        video_thruplay_watched_actions?: { action_type: string; value: string }[];
        date_start: string;
        date_stop: string;
      }[];
    };

    for (const row of insightsPayload.data ?? []) {
      const engagement =
        row.actions?.find((action) => action.action_type === "post_engagement")?.value ??
        row.actions?.find((action) => action.action_type === "page_engagement")?.value ??
        "0";

      const { error: upsertError } = await supabase.from("ad_metric_snapshots").upsert(
        {
          organization_id: organizationId,
          ad_account_id: adAccount.id,
          ad_account_name: adAccount.name,
          metric_date_start: row.date_start,
          metric_date_stop: row.date_stop,
          impressions: Number(row.impressions ?? 0),
          reach: Number(row.reach ?? 0),
          spend: Number(row.spend ?? 0),
          clicks: Number(row.clicks ?? 0),
          engagement: Number(engagement),
          raw_payload: { ...row, account_currency: adAccount.currency ?? "USD" }
        },
        {
          onConflict: "organization_id,ad_account_id,metric_date_start,metric_date_stop"
        }
      );

      if (upsertError) throw upsertError;
    }

    results.push({ adAccountId: adAccount.id, ok: true });
  }

  return results;
}
