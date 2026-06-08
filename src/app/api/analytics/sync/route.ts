import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { syncMetaAnalyticsForOrganization } from "@/modules/social/meta-analytics";
import { syncAdBreakdownsForOrganization } from "@/modules/social/meta-breakdowns";

export async function POST() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: member, error } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!member?.organization_id) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  const [metricsResults, breakdownResults] = await Promise.all([
    syncMetaAnalyticsForOrganization(member.organization_id),
    syncAdBreakdownsForOrganization(member.organization_id)
  ]);

  return NextResponse.json({ results: metricsResults, breakdowns: breakdownResults });
}
