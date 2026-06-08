import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const format = url.searchParams.get("format") ?? "csv";

  const { data: member } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "No organization" }, { status: 404 });
  }

  const [snapshotsRes, adSnapshotsRes, accountsRes] = await Promise.all([
    supabase
      .from("metric_snapshots")
      .select("metric_date,provider_metric_id,impressions,reach,engagement,followers,social_account_id")
      .eq("organization_id", member.organization_id)
      .order("metric_date", { ascending: false })
      .limit(100),
    supabase
      .from("ad_metric_snapshots")
      .select("*")
      .eq("organization_id", member.organization_id)
      .order("metric_date_stop", { ascending: false })
      .limit(50),
    supabase
      .from("social_accounts")
      .select("id,username,account_type")
      .eq("organization_id", member.organization_id)
  ]);

  const accountMap = new Map((accountsRes.data ?? []).map((a) => [a.id, a]));

  const snapshots = snapshotsRes.data ?? [];
  const adSnapshots = adSnapshotsRes.data ?? [];

  if (format === "csv") {
    const rows: string[][] = [];
    rows.push(["Tipo", "Cuenta", "Fecha", "Impresiones", "Alcance", "Engagement", "Seguidores", "Gasto Ads", "Clicks Ads", "CTR Ads"]);

    for (const s of snapshots) {
      const acct = accountMap.get(s.social_account_id);
      rows.push([
        acct?.account_type === "instagram_business" ? "Instagram" : "Facebook",
        acct?.username ?? "Desconocido",
        s.metric_date,
        String(s.impressions ?? 0),
        String(s.reach ?? 0),
        String(s.engagement ?? 0),
        String(s.followers ?? 0),
        "", "", ""
      ]);
    }

    for (const s of adSnapshots) {
      rows.push([
        "Anuncio",
        s.ad_account_name ?? s.ad_account_id,
        `${s.metric_date_start} / ${s.metric_date_stop}`,
        String(s.impressions ?? 0),
        String(s.reach ?? 0),
        String(s.engagement ?? 0),
        "",
        String(s.spend ?? 0),
        String(s.clicks ?? 0),
        Number(s.impressions ?? 0) > 0
          ? ((Number(s.clicks ?? 0) / Number(s.impressions ?? 1)) * 100).toFixed(2) + "%"
          : "0%"
      ]);
    }

    const csv = rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="metriwinay-reporte-${new Date().toISOString().slice(0, 10)}.csv"`
      }
    });
  }

  if (format === "json") {
    return NextResponse.json({
      snapshots,
      adSnapshots,
      accounts: accountsRes.data ?? []
    });
  }

  return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
}
