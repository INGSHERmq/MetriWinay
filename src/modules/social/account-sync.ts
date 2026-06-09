import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptToken } from "@/modules/social/token-vault";
import type { MetaDiscoveredAccount } from "@/modules/social/providers/meta";
import type { TikTokDiscoveredAccount } from "@/modules/social/providers/tiktok";

export async function upsertMetaAccounts(input: {
  organizationId: string;
  oauthConnectionId: string;
  accounts: MetaDiscoveredAccount[];
}) {
  if (input.accounts.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const rows = input.accounts.map((account) => {
    const encrypted = account.accessToken ? encryptToken(account.accessToken) : null;
    return {
      organization_id: input.organizationId,
      oauth_connection_id: input.oauthConnectionId,
      provider: "meta",
      provider_account_id: account.providerAccountId,
      username: account.username,
      avatar_url: account.avatarUrl,
      account_type: account.accountType,
      account_access_token_ciphertext: encrypted?.ciphertext,
      account_access_token_iv: encrypted?.iv,
      account_access_token_tag: encrypted?.tag,
      status: "ACTIVE",
      last_sync_at: new Date().toISOString()
    };
  });

  const { data, error } = await supabase
    .from("social_accounts")
    .upsert(rows, { onConflict: "provider,provider_account_id" })
    .select("id,username");

  if (error) throw error;
  return data ?? [];
}

export async function upsertTikTokAccounts(input: {
  organizationId: string;
  oauthConnectionId: string;
  accounts: TikTokDiscoveredAccount[];
}) {
  if (input.accounts.length === 0) return [];

  const supabase = await createSupabaseServerClient();
  const rows = input.accounts.map((account) => {
    const encrypted = account.accessToken ? encryptToken(account.accessToken) : null;
    return {
      organization_id: input.organizationId,
      oauth_connection_id: input.oauthConnectionId,
      provider: "tiktok",
      provider_account_id: account.providerAccountId,
      username: account.username,
      avatar_url: account.avatarUrl,
      account_type: account.accountType,
      account_access_token_ciphertext: encrypted?.ciphertext,
      account_access_token_iv: encrypted?.iv,
      account_access_token_tag: encrypted?.tag,
      status: "ACTIVE",
      last_sync_at: new Date().toISOString()
    };
  });

  const { data, error } = await supabase
    .from("social_accounts")
    .upsert(rows, { onConflict: "provider,provider_account_id" })
    .select("id,username");

  if (error) throw error;
  return data ?? [];
}
