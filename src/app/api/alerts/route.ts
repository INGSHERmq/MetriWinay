import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const includeEvents = url.searchParams.get("events") === "true";

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "No organization" }, { status: 404 });
  }

  const [rulesRes, eventsRes] = await Promise.all([
    supabase
      .from("alert_rules")
      .select("*")
      .eq("organization_id", member.organization_id)
      .order("created_at", { ascending: false }),
    includeEvents
      ? supabase
          .from("alert_events")
          .select("*, alert_rules!inner(name)")
          .eq("organization_id", member.organization_id)
          .order("created_at", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] })
  ]);

  return NextResponse.json({
    rules: rulesRes.data ?? [],
    events: eventsRes.data ?? []
  });
}

export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "No organization" }, { status: 404 });
  }

  const json = await request.json();
  const { name, metric_type, condition, threshold, social_account_id } = json as {
    name?: string;
    metric_type?: string;
    condition?: string;
    threshold?: number;
    social_account_id?: string | null;
  };

  if (!name || !metric_type || !condition || threshold === undefined) {
    return NextResponse.json({ error: "name, metric_type, condition, threshold required" }, { status: 422 });
  }

  const { data, error } = await supabase.from("alert_rules").insert({
    organization_id: member.organization_id,
    name,
    metric_type,
    condition,
    threshold,
    social_account_id: social_account_id ?? null
  }).select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ rule: data }, { status: 201 });
}

export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const json = await request.json();
  const { id, enabled } = json as { id?: string; enabled?: boolean };

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 422 });
  }

  const { error } = await supabase
    .from("alert_rules")
    .update({ enabled })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: true });
}

export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 422 });
  }

  const { error } = await supabase.from("alert_rules").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
