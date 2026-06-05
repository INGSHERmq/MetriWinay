import { createSupabaseServerClient } from "@/lib/supabase/server";
import { encryptToken } from "@/modules/social/token-vault";
import type { MetaDiscoveredAccount } from "@/modules/social/providers/meta";

export async function upsertMetaAccounts(input: {
  organizationId: string;
  oauthConnectionId: string;
  accounts: MetaDiscoveredAccount[];
}) {
  if (input.accounts.length === 0) return [];

  console.log("🔧 Iniciando upsert de cuentas sociales para organización:", input.organizationId);
  console.log("📋 Cuentas a procesar:", input.accounts.length);

  const supabase = await createSupabaseServerClient();
  const rows = input.accounts.map((account) => {
    const encrypted = account.accessToken ? encryptToken(account.accessToken) : null;

    const row = {
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
    
    console.log("🎯 Fila generada:", {
      username: row.username,
      providerAccountId: row.provider_account_id,
      hasToken: !!row.account_access_token_ciphertext
    });
    
    return row;
  });

  console.log("💾 Intentando upsert en social_accounts...");
  const { data, error } = await supabase
    .from("social_accounts")
    .upsert(rows, { onConflict: "provider,provider_account_id" })
    .select("id,username");

  if (error) {
    console.error("❌ Error en upsert de social_accounts:", error);
    throw error;
  }

  console.log("✅ Upsert exitoso. Cuentas guardadas:", data?.length || 0);
  console.log("📋 Cuentas guardadas:", data?.map(acc => acc.username) || []);
  return data ?? [];
}
