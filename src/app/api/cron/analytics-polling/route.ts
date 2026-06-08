import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { syncMetaAnalyticsForOrganization } from "@/modules/social/meta-analytics";
import { syncAdBreakdownsForOrganization } from "@/modules/social/meta-breakdowns";
import { getRateLimitKey, takeToken } from "@/modules/social/rate-limit";

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const { data: accounts, error } = await supabase
    .from("social_accounts")
    .select("id,organization_id,provider")
    .eq("status", "ACTIVE");

  if (error) throw error;

  const organizationIds = new Set<string>();

  for (const account of accounts ?? []) {
    const bucket = takeToken(
      getRateLimitKey(account.provider, account.id, "analytics"),
      120,
      1 / 30
    );

    if (!bucket.allowed) continue;
    organizationIds.add(account.organization_id);
  }

  for (const organizationId of organizationIds) {
    await syncMetaAnalyticsForOrganization(organizationId);
    await syncAdBreakdownsForOrganization(organizationId);
  }

  return NextResponse.json({ syncedOrganizations: organizationIds.size });
}
