import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createOAuthState, buildAuthorizationUrl } from "@/modules/social/oauth";
import type { SocialProvider } from "@/modules/social/types";
import { ensureDefaultOrganization } from "@/modules/workspace/onboarding";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider } = await params;
  if (provider !== "meta") {
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

  const state = createOAuthState({
    userId: user.id,
    organizationId,
    provider: provider as SocialProvider
  });
  const redirectUrl = buildAuthorizationUrl(provider as SocialProvider, state);

  return NextResponse.redirect(redirectUrl);
}
