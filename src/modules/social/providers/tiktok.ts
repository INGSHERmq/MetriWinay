import { env } from "@/lib/config";
import type { OAuthTokenSet } from "@/modules/social/types";

const TIKTOK_AUTH_HOST = "https://www.tiktok.com";
const TIKTOK_API_HOST = "https://open.tiktokapis.com";

const TIKTOK_SCOPES = [
  "user.info.basic",
  "user.info.profile",
  "video.upload",
  "video.publish",
  "video.list"
];

export type TikTokDiscoveredAccount = {
  providerAccountId: string;
  username: string;
  avatarUrl?: string;
  accountType: "tiktok_user" | "tiktok_business";
  accessToken?: string;
};

function tiktokApiUrl(path: string, params?: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `${TIKTOK_API_HOST}/v2${path}${search.size ? `?${search.toString()}` : ""}`;
}

export function buildTikTokAuthorizationUrlParams(state: string, codeChallenge: string) {
  if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_REDIRECT_URI) {
    throw new Error("TIKTOK_CLIENT_KEY and TIKTOK_REDIRECT_URI are required.");
  }

  const params = new URLSearchParams({
    client_key: env.TIKTOK_CLIENT_KEY,
    redirect_uri: env.TIKTOK_REDIRECT_URI,
    response_type: "code",
    state,
    scope: TIKTOK_SCOPES.join(","),
    code_challenge: codeChallenge,
    code_challenge_method: "S256"
  });

  return `${TIKTOK_AUTH_HOST}/v2/auth/authorize/?${params.toString()}`;
}

export async function exchangeTikTokCodeForToken(code: string, codeVerifier?: string): Promise<OAuthTokenSet> {
  if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET || !env.TIKTOK_REDIRECT_URI) {
    throw new Error("TikTok OAuth env vars are required.");
  }

  const body = new URLSearchParams({
    client_key: env.TIKTOK_CLIENT_KEY,
    client_secret: env.TIKTOK_CLIENT_SECRET,
    redirect_uri: env.TIKTOK_REDIRECT_URI,
    code,
    grant_type: "authorization_code"
  });

  if (codeVerifier) {
    body.set("code_verifier", codeVerifier);
  }

  const response = await fetch(tiktokApiUrl("/oauth/token/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache"
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TikTok token exchange failed: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_expires_in?: number;
    scope?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
    scopes: data.scope?.split(",") ?? TIKTOK_SCOPES
  };
}

export async function refreshTikTokToken(refreshToken: string): Promise<OAuthTokenSet> {
  if (!env.TIKTOK_CLIENT_KEY || !env.TIKTOK_CLIENT_SECRET) {
    throw new Error("TikTok OAuth env vars are required.");
  }

  const body = new URLSearchParams({
    client_key: env.TIKTOK_CLIENT_KEY,
    client_secret: env.TIKTOK_CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });

  const response = await fetch(tiktokApiUrl("/oauth/token/"), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Cache-Control": "no-cache"
    },
    body: body.toString()
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TikTok token refresh failed: ${response.status} - ${errorText}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    refresh_expires_in?: number;
    scope?: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
    scopes: data.scope?.split(",") ?? TIKTOK_SCOPES
  };
}

export async function discoverTikTokAccounts(
  accessToken: string
): Promise<TikTokDiscoveredAccount[]> {
  const response = await fetch(tiktokApiUrl("/user/info/", {
    fields: "open_id,union_id,avatar_url,avatar_url_100,avatar_url_720,display_name,bio_text"
  }), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json"
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TikTok account discovery failed: ${response.status} - ${errorText}`);
  }

  const payload = (await response.json()) as {
    data?: {
      user?: {
        open_id: string;
        union_id?: string;
        avatar_url?: string;
        avatar_url_100?: string;
        avatar_url_720?: string;
        display_name?: string;
        bio_text?: string;
      };
    };
  };

  const user = payload.data?.user;
  if (!user?.open_id) {
    return [];
  }

  return [
    {
      providerAccountId: user.open_id,
      username: user.display_name ?? "TikTok User",
      avatarUrl: user.avatar_url_100 ?? user.avatar_url,
      accountType: "tiktok_user",
      accessToken: undefined
    }
  ];
}
