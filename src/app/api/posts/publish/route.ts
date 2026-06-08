import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { publishSingleTarget } from "@/modules/social/meta-publisher";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json().catch(() => ({}));
  const targetId = json.targetId as string | undefined;

  if (!targetId) {
    return NextResponse.json({ error: "targetId is required" }, { status: 422 });
  }

  const result = await publishSingleTarget(targetId);
  const statusCode = result.ok ? 200 : 500;

  return NextResponse.json(result, { status: statusCode });
}
