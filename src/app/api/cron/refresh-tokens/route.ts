import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/modules/social/token-vault";
import { encryptToken } from "@/modules/social/token-vault";
import { notifyTokenExpired } from "@/modules/social/notifications";

function graphUrl(path: string, params: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `https://graph.facebook.com/${env.META_GRAPH_API_VERSION}${path}?${search.toString()}`;
}

async function refreshMetaToken(currentToken: string): Promise<string | null> {
  const res = await fetch(
    graphUrl("/oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: env.META_CLIENT_ID ?? "",
      client_secret: env.META_CLIENT_SECRET ?? "",
      fb_exchange_token: currentToken
    }),
    { headers: { Accept: "application/json" } }
  );
  if (!res.ok) return null;
  const data = (await res.json()) as { access_token?: string };
  return data.access_token ?? null;
}

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const refreshBefore = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: connections, error } = await supabase
    .from("oauth_connections")
    .select("id,user_id,provider,refresh_failures,expires_at,access_token_ciphertext,access_token_iv,access_token_tag,scopes")
    .eq("status", "ACTIVE")
    .eq("provider", "meta")
    .lte("expires_at", refreshBefore);

  if (error) throw error;

  let refreshed = 0;
  let failed = 0;

  for (const connection of connections ?? []) {
    try {
      if (!connection.access_token_ciphertext || !connection.access_token_iv || !connection.access_token_tag) {
        failed++;
        continue;
      }

      const currentToken = decryptToken({
        ciphertext: connection.access_token_ciphertext,
        iv: connection.access_token_iv,
        tag: connection.access_token_tag
      });

      const newToken = await refreshMetaToken(currentToken);

      if (newToken) {
        const encrypted = await encryptToken(newToken);
        const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

        await supabase
          .from("oauth_connections")
          .update({
            access_token_ciphertext: encrypted.ciphertext,
            access_token_iv: encrypted.iv,
            access_token_tag: encrypted.tag,
            refresh_failures: 0,
            expires_at: expiresAt
          })
          .eq("id", connection.id);

        refreshed++;
      } else {
        throw new Error("refresh returned null");
      }
    } catch {
      const failures = (connection.refresh_failures ?? 0) + 1;
      await supabase
        .from("oauth_connections")
        .update({
          refresh_failures: failures,
          status: failures >= 3 ? "TOKEN_EXPIRED" : "ACTIVE"
        })
        .eq("id", connection.id);

      if (failures >= 3) {
        await notifyTokenExpired({
          userId: connection.user_id,
          accountLabel: connection.provider
        });
      }

      failed++;
    }
  }

  return NextResponse.json({ checked: connections?.length ?? 0, refreshed, failed });
}
