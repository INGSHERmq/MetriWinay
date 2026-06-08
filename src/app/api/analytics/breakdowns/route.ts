import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdBreakdowns } from "@/modules/social/meta-breakdowns";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const orgId = url.searchParams.get("organizationId");
  const type = url.searchParams.get("type") ?? undefined;
  const campaignId = url.searchParams.get("campaignId") ?? undefined;

  if (!orgId) {
    return NextResponse.json({ error: "organizationId is required" }, { status: 422 });
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "Not a member of this organization" }, { status: 403 });
  }

  try {
    const breakdowns = await getAdBreakdowns(orgId, type, campaignId);
    return NextResponse.json({ breakdowns });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
