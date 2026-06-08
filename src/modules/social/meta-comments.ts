import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { env } from "@/lib/config";
import { decryptToken } from "@/modules/social/token-vault";

type CommentRow = {
  id: string;
  comment_id: string;
  parent_id: string | null;
  message: string;
  from_name: string | null;
  created_time: string | null;
  is_hidden: boolean;
};

function graphUrl(path: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}${path}?${search.toString()}`;
}

async function getPageAccessToken(accountId: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient();

  const { data: account } = await supabase
    .from("social_accounts")
    .select("account_access_token_ciphertext, account_access_token_iv, account_access_token_tag")
    .eq("id", accountId)
    .single();

  if (!account?.account_access_token_ciphertext) return null;

  return decryptToken({
    ciphertext: account.account_access_token_ciphertext,
    iv: account.account_access_token_iv,
    tag: account.account_access_token_tag
  });
}

export async function getComments(
  accountId: string,
  organizationId: string
): Promise<CommentRow[]> {
  const accessToken = await getPageAccessToken(accountId);
  if (!accessToken) throw new Error("No access token for this account");

  const { data: account } = await createSupabaseAdminClient()
    .from("social_accounts")
    .select("provider_account_id")
    .eq("id", accountId)
    .single();

  if (!account) throw new Error("Account not found");

  const response = await fetch(
    graphUrl(`/${account.provider_account_id}/comments`, {
      fields: "id,parent_id,message,from{name},created_time,is_hidden",
      access_token: accessToken
    }),
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message ?? `Meta API error ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: {
      id: string;
      parent_id?: string;
      message?: string;
      from?: { name?: string };
      created_time?: string;
      is_hidden?: boolean;
    }[];
  };

  const supabase = createSupabaseAdminClient();
  const comments: CommentRow[] = [];

  for (const item of payload.data ?? []) {
    const { error: upsertError } = await supabase.from("page_comments").upsert({
      organization_id: organizationId,
      social_account_id: accountId,
      comment_id: item.id,
      parent_id: item.parent_id ?? null,
      message: item.message ?? "",
      from_name: item.from?.name ?? null,
      created_time: item.created_time ?? null,
      is_hidden: item.is_hidden ?? false,
      raw_payload: item
    }, { onConflict: "social_account_id,comment_id" });

    if (upsertError) throw upsertError;

    comments.push({
      id: item.id,
      comment_id: item.id,
      parent_id: item.parent_id ?? null,
      message: item.message ?? "",
      from_name: item.from?.name ?? null,
      created_time: item.created_time ?? null,
      is_hidden: item.is_hidden ?? false
    });
  }

  return comments;
}

export async function getCommentReplies(
  commentId: string,
  accountId: string
): Promise<CommentRow[]> {
  const accessToken = await getPageAccessToken(accountId);
  if (!accessToken) throw new Error("No access token for this account");

  const response = await fetch(
    graphUrl(`/${commentId}/comments`, {
      fields: "id,parent_id,message,from{name},created_time,is_hidden",
      access_token: accessToken
    }),
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message ?? `Meta API error ${response.status}`);
  }

  const payload = (await response.json()) as {
    data?: { id: string; parent_id?: string; message?: string; from?: { name?: string }; created_time?: string; is_hidden?: boolean }[];
  };

  return (payload.data ?? []).map((item) => ({
    id: item.id,
    comment_id: item.id,
    parent_id: item.parent_id ?? commentId,
    message: item.message ?? "",
    from_name: item.from?.name ?? null,
    created_time: item.created_time ?? null,
    is_hidden: item.is_hidden ?? false
  }));
}

export async function replyToComment(
  commentId: string,
  message: string,
  accountId: string
): Promise<string> {
  const accessToken = await getPageAccessToken(accountId);
  if (!accessToken) throw new Error("No access token for this account");

  const params = new URLSearchParams({ message, access_token: accessToken });
  const response = await fetch(
    `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}/${commentId}/replies?${params.toString()}`,
    { method: "POST", headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message ?? `Meta API error ${response.status}`);
  }

  const data = (await response.json()) as { id?: string };
  return data.id ?? "";
}

export async function deleteComment(
  commentId: string,
  accountId: string
): Promise<void> {
  const accessToken = await getPageAccessToken(accountId);
  if (!accessToken) throw new Error("No access token for this account");

  const response = await fetch(
    `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}/${commentId}?access_token=${accessToken}`,
    { method: "DELETE", headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    const err = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(err?.error?.message ?? `Meta API error ${response.status}`);
  }
}
