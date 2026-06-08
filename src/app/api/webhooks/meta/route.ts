import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { handleWebhookPayload } from "@/modules/social/webhook-handler";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  if (mode === "subscribe" && token === env.CRON_SECRET && challenge) {
    return new Response(challenge, { status: 200 });
  }

  return new Response("ok", { status: 200 });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    object?: string;
    entry?: { id: string; time: number; changes?: { field: string; value: Record<string, unknown> }[] }[];
  };

  if (!body.entry || !body.object) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const result = await handleWebhookPayload(body as Parameters<typeof handleWebhookPayload>[0]);

  return NextResponse.json({ received: true, ...result });
}
