import { env } from "@/lib/config";
import type { OAuthTokenSet } from "@/modules/social/types";

const META_AUTH_HOST = "https://www.facebook.com";
const META_GRAPH_HOST = "https://graph.facebook.com";

const META_BASIC_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "read_insights",
  "ads_read"
];

const META_PUBLISHING_SCOPES = [
  ...META_BASIC_SCOPES,
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "instagram_manage_insights"
];

type MetaPage = {
  id: string;
  name: string;
  access_token?: string;
  picture?: { data?: { url?: string } };
  instagram_business_account?: {
    id: string;
    username?: string;
    profile_picture_url?: string;
  };
};

export type MetaDiscoveredAccount = {
  providerAccountId: string;
  username: string;
  avatarUrl?: string;
  accountType: "facebook_page" | "instagram_business";
  accessToken?: string;
};

export function getMetaScopes() {
  return env.META_OAUTH_SCOPE_MODE === "publishing"
    ? META_PUBLISHING_SCOPES
    : META_BASIC_SCOPES;
}

function graphUrl(path: string, params?: Record<string, string>) {
  const search = new URLSearchParams(params);
  return `${META_GRAPH_HOST}/${env.META_GRAPH_API_VERSION}${path}${
    search.size ? `?${search.toString()}` : ""
  }`;
}

export function buildMetaAuthorizationUrl(state: string) {
  if (!env.META_CLIENT_ID || !env.META_REDIRECT_URI) {
    throw new Error("META_CLIENT_ID and META_REDIRECT_URI are required.");
  }

  const params = new URLSearchParams({
    client_id: env.META_CLIENT_ID,
    redirect_uri: env.META_REDIRECT_URI,
    response_type: "code",
    state,
    auth_type: "rerequest",
    scope: getMetaScopes().join(",")
  });

  return `${META_AUTH_HOST}/${env.META_GRAPH_API_VERSION}/dialog/oauth?${params.toString()}`;
}

export async function exchangeMetaCodeForToken(code: string): Promise<OAuthTokenSet> {
  if (!env.META_CLIENT_ID || !env.META_CLIENT_SECRET || !env.META_REDIRECT_URI) {
    throw new Error("Meta OAuth env vars are required.");
  }

  const params = new URLSearchParams({
    client_id: env.META_CLIENT_ID,
    client_secret: env.META_CLIENT_SECRET,
    redirect_uri: env.META_REDIRECT_URI,
    code
  });

  const response = await fetch(graphUrl("/oauth/access_token", Object.fromEntries(params)), {
    method: "GET",
    headers: { Accept: "application/json" }
  });

  if (!response.ok) {
    throw new Error(`Meta token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
    scopes: getMetaScopes()
  };
}

export async function exchangeForLongLivedToken(accessToken: string): Promise<OAuthTokenSet> {
  if (!env.META_CLIENT_SECRET) {
    throw new Error("META_CLIENT_SECRET is required.");
  }

  const response = await fetch(
    graphUrl("/oauth/access_token", {
      grant_type: "fb_exchange_token",
      client_id: env.META_CLIENT_ID ?? "",
      client_secret: env.META_CLIENT_SECRET,
      fb_exchange_token: accessToken
    }),
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    throw new Error(`Meta long-lived token exchange failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in?: number;
  };

  return {
    accessToken: data.access_token,
    expiresAt: data.expires_in
      ? new Date(Date.now() + data.expires_in * 1000).toISOString()
      : undefined,
    scopes: getMetaScopes()
  };
}

export async function discoverMetaAccounts(
  accessToken: string
): Promise<MetaDiscoveredAccount[]> {
  const response = await fetch(
    graphUrl("/me/accounts", {
      fields:
        "id,name,access_token,picture{url},instagram_business_account{id,username,profile_picture_url}",
      access_token: accessToken
    }),
    { headers: { Accept: "application/json" } }
  );

  if (!response.ok) {
    throw new Error(`Meta account discovery failed: ${response.status}`);
  }

  const payload = (await response.json()) as { data?: MetaPage[] };
  return (payload.data ?? []).flatMap((page) => {
    const accounts: MetaDiscoveredAccount[] = [
      {
        providerAccountId: page.id,
        username: page.name,
        avatarUrl: page.picture?.data?.url,
        accountType: "facebook_page",
        accessToken: page.access_token
      }
    ];

    if (page.instagram_business_account) {
      accounts.push({
        providerAccountId: page.instagram_business_account.id,
        username: page.instagram_business_account.username ?? page.name,
        avatarUrl: page.instagram_business_account.profile_picture_url,
        accountType: "instagram_business",
        accessToken: page.access_token
      });
    }

    return accounts;
  });
}
