import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/config";
import { decryptToken } from "@/modules/social/token-vault";

function graphUrl(path: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}${path}?${search.toString()}`;
}

async function getPageAccessToken(accountId: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient();

  const { data: account } = await supabase
    .from("social_accounts")
    .select("provider_account_id, account_access_token_ciphertext, account_access_token_iv, account_access_token_tag")
    .eq("id", accountId)
    .single();

  if (!account?.account_access_token_ciphertext) return null;

  return decryptToken({
    ciphertext: account.account_access_token_ciphertext,
    iv: account.account_access_token_iv,
    tag: account.account_access_token_tag
  });
}

export type BrandedContentPost = {
  id: string;
  message?: string;
  created_time?: string;
  is_branded_content?: boolean;
  tags?: { id: string; name: string }[];
};

export type EligiblePartner = {
  id: string;
  name: string;
  picture?: string;
};

export async function getBrandedContentPosts(
  accountId: string
): Promise<BrandedContentPost[]> {
  const accessToken = await getPageAccessToken(accountId);
  if (!accessToken) throw new Error("No access token");

  const { data: account } = await createSupabaseAdminClient()
    .from("social_accounts")
    .select("provider_account_id")
    .eq("id", accountId)
    .single();

  if (!account) throw new Error("Account not found");

  const response = await fetch(
    graphUrl(`/${account.provider_account_id}/feed`, {
      fields: "id,message,created_time,is_branded_content,tags{id,name}",
      access_token: accessToken
    }),
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message ?? `Meta API error ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: BrandedContentPost[];
  };

  return (payload.data ?? []).filter((p) => p.is_branded_content);
}

export async function getEligiblePartners(
  accountId: string
): Promise<EligiblePartner[]> {
  const accessToken = await getPageAccessToken(accountId);
  if (!accessToken) throw new Error("No access token");

  const { data: account } = await createSupabaseAdminClient()
    .from("social_accounts")
    .select("provider_account_id")
    .eq("id", accountId)
    .single();

  if (!account) throw new Error("Account not found");

  const response = await fetch(
    graphUrl(`/${account.provider_account_id}/eligible_partners`, {
      fields: "id,name,picture{url}",
      access_token: accessToken
    }),
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message ?? `Meta API error ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: { id: string; name: string; picture?: { data?: { url?: string } } }[];
  };

  return (payload.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    picture: p.picture?.data?.url
  }));
}

export async function createBrandedContentPost(
  accountId: string,
  message: string,
  partnerIds: string[],
  mediaUrl?: string
): Promise<string> {
  const accessToken = await getPageAccessToken(accountId);
  if (!accessToken) throw new Error("No access token");

  const { data: account } = await createSupabaseAdminClient()
    .from("social_accounts")
    .select("provider_account_id")
    .eq("id", accountId)
    .single();

  if (!account) throw new Error("Account not found");

  const params: Record<string, string> = {
    message,
    is_branded_content: "true",
    access_token: accessToken
  };

  if (partnerIds.length > 0) {
    params.tags = partnerIds.join(",");
    params.branded_content_sponsor_id = partnerIds[0];
  }

  let url: string;
  if (mediaUrl) {
    url = graphUrl(`/${account.provider_account_id}/photos`, {
      ...params,
      url: mediaUrl
    });
  } else {
    url = graphUrl(`/${account.provider_account_id}/feed`, params);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message ?? `Meta API error ${response.status}`);
  }

  const data = (await response.json()) as { id?: string };
  return data.id ?? "";
}

export async function getBrandedContentInsights(
  accountId: string,
  brandedPostId: string
) {
  const accessToken = await getPageAccessToken(accountId);
  if (!accessToken) throw new Error("No access token");

  const response = await fetch(
    graphUrl(`/${brandedPostId}/insights`, {
      metric: "post_impressions,post_engaged_users,post_reactions_by_type_total",
      access_token: accessToken
    }),
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) return null;

  return (await response.json()) as { data?: { name: string; values?: { value: number }[] }[] };
}
