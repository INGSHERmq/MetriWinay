import { NextResponse } from "next/server";
import { env } from "@/lib/config";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { notifyTokenExpired } from "@/modules/social/notifications";

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const refreshBefore = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  const { data: connections, error } = await supabase
    .from("oauth_connections")
    .select("id,user_id,provider,refresh_failures,expires_at")
    .eq("status", "ACTIVE")
    .lte("expires_at", refreshBefore);

  if (error) throw error;

  for (const connection of connections ?? []) {
    const failures = (connection.refresh_failures ?? 0) + 1;
    await supabase
      .from("oauth_connections")
      .update({
        refresh_failures: failures,
        status: failures >= 3 ? "TOKEN_EXPIRED" : "ACTIVE"
      })
      .eq("id", connection.id);

    if (failures >= 3) {
      await notifyTokenExpired({
        userId: connection.user_id,
        accountLabel: connection.provider
      });
    }
  }

  return NextResponse.json({ checked: connections?.length ?? 0 });
}
