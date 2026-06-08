import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { evaluateAllOrganizationsAlerts } from "@/modules/social/alerts";

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await evaluateAllOrganizationsAlerts();

  return NextResponse.json({
    organizationsWithAlerts: results.length,
    totalEvents: results.reduce((s, r) => s + r.events.length, 0),
    details: results
  });
}
