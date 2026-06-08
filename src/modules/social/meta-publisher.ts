import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/config";
import { decryptToken } from "@/modules/social/token-vault";
import { getRateLimitKey, takeToken } from "@/modules/social/rate-limit";

type PostRow = {
  id: string;
  organization_id: string;
  body: string;
  media_urls: string[];
  post_type: "feed" | "story" | "reel";
};

type PublishResult = {
  targetId: string;
  ok: boolean;
  providerPostId?: string;
  error?: string;
};

function graphUrl(path: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}${path}?${search.toString()}`;
}

async function graphPost(
  path: string,
  params: Record<string, string>,
  accessToken: string
): Promise<{ ok: boolean; data?: { id?: string }; error?: string }> {
  params.access_token = accessToken;
  const response = await fetch(graphUrl(path, params), {
    method: "POST",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null) as { error?: { message?: string } } | null;
    return { ok: false, error: body?.error?.message ?? `HTTP ${response.status}` };
  }

  const data = (await response.json()) as { id?: string };
  return { ok: true, data };
}

async function publishToFacebookPage(
  pageId: string,
  post: PostRow,
  accessToken: string
): Promise<string> {
  if (post.media_urls.length > 0) {
    if (post.post_type === "story") {
      const result = await graphPost(`/${pageId}/stories`, {
        photo_url: post.media_urls[0]
      }, accessToken);
      if (!result.ok) throw new Error(result.error);
      return result.data!.id!;
    }

    const result = await graphPost(`/${pageId}/photos`, {
      url: post.media_urls[0],
      message: post.body
    }, accessToken);
    if (!result.ok) throw new Error(result.error);
    return result.data!.id!;
  }

  const result = await graphPost(`/${pageId}/feed`, {
    message: post.body
  }, accessToken);
  if (!result.ok) throw new Error(result.error);
  return result.data!.id!;
}

async function publishToInstagram(
  post: PostRow,
  igUserId: string,
  accessToken: string
): Promise<string> {
  if (post.media_urls.length === 0) {
    throw new Error("Instagram requiere al menos una imagen o video");
  }

  const mediaParams: Record<string, string> = {
    image_url: post.media_urls[0],
    caption: post.body
  };

  if (post.post_type === "story") {
    mediaParams.media_type = "STORIES";
  } else if (post.post_type === "reel") {
    mediaParams.media_type = "REELS";
    const isVideo = post.media_urls[0].match(/\.(mp4|mov|avi|webm)$/i);
    if (!isVideo) {
      throw new Error("Reels requiere un archivo de video");
    }
  }

  const creation = await graphPost(`/${igUserId}/media`, mediaParams, accessToken);
  if (!creation.ok) throw new Error(creation.error);

  const publishResult = await graphPost(`/${igUserId}/media_publish`, {
    creation_id: creation.data!.id!
  }, accessToken);
  if (!publishResult.ok) throw new Error(publishResult.error);

  return publishResult.data!.id!;
}

export async function publishSingleTarget(targetId: string): Promise<PublishResult> {
  const supabase = createSupabaseAdminClient();

  const { data: target } = await supabase
    .from("post_targets")
    .select("id, post_id, social_account_id, status, post_type")
    .eq("id", targetId)
    .single();

  if (!target) return { targetId, ok: false, error: "Target not found" };

  const rateKey = getRateLimitKey("meta", target.social_account_id, "publish");
  const bucket = takeToken(rateKey, 10, 1 / 60);
  if (!bucket.allowed) {
    return { targetId, ok: false, error: "Rate limited. Try again later." };
  }

  await supabase.from("post_targets").update({ status: "PUBLISHING" }).eq("id", targetId);

  try {
    const { data: post } = await supabase
      .from("posts")
      .select("id, organization_id, body, media_urls, post_type")
      .eq("id", target.post_id)
      .single();

    if (!post) throw new Error("Post not found");

    const { data: account } = await supabase
      .from("social_accounts")
      .select("id, organization_id, provider_account_id, account_type, account_access_token_ciphertext, account_access_token_iv, account_access_token_tag")
      .eq("id", target.social_account_id)
      .single();

    if (!account) throw new Error("Account not found");

    if (!account.account_access_token_ciphertext || !account.account_access_token_iv || !account.account_access_token_tag) {
      throw new Error("Account has no access token");
    }

    const accessToken = decryptToken({
      ciphertext: account.account_access_token_ciphertext,
      iv: account.account_access_token_iv,
      tag: account.account_access_token_tag
    });

    let providerPostId: string;

    if (account.account_type === "instagram_business") {
      providerPostId = await publishToInstagram(post, account.provider_account_id, accessToken);
    } else {
      providerPostId = await publishToFacebookPage(account.provider_account_id, post, accessToken);
    }

    await supabase.from("post_targets").update({
      status: "PUBLISHED",
      provider_post_id: providerPostId,
      error_message: null
    }).eq("id", targetId);

    const allPublished = await checkAllTargetsPublished(post.id);
    if (allPublished) {
      await supabase.from("posts").update({
        status: "PUBLISHED",
        published_at: new Date().toISOString()
      }).eq("id", post.id);
    }

    return { targetId, ok: true, providerPostId };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";

    const { data: current } = await supabase
      .from("post_targets")
      .select("attempts")
      .eq("id", targetId)
      .single();

    await supabase.from("post_targets").update({
      status: "FAILED",
      error_message: message,
      attempts: (current?.attempts ?? 0) + 1
    }).eq("id", targetId);

    return { targetId, ok: false, error: message };
  }
}

async function checkAllTargetsPublished(postId: string): Promise<boolean> {
  const supabase = createSupabaseAdminClient();

  const { data: targets } = await supabase
    .from("post_targets")
    .select("status")
    .eq("post_id", postId);

  if (!targets || targets.length === 0) return false;
  return targets.every((t: Record<string, unknown>) => t.status === "PUBLISHED");
}

export async function processPublishingQueue(): Promise<PublishResult[]> {
  const supabase = createSupabaseAdminClient();

  const { data: targets, error } = await supabase
    .from("post_targets")
    .select("id")
    .eq("status", "SCHEDULED")
    .order("created_at", { ascending: true })
    .limit(10);

  if (error) throw error;
  if (!targets || targets.length === 0) return [];

  const results: PublishResult[] = [];
  for (const target of targets) {
    const result = await publishSingleTarget(target.id);
    results.push(result);
  }

  return results;
}
