import { NextResponse } from "next/server";
import { ingestMetricSnapshot } from "@/modules/social/analytics";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const challenge = url.searchParams.get("hub.challenge");

  return new Response(challenge ?? "ok", { status: 200 });
}

export async function POST(request: Request) {
  const body = await request.json();

  // Normalize provider webhook payloads into internal snapshots.
  await ingestMetricSnapshot({
    organizationId: body.organization_id,
    socialAccountId: body.social_account_id,
    providerMetricId: body.metric_id ?? "webhook",
    metricDate: new Date().toISOString().slice(0, 10),
    impressions: body.impressions ?? 0,
    reach: body.reach ?? 0,
    engagement: body.engagement ?? 0,
    followers: body.followers ?? 0
  });

  return NextResponse.json({ received: true });
}
