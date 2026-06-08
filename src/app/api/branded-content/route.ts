import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getBrandedContentPosts,
  getEligiblePartners,
  createBrandedContentPost
} from "@/modules/social/meta-branded-content";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const accountId = url.searchParams.get("accountId");
  const action = url.searchParams.get("action");

  if (!accountId) {
    return NextResponse.json({ error: "accountId is required" }, { status: 422 });
  }

  try {
    if (action === "partners") {
      const partners = await getEligiblePartners(accountId).catch(() => []);
      return NextResponse.json({ partners });
    }

    const posts = await getBrandedContentPosts(accountId).catch(() => []);
    return NextResponse.json({ posts });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message, posts: [], partners: [] }, { status: 200 });
  }
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const { accountId, message, partnerIds, mediaUrl } = json as {
    accountId?: string;
    message?: string;
    partnerIds?: string[];
    mediaUrl?: string;
  };

  if (!accountId || !message) {
    return NextResponse.json({ error: "accountId and message are required" }, { status: 422 });
  }

  try {
    const postId = await createBrandedContentPost(accountId, message, partnerIds ?? [], mediaUrl);
    return NextResponse.json({ postId }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
