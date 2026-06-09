import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SocialAccount } from "@/modules/social/types";

export type WorkspaceData = {
  organizationId: string | null;
  organizationName: string;
  accounts: SocialAccount[];
  activeAccountId: string | null;
  activeAccount: SocialAccount | null;
  queue: { id: string; title: string; date: string; status: string; postType: string }[];
  metrics: {
    reach: number;
    engagement: number;
    followers: number;
    posts: number;
    impressionsUnique: number;
    impressionsPaid: number;
    impressionsOrganic: number;
    engagedUsers: number;
    fanAdds: number;
    fanRemoves: number;
    pageViews: number;
  };
  adMetrics: {
    impressions: number;
    reach: number;
    spend: number;
    clicks: number;
    ctr: number;
    cpc: number;
    cpm: number;
    costPerThruPlay: number;
    costPerResult: number;
    actions: number;
    currency: string;
  };
  campaigns: { id: string; name: string }[];
  chart: { day: string; reach: number; engagement: number; impressions: number; followers: number }[];
  followerGrowth: {
    days: { date: string; followers: number; gained: number; lost: number }[];
    totalGained: number;
    totalLost: number;
    netGrowth: number;
  };
  comparison: {
    reachChange: number;
    engagementChange: number;
    followerChange: number;
    adSpendChange: number;
    adImpressionsChange: number;
  };
  campaignComparison: {
    campaignId: string;
    campaignName: string;
    impressions: number;
    reach: number;
    spend: number;
    clicks: number;
    ctr: number;
  }[];
  adChart: { day: string; spend: number; impressions: number; reach: number; clicks: number }[];
};

type AdMetricSnapshotRow = {
  ad_account_id: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  metric_date_start: string | null;
  metric_date_stop: string | null;
  impressions: number | null;
  reach: number | null;
  spend: number | string | null;
  clicks: number | null;
  engagement: number | null;
  raw_payload: {
    actions?: { action_type?: string; value?: string | number }[];
    cost_per_action_type?: { action_type?: string; value?: string | number }[];
    video_thruplay_watched_actions?: { action_type?: string; value?: string | number }[];
    account_currency?: string;
  } | null;
};

const resultActionPriority = [
  "purchase",
  "lead",
  "complete_registration",
  "submit_application",
  "contact_total",
  "onsite_conversion.messaging_conversation_started_7d",
  "landing_page_view",
  "link_click",
  "video_thruplay",
  "post_engagement",
  "page_engagement"
];

export async function getWorkspaceData(accountId?: string | null, campaignId?: string | null): Promise<WorkspaceData> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return emptyWorkspace();
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id, organizations(name)")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const organizationId = member?.organization_id ?? null;
  const organization = Array.isArray(member?.organizations)
    ? member?.organizations[0]
    : member?.organizations;

  if (!organizationId) {
    return emptyWorkspace();
  }

  const [{ data: accounts }, { data: posts }, { data: snapshots }, { data: adSnapshots }] =
    await Promise.all([
      supabase
        .from("social_accounts")
        .select("id,provider,provider_account_id,username,avatar_url,account_type,status")
        .eq("organization_id", organizationId)
        .order("created_at", { ascending: false }),
      supabase
        .from("posts")
        .select("id,body,scheduled_for,status,post_type")
        .eq("organization_id", organizationId)
        .order("scheduled_for", { ascending: true, nullsFirst: false })
        .limit(5),
      (() => {
        const snapshotsQuery = supabase
          .from("metric_snapshots")
          .select("metric_date,provider_metric_id,impressions,reach,engagement,followers,social_account_id,impressions_unique,impressions_paid,impressions_organic,engaged_users,fan_adds,fan_removes,page_views")
          .eq("organization_id", organizationId)
          .not("provider_metric_id", "like", "meta_ads_%")
          .not("provider_metric_id", "like", "tiktok_video_%")
          .order("metric_date", { ascending: false })
          .limit(200);
        return accountId ? snapshotsQuery.eq("social_account_id", accountId) : snapshotsQuery;
      })(),
      supabase
        .from("ad_metric_snapshots")
        .select("ad_account_id,campaign_id,campaign_name,metric_date_start,metric_date_stop,impressions,reach,spend,clicks,engagement,raw_payload")
        .eq("organization_id", organizationId)
        .order("metric_date_stop", { ascending: false })
        .limit(50)
    ]);

  const adRows = (adSnapshots ?? []) as AdMetricSnapshotRow[];

  const socialAccounts: SocialAccount[] = (accounts ?? []).map((account) => ({
    id: account.id,
    provider: account.provider,
    providerAccountId: account.provider_account_id,
    username: account.username,
    avatarUrl: account.avatar_url ?? undefined,
    accountType: account.account_type ?? "facebook_page",
    status: account.status
  }));

  const activeAccount = accountId
    ? socialAccounts.find((a) => a.id === accountId) ?? null
    : null;

  const reach = (snapshots ?? []).reduce((sum, item) => sum + (item.reach ?? 0), 0);
  const engagement = (snapshots ?? []).reduce(
    (sum, item) => sum + (item.engagement ?? 0),
    0
  );
  const followers = Math.max(0, ...(snapshots ?? []).map((item) => item.followers ?? 0));
  const detailedAgg = (snapshots ?? []).reduce(
    (acc, item) => ({
      impressionsUnique: acc.impressionsUnique + (item.impressions_unique ?? 0),
      impressionsPaid: acc.impressionsPaid + (item.impressions_paid ?? 0),
      impressionsOrganic: acc.impressionsOrganic + (item.impressions_organic ?? 0),
      engagedUsers: acc.engagedUsers + (item.engaged_users ?? 0),
      fanAdds: acc.fanAdds + (item.fan_adds ?? 0),
      fanRemoves: acc.fanRemoves + (item.fan_removes ?? 0),
      pageViews: acc.pageViews + (item.page_views ?? 0)
    }),
    {
      impressionsUnique: 0,
      impressionsPaid: 0,
      impressionsOrganic: 0,
      engagedUsers: 0,
      fanAdds: 0,
      fanRemoves: 0,
      pageViews: 0
    }
  );
  const adMetrics = buildAdMetrics(adRows, campaignId);
  const campaigns = buildCampaignList(adRows);
  const chart = buildChartData(snapshots ?? []);
  const followerGrowth = buildFollowerGrowth(snapshots ?? []);
  const comparison = buildComparison(snapshots ?? []);
  const campaignComparison = buildCampaignComparison(adRows);
  const adChart = buildAdChart(adRows, campaignId);

  return {
    organizationId,
    organizationName: organization?.name ?? "Workspace",
    accounts: socialAccounts,
    activeAccountId: accountId ?? null,
    activeAccount,
    queue: (posts ?? []).map((post) => ({
      id: post.id,
      title: post.body.slice(0, 54),
      date: post.scheduled_for
        ? new Intl.DateTimeFormat("es-PE", {
            dateStyle: "medium",
            timeStyle: "short"
          }).format(new Date(post.scheduled_for))
        : "Sin fecha",
      status: post.status,
      postType: post.post_type ?? "feed"
    })),
    metrics: {
      reach,
      engagement,
      followers,
      posts: posts?.length ?? 0,
      ...detailedAgg
    },
    adMetrics,
    campaigns,
    chart,
    followerGrowth,
    comparison,
    campaignComparison,
    adChart
  };
}

function emptyWorkspace(): WorkspaceData {
  return {
    organizationId: null,
    organizationName: "Workspace",
    accounts: [],
    activeAccountId: null,
    activeAccount: null,
    queue: [],
    metrics: {
      reach: 0,
      engagement: 0,
      followers: 0,
      posts: 0,
      impressionsUnique: 0,
      impressionsPaid: 0,
      impressionsOrganic: 0,
      engagedUsers: 0,
      fanAdds: 0,
      fanRemoves: 0,
      pageViews: 0
    },
    adMetrics: {
      impressions: 0,
      reach: 0,
      spend: 0,
      clicks: 0,
      ctr: 0,
      cpc: 0,
      cpm: 0,
      costPerThruPlay: 0,
      costPerResult: 0,
      actions: 0,
      currency: "USD"
    },
    campaigns: [],
    chart: [],
    followerGrowth: { days: [], totalGained: 0, totalLost: 0, netGrowth: 0 },
    comparison: {
      reachChange: 0, engagementChange: 0, followerChange: 0,
      adSpendChange: 0, adImpressionsChange: 0
    },
    campaignComparison: [],
    adChart: []
  };
}

function buildAdMetrics(snapshots: AdMetricSnapshotRow[], campaignId?: string | null) {
  const hasCampaignData = snapshots.some((s) => s.campaign_id);
  const filtered = campaignId
    ? snapshots.filter((s) => s.campaign_id === campaignId)
    : hasCampaignData
      ? snapshots.filter((s) => s.campaign_id)
      : snapshots;
  const latestSnapshots = getLatestAdSnapshots(filtered);
  const totals = latestSnapshots.reduce(
    (sum, snapshot) => {
      const impressions = Number(snapshot.impressions ?? 0);
      const reach = Number(snapshot.reach ?? 0);
      const spend = Number(snapshot.spend ?? 0);
      const clicks = Number(snapshot.clicks ?? 0);
      const actions =
        snapshot.raw_payload?.actions?.reduce(
          (actionSum, action) => actionSum + Number(action.value ?? 0),
          0
        ) ?? Number(snapshot.engagement ?? 0);
      const thruPlays = getThruPlayValue(snapshot);
      const resultActions = getResultActionValue(snapshot, actions);

      return {
        impressions: sum.impressions + impressions,
        reach: sum.reach + reach,
        spend: sum.spend + spend,
        clicks: sum.clicks + clicks,
        actions: sum.actions + actions,
        thruPlays: sum.thruPlays + thruPlays,
        resultActions: sum.resultActions + resultActions
      };
    },
    { impressions: 0, reach: 0, spend: 0, clicks: 0, actions: 0, thruPlays: 0, resultActions: 0 }
  );
  const currency =
    latestSnapshots.find((snapshot) => snapshot.raw_payload?.account_currency)?.raw_payload
      ?.account_currency ?? "USD";

  return {
    impressions: totals.impressions,
    reach: totals.reach,
    spend: totals.spend,
    clicks: totals.clicks,
    actions: totals.resultActions || totals.actions,
    ctr: totals.impressions > 0 ? (totals.clicks / totals.impressions) * 100 : 0,
    cpc: totals.clicks > 0 ? totals.spend / totals.clicks : 0,
    cpm: totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0,
    costPerThruPlay: totals.thruPlays > 0 ? totals.spend / totals.thruPlays : 0,
    costPerResult: totals.resultActions > 0 ? totals.spend / totals.resultActions : 0,
    currency
  };
}

function isDailyRow(s: AdMetricSnapshotRow) {
  return !!(s.metric_date_start && s.metric_date_stop && s.metric_date_start === s.metric_date_stop);
}

function getLatestAdSnapshots(snapshots: AdMetricSnapshotRow[]) {
  const daily = snapshots.filter(isDailyRow);

  if (daily.length > 8) return daily;

  const byKey = new Map<string, AdMetricSnapshotRow>();
  for (const snapshot of snapshots) {
    const accountId = snapshot.ad_account_id ?? "unknown";
    const campaignId = snapshot.campaign_id ?? "__no_campaign__";
    const key = `${accountId}::${campaignId}`;
    const current = byKey.get(key);
    if (!current || snapshot.metric_date_stop! > current.metric_date_stop!) {
      byKey.set(key, snapshot);
    }
  }
  return Array.from(byKey.values());
}

function getActionValue(snapshot: AdMetricSnapshotRow, actionType: string) {
  return Number(
    snapshot.raw_payload?.actions?.find((action) => action.action_type === actionType)?.value ?? 0
  );
}

function getResultActionValue(snapshot: AdMetricSnapshotRow, fallbackActions: number) {
  const thruPlays = getThruPlayValue(snapshot);
  if (thruPlays > 0) return thruPlays;

  for (const actionType of resultActionPriority) {
    const value = getActionValue(snapshot, actionType);
    if (value > 0) return value;
  }

  return Number(snapshot.engagement ?? 0) || fallbackActions;
}

function getThruPlayValue(snapshot: AdMetricSnapshotRow) {
  const watchedActions =
    snapshot.raw_payload?.video_thruplay_watched_actions?.reduce(
      (sum, action) => sum + Number(action.value ?? 0),
      0
    ) ?? 0;

  if (watchedActions > 0) return watchedActions;

  return getActionValue(snapshot, "video_thruplay") + getActionValue(snapshot, "thruplay");
}

function buildCampaignList(snapshots: AdMetricSnapshotRow[]) {
  const seen = new Map<string, string>();

  for (const s of snapshots) {
    if (s.campaign_id && s.campaign_name) {
      seen.set(s.campaign_id, s.campaign_name);
    }
  }

  return Array.from(seen.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

function buildChartData(
  snapshots: { metric_date: string; impressions: number; reach: number; engagement: number; followers: number }[]
) {
  const byDate = new Map<string, { impressions: number; reach: number; engagement: number; followers: number }>();

  for (const snapshot of snapshots) {
    const current = byDate.get(snapshot.metric_date) ?? { impressions: 0, reach: 0, engagement: 0, followers: 0 };
    current.impressions += snapshot.impressions ?? 0;
    current.reach += snapshot.reach ?? 0;
    current.engagement += snapshot.engagement ?? 0;
    current.followers = Math.max(current.followers, snapshot.followers ?? 0);
    byDate.set(snapshot.metric_date, current);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, value]) => ({
      day: new Intl.DateTimeFormat("es-PE", { weekday: "short" })
        .format(new Date(`${date}T00:00:00`))
        .slice(0, 1)
        .toUpperCase(),
      reach: value.reach,
      engagement: value.engagement,
      impressions: value.impressions,
      followers: value.followers
    }));
}

function buildFollowerGrowth(
  snapshots: { metric_date: string; followers: number; fan_adds: number; fan_removes: number }[]
) {
  const byDate = new Map<string, { followers: number; gained: number; lost: number }>();

  for (const s of snapshots) {
    const current = byDate.get(s.metric_date) ?? { followers: 0, gained: 0, lost: 0 };
    current.followers = Math.max(current.followers, s.followers ?? 0);
    current.gained += s.fan_adds ?? 0;
    current.lost += s.fan_removes ?? 0;
    byDate.set(s.metric_date, current);
  }

  const days = Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-30)
    .map(([date, value]) => ({ date, ...value }));

  const totalGained = days.reduce((sum, d) => sum + d.gained, 0);
  const totalLost = days.reduce((sum, d) => sum + d.lost, 0);

  return { days, totalGained, totalLost, netGrowth: totalGained - totalLost };
}

function buildComparison(
  snapshots: { metric_date: string; reach: number; engagement: number; followers: number }[]
) {
  const sorted = [...snapshots].sort((a, b) => a.metric_date.localeCompare(b.metric_date));
  const mid = Math.floor(sorted.length / 2);
  const current = sorted.slice(mid);
  const previous = sorted.slice(0, mid);

  const sumReach = (arr: typeof sorted) => arr.reduce((s, x) => s + (x.reach ?? 0), 0);
  const sumEng = (arr: typeof sorted) => arr.reduce((s, x) => s + (x.engagement ?? 0), 0);
  const maxFol = (arr: typeof sorted) => Math.max(0, ...arr.map((x) => x.followers ?? 0));

  const pReach = sumReach(previous) || 1;
  const pEng = sumEng(previous) || 1;
  const pFol = maxFol(previous) || 1;

  return {
    reachChange: ((sumReach(current) - pReach) / pReach) * 100,
    engagementChange: ((sumEng(current) - pEng) / pEng) * 100,
    followerChange: ((maxFol(current) - pFol) / pFol) * 100,
    adSpendChange: 0,
    adImpressionsChange: 0
  };
}

function buildCampaignComparison(adRows: AdMetricSnapshotRow[]) {
  const rows = adRows.filter((a) => a.campaign_id && isDailyRow(a));
  if (rows.length === 0) return [];

  const byCampaign = new Map<string, { campaignName: string; impressions: number; reach: number; spend: number; clicks: number }>();

  for (const s of rows) {
    const id = s.campaign_id!;
    const current = byCampaign.get(id) ?? { campaignName: s.campaign_name ?? "Sin nombre", impressions: 0, reach: 0, spend: 0, clicks: 0 };
    current.impressions += Number(s.impressions ?? 0);
    current.reach += Number(s.reach ?? 0);
    current.spend += Number(s.spend ?? 0);
    current.clicks += Number(s.clicks ?? 0);
    byCampaign.set(id, current);
  }

  return Array.from(byCampaign.entries())
    .map(([campaignId, v]) => ({
      campaignId,
      campaignName: v.campaignName,
      impressions: v.impressions,
      reach: v.reach,
      spend: v.spend,
      clicks: v.clicks,
      ctr: v.impressions > 0 ? (v.clicks / v.impressions) * 100 : 0
    }))
    .sort((a, b) => b.spend - a.spend);
}

function buildAdChart(adRows: AdMetricSnapshotRow[], campaignId?: string | null) {
  const daily = adRows.filter(isDailyRow);
  if (daily.length === 0) return [];

  const filtered = campaignId ? daily.filter((s) => s.campaign_id === campaignId) : daily;

  const byDate = new Map<string, { spend: number; impressions: number; reach: number; clicks: number }>();

  for (const s of filtered) {
    const date = s.metric_date_start!;
    const current = byDate.get(date) ?? { spend: 0, impressions: 0, reach: 0, clicks: 0 };
    current.spend += Number(s.spend ?? 0);
    current.impressions += Number(s.impressions ?? 0);
    current.reach += Number(s.reach ?? 0);
    current.clicks += Number(s.clicks ?? 0);
    byDate.set(date, current);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, value]) => ({
      day: new Intl.DateTimeFormat("es-PE", { weekday: "short" })
        .format(new Date(`${date}T00:00:00`))
        .slice(0, 1)
        .toUpperCase(),
      ...value
    }));
}
