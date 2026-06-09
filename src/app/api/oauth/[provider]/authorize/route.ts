import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOAuthState, buildAuthorizationUrl } from "@/modules/social/oauth";
import type { SocialProvider } from "@/modules/social/types";
import { ensureDefaultOrganization } from "@/modules/workspace/onboarding";
import { buildTikTokAuthorizationUrlParams } from "@/modules/social/providers/tiktok";

function base64UrlEncode(buf: Buffer) {
  return buf.toString("base64url");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (provider !== "meta" && provider !== "tiktok") {
    return NextResponse.json({ error: "Provider not supported." }, { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const organizationId = await ensureDefaultOrganization({
    userId: user.id,
    email: user.email
  });

  if (provider === "tiktok") {
    const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
    const codeChallenge = base64UrlEncode(
      crypto.createHash("sha256").update(codeVerifier).digest()
    );

    const state = createOAuthState({
      userId: user.id,
      organizationId,
      provider: "tiktok",
      codeVerifier
    });

    const redirectUrl = buildTikTokAuthorizationUrlParams(state, codeChallenge);
    return NextResponse.redirect(redirectUrl);
  }

  const state = createOAuthState({
    userId: user.id,
    organizationId,
    provider: provider as SocialProvider
  });
  const redirectUrl = buildAuthorizationUrl(provider as SocialProvider, state);

  return NextResponse.redirect(redirectUrl);
}
