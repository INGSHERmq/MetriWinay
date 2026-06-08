import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { processPublishingQueue } from "@/modules/social/meta-publisher";

export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await processPublishingQueue();

  return NextResponse.json({
    processed: results.length,
    published: results.filter((r) => r.ok).length,
    failed: results.filter((r) => !r.ok).length
  });
}
