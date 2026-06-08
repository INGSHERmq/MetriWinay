import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { processPublishingQueue } from "@/modules/social/meta-publisher";

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();

  const { data: allTargets, error: allError } = await supabase
    .from("post_targets")
    .select("id,status");

  const { data: scheduledTargets, error: schedError } = await supabase
    .from("post_targets")
    .select("id,status")
    .eq("status", "SCHEDULED");

  const results = await processPublishingQueue();

  return NextResponse.json({
    processed: results.length,
    published: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length,
    results,
    debug: {
      allTargets: allTargets ?? [],
      allError: allError?.message ?? null,
      scheduledTargets: scheduledTargets ?? [],
      schedError: schedError?.message ?? null
    }
  });
}
