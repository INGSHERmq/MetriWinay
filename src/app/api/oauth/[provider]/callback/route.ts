import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parseOAuthState } from "@/modules/social/oauth";
import { upsertMetaAccounts, upsertTikTokAccounts } from "@/modules/social/account-sync";
import {
  discoverMetaAccounts,
  exchangeForLongLivedToken,
  exchangeMetaCodeForToken,
  type MetaDiscoveredAccount
} from "@/modules/social/providers/meta";
import {
  discoverTikTokAccounts,
  exchangeTikTokCodeForToken,
  type TikTokDiscoveredAccount
} from "@/modules/social/providers/tiktok";
import { syncMetaAnalyticsForOrganization } from "@/modules/social/meta-analytics";
import { encryptToken } from "@/modules/social/token-vault";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (provider !== "meta" && provider !== "tiktok") {
    return NextResponse.json({ error: "Provider not supported." }, { status: 404 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json({ error: "Missing OAuth code or state." }, { status: 400 });
  }

  const parsedState = parseOAuthState(state);
  if (parsedState.provider !== provider) {
    return NextResponse.json({ error: "OAuth provider mismatch." }, { status: 400 });
  }

  const tokens = provider === "meta"
    ? await exchangeMetaCodeForToken(code)
    : await exchangeTikTokCodeForToken(code, parsedState.codeVerifier);

  if (provider === "meta") {
    const longLived = await exchangeForLongLivedToken(tokens.accessToken);
    Object.assign(tokens, longLived);
  }

  const encryptedAccessToken = encryptToken(tokens.accessToken);
  const encryptedRefreshToken = tokens.refreshToken
    ? encryptToken(tokens.refreshToken)
    : null;

  const supabase = await createSupabaseServerClient();

  const insertData = {
    user_id: parsedState.userId,
    provider,
    scopes: tokens.scopes,
    access_token_ciphertext: encryptedAccessToken.ciphertext,
    access_token_iv: encryptedAccessToken.iv,
    access_token_tag: encryptedAccessToken.tag,
    refresh_token_ciphertext: encryptedRefreshToken?.ciphertext,
    refresh_token_iv: encryptedRefreshToken?.iv,
    refresh_token_tag: encryptedRefreshToken?.tag,
    expires_at: tokens.expiresAt,
    status: "ACTIVE"
  };

  const { data: connection, error } = await supabase
    .from("oauth_connections")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({
      error: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    }, { status: 500 });
  }

  if (provider === "meta") {
    let accounts: MetaDiscoveredAccount[] = [];
    try {
      accounts = await discoverMetaAccounts(tokens.accessToken);
    } catch (discoveryError) {
      await supabase.from("integration_events").insert({
        organization_id: parsedState.organizationId,
        provider,
        event_type: "META_ACCOUNT_DISCOVERY_FAILED",
        payload: {
          message: discoveryError instanceof Error ? discoveryError.message : "Unknown account discovery error"
        }
      });
    }

    await upsertMetaAccounts({
      organizationId: parsedState.organizationId,
      oauthConnectionId: connection.id,
      accounts
    });

    await syncMetaAnalyticsForOrganization(parsedState.organizationId);
  }

  if (provider === "tiktok") {
    let accounts: TikTokDiscoveredAccount[] = [];
    try {
      accounts = await discoverTikTokAccounts(tokens.accessToken);
    } catch (discoveryError) {
      await supabase.from("integration_events").insert({
        organization_id: parsedState.organizationId,
        provider,
        event_type: "TIKTOK_ACCOUNT_DISCOVERY_FAILED",
        payload: {
          message: discoveryError instanceof Error ? discoveryError.message : "Unknown account discovery error"
        }
      });
    }

    await upsertTikTokAccounts({
      organizationId: parsedState.organizationId,
      oauthConnectionId: connection.id,
      accounts
    });
  }

  const redirectUrl = new URL("/", request.url);
  redirectUrl.searchParams.set("connected", String(1));
  return NextResponse.redirect(redirectUrl);
}
