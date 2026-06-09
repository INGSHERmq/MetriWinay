import crypto from "node:crypto";
import { buildMetaAuthorizationUrl } from "@/modules/social/providers/meta";
import type { SocialProvider } from "@/modules/social/types";

export function createOAuthState(input: {
  userId: string;
  provider: SocialProvider;
  organizationId: string;
  codeVerifier?: string;
}) {
  const nonce = crypto.randomBytes(16).toString("hex");
  return Buffer.from(JSON.stringify({ ...input, nonce })).toString("base64url");
}

export function parseOAuthState(state: string): {
  userId: string;
  provider: SocialProvider;
  organizationId: string;
  nonce: string;
  codeVerifier?: string;
} {
  return JSON.parse(Buffer.from(state, "base64url").toString("utf8"));
}

export function buildAuthorizationUrl(provider: SocialProvider, state: string) {
  if (provider === "meta") {
    return buildMetaAuthorizationUrl(state);
  }

  throw new Error(`Provider not supported: ${provider}`);
}
