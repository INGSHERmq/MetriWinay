import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { schedulePost, schedulePostSchema } from "@/modules/social/scheduler";

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const parsed = schedulePostSchema.safeParse({ ...json, createdBy: user.id });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
  }

  const post = await schedulePost(parsed.data);
  return NextResponse.json({ post }, { status: 201 });
}
