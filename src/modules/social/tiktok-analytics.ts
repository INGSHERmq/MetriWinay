import { createSupabaseServerClient } from "@/lib/supabase/server";
import { decryptToken } from "@/modules/social/token-vault";
import { ingestMetricSnapshot } from "@/modules/social/analytics";

type AccountRow = {
  id: string;
  organization_id: string;
  provider_account_id: string;
  username: string;
  account_type: string;
  account_access_token_ciphertext: string | null;
  account_access_token_iv: string | null;
  account_access_token_tag: string | null;
};

type TikTokUser = {
  open_id: string;
  display_name?: string;
  follower_count?: number;
  following_count?: number;
  likes_count?: number;
  video_count?: number;
};

type TikTokVideo = {
  id: string;
  title?: string;
  view_count?: number;
  like_count?: number;
  comment_count?: number;
  share_count?: number;
  create_time?: number;
};

function tiktokApiUrl(path: string) {
  return `https://open.tiktokapis.com/v2${path}`;
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

export async function syncTikTokAnalyticsForOrganization(organizationId: string) {
  const supabase = await createSupabaseServerClient();

  const { data: accounts, error } = await supabase
    .from("social_accounts")
    .select(
      "id,organization_id,provider_account_id,username,account_type,account_access_token_ciphertext,account_access_token_iv,account_access_token_tag"
    )
    .eq("organization_id", organizationId)
    .eq("provider", "tiktok")
    .eq("status", "ACTIVE");

  if (error) throw error;

  const results = [];
  for (const account of (accounts ?? []) as AccountRow[]) {
    const result = await syncTikTokAccountAnalytics(account);
    results.push(result);
  }
  return results;
}

async function syncTikTokAccountAnalytics(account: AccountRow) {
  const accessToken = getAccountToken(account);
  if (!accessToken) {
    return { accountId: account.id, ok: false, reason: "missing_token" };
  }

  const user = await fetchTikTokUser(accessToken);
  if (!user?.open_id) {
    return { accountId: account.id, ok: false, reason: "fetch_user_failed" };
  }

  const today = new Date().toISOString().slice(0, 10);

  // Store profile-level stats in dedicated columns that don't overlap with video aggregates:
  //   impressions_organic → video_count  (total videos on the profile)
  //   fan_adds           → following_count
  //   impressions_unique / impressions_paid are reserved for video comment/share sums
  await ingestMetricSnapshot({
    organizationId: account.organization_id,
    socialAccountId: account.id,
    providerMetricId: "tiktok_user_daily",
    metricDate: today,
    impressions: 0,
    reach: 0,
    engagement: user.likes_count ?? 0,
    followers: user.follower_count ?? 0,
    detailed: {
      impressionsUnique: 0,
      impressionsPaid: 0,
      impressionsOrganic: user.video_count ?? 0,
      engagedUsers: 0,
      fanAdds: user.following_count ?? 0,
      fanRemoves: 0,
      pageViews: 0
    }
  });

  const videos = await fetchTikTokVideos(accessToken);
  const videoResults = await syncTikTokVideos(account, videos, today);

  return {
    accountId: account.id,
    ok: true,
    followerCount: user.follower_count,
    likeCount: user.likes_count,
    videoCount: user.video_count,
    videosSynced: videoResults.length
  };
}

async function fetchTikTokUser(accessToken: string): Promise<TikTokUser | null> {
  const response = await fetch(
    tiktokApiUrl(`/user/info/?fields=open_id,display_name,follower_count,following_count,likes_count,video_count`),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    }
  );

  if (response.ok) {
    const payload = (await response.json()) as {
      data?: { user?: TikTokUser };
    };
    if (payload.data?.user?.open_id) {
      return payload.data.user;
    }
  }

  // Fallback to basic fields if stats fields fail (e.g. due to missing user.info.stats scope)
  const fallbackResponse = await fetch(
    tiktokApiUrl(`/user/info/?fields=open_id,display_name`),
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json"
      }
    }
  );

  if (!fallbackResponse.ok) return null;

  const payload = (await fallbackResponse.json()) as {
    data?: { user?: TikTokUser };
  };

  return payload.data?.user ?? null;
}

async function fetchTikTokVideos(accessToken: string): Promise<TikTokVideo[]> {
  const MAX_VIDEOS = 20;
  const fields = "id,title,view_count,like_count,comment_count,share_count,create_time";
  const maxCount = Math.min(MAX_VIDEOS, 20);

  const response = await fetch(
    tiktokApiUrl(`/video/list/?fields=${fields}&max_count=${maxCount}`),
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify({})
    }
  );

  if (!response.ok) return [];

  const payload = (await response.json()) as {
    data?: { videos?: TikTokVideo[] };
  };

  return payload.data?.videos ?? [];
}

async function syncTikTokVideos(
  account: AccountRow,
  videos: TikTokVideo[],
  metricDate: string
) {
  if (videos.length === 0) return [];

  const supabase = await createSupabaseServerClient();

  for (const video of videos) {
    const videoDate = video.create_time
      ? new Date(video.create_time * 1000).toISOString().slice(0, 10)
      : metricDate;

    const { error } = await supabase.from("metric_snapshots").upsert(
      {
        organization_id: account.organization_id,
        social_account_id: account.id,
        provider_metric_id: "tiktok_video_stats",
        metric_date: videoDate,
        impressions: video.view_count ?? 0,
        reach: video.view_count ?? 0,
        engagement: video.like_count ?? 0,
        followers: 0,
        impressions_unique: video.comment_count ?? 0,
        impressions_paid: video.share_count ?? 0,
        impressions_organic: 0,
        engaged_users: 0,
        fan_adds: 0,
        fan_removes: 0,
        page_views: 0
      },
      {
        onConflict: "social_account_id,provider_metric_id,metric_date"
      }
    );

    if (error) {
      console.error("Error inserting TikTok video metric:", error);
    }
  }

  return videos;
}
