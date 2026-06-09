import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncMetaAnalyticsForOrganization } from "@/modules/social/meta-analytics";
import { syncAdBreakdownsForOrganization } from "@/modules/social/meta-breakdowns";
import { syncTikTokAnalyticsForOrganization } from "@/modules/social/tiktok-analytics";

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: accounts, error } = await supabase
    .from("social_accounts")
    .select("id,organization_id,provider")
    .eq("status", "ACTIVE");

  if (error) throw error;

  const organizationIds = new Set<string>(
    (accounts ?? []).map((a: { organization_id: string }) => a.organization_id)
  );

  for (const organizationId of organizationIds) {
    await Promise.all([
      syncMetaAnalyticsForOrganization(organizationId),
      syncAdBreakdownsForOrganization(organizationId),
      syncTikTokAnalyticsForOrganization(organizationId)
    ]);
  }

  return NextResponse.json({ syncedOrganizations: organizationIds.size });
}
