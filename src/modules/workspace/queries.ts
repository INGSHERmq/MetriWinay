import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { SocialAccount } from "@/modules/social/types";

export type WorkspaceData = {
  organizationId: string | null;
  organizationName: string;
  accounts: SocialAccount[];
  activeAccountId: string | null;
  activeAccount: SocialAccount | null;
  queue: { id: string; title: string; date: string; status: string }[];
  metrics: { reach: number; engagement: number; followers: number; posts: number };
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
  chart: { day: string; reach: number; engagement: number }[];
};

type AdMetricSnapshotRow = {
  ad_account_id: string | null;
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

export async function getWorkspaceData(accountId?: string | null): Promise<WorkspaceData> {
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
        .select("id,body,scheduled_for,status")
        .eq("organization_id", organizationId)
        .order("scheduled_for", { ascending: true, nullsFirst: false })
        .limit(5),
      (() => {
        const snapshotsQuery = supabase
          .from("metric_snapshots")
          .select("metric_date,provider_metric_id,reach,engagement,followers,social_account_id")
          .eq("organization_id", organizationId)
          .not("provider_metric_id", "like", "meta_ads_%")
          .order("metric_date", { ascending: false })
          .limit(50);
        return accountId ? snapshotsQuery.eq("social_account_id", accountId) : snapshotsQuery;
      })(),
supabase
          .from("ad_metric_snapshots")
          .select("ad_account_id,metric_date_start,metric_date_stop,impressions,reach,spend,clicks,engagement,raw_payload")
          .eq("organization_id", organizationId)
          .order("metric_date_stop", { ascending: false })
          .limit(50)
    ]);

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
  const adMetrics = buildAdMetrics((adSnapshots ?? []) as AdMetricSnapshotRow[]);

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
      status: post.status
    })),
    metrics: { reach, engagement, followers, posts: posts?.length ?? 0 },
    adMetrics,
    chart: buildChartData(snapshots ?? [])
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
    metrics: { reach: 0, engagement: 0, followers: 0, posts: 0 },
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
    chart: []
  };
}

function buildAdMetrics(snapshots: AdMetricSnapshotRow[]) {
  const latestSnapshots = getLatestAdSnapshots(snapshots);
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

function getLatestAdSnapshots(snapshots: AdMetricSnapshotRow[]) {
  const byAccount = new Map<string, AdMetricSnapshotRow>();

  for (const snapshot of snapshots) {
    const accountId = snapshot.ad_account_id ?? "unknown";
    const current = byAccount.get(accountId);

    if (!current || isPreferredAdSnapshot(snapshot, current)) {
      byAccount.set(accountId, snapshot);
    }
  }

  return Array.from(byAccount.values());
}

function isPreferredAdSnapshot(candidate: AdMetricSnapshotRow, current: AdMetricSnapshotRow) {
  const candidateStop = candidate.metric_date_stop ?? "";
  const currentStop = current.metric_date_stop ?? "";

  if (candidateStop !== currentStop) {
    return candidateStop > currentStop;
  }

  const candidateStart = candidate.metric_date_start ?? "";
  const currentStart = current.metric_date_start ?? "";

  if (candidateStart !== currentStart) {
    return candidateStart < currentStart;
  }

  return false;
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

function buildChartData(
  snapshots: { metric_date: string; reach: number; engagement: number }[]
) {
  const byDate = new Map<string, { reach: number; engagement: number }>();

  for (const snapshot of snapshots) {
    const current = byDate.get(snapshot.metric_date) ?? { reach: 0, engagement: 0 };
    current.reach += snapshot.reach ?? 0;
    current.engagement += snapshot.engagement ?? 0;
    byDate.set(snapshot.metric_date, current);
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-7)
    .map(([date, value]) => ({
      day: new Intl.DateTimeFormat("es-PE", { weekday: "short" })
        .format(new Date(`${date}T00:00:00`))
        .slice(0, 1)
        .toUpperCase(),
      reach: value.reach,
      engagement: value.engagement
    }));
}
