import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getComments,
  replyToComment,
  deleteComment
} from "@/modules/social/meta-comments";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const accountId = url.searchParams.get("accountId");

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 422 });
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "No organization found" }, { status: 404 });
  }

  try {
    const comments = await getComments(accountId, member.organization_id);
    return NextResponse.json({ comments });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const { commentId, message, accountId } = json as {
    commentId?: string;
    message?: string;
    accountId?: string;
  };

  if (!commentId || !message || !accountId) {
    return NextResponse.json({ error: "commentId, message, and accountId are required" }, { status: 422 });
  }

  try {
    const replyId = await replyToComment(commentId, message, accountId);
    return NextResponse.json({ replyId }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const commentId = url.searchParams.get("commentId");
  const accountId = url.searchParams.get("accountId");

  if (!commentId || !accountId) {
    return NextResponse.json({ error: "commentId and accountId are required" }, { status: 422 });
  }

  try {
    await deleteComment(commentId, accountId);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
