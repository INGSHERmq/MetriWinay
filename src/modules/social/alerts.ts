import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type AlertRule = {
  id: string;
  organization_id: string;
  name: string;
  metric_type: string;
  condition: string;
  threshold: number;
  social_account_id: string | null;
  enabled: boolean;
  last_triggered_at: string | null;
};

type MetricValue = {
  value: number;
  socialAccountId?: string;
};

function evaluateCondition(
  metricValue: number,
  condition: string,
  threshold: number
): boolean {
  switch (condition) {
    case "gt": return metricValue > threshold;
    case "lt": return metricValue < threshold;
    case "gte": return metricValue >= threshold;
    case "lte": return metricValue <= threshold;
    default: return false;
  }
}

function getConditionLabel(condition: string): string {
  const labels: Record<string, string> = {
    gt: "mayor a", lt: "menor a", gte: "mayor o igual a", lte: "menor o igual a"
  };
  return labels[condition] ?? condition;
}

function formatMetricType(type: string): string {
  const labels: Record<string, string> = {
    cpc: "CPC", ctr: "CTR", spend: "Gasto", engagement_drop: "Caida engagement",
    cpm: "CPM", impressions: "Impresiones", reach: "Alcance", clicks: "Clicks",
    cost_per_result: "Costo por resultado"
  };
  return labels[type] ?? type;
}

async function fetchOrgMetrics(organizationId: string): Promise<{
  adMetrics: MetricValue[];
  pageMetrics: MetricValue[];
}> {
  const supabase = createSupabaseAdminClient();

  const [adSnapshots, pageSnapshots] = await Promise.all([
    supabase
      .from("ad_metric_snapshots")
      .select("spend,clicks,impressions,reach,engagement,raw_payload")
      .eq("organization_id", organizationId)
      .order("metric_date_stop", { ascending: false })
      .limit(10),
    supabase
      .from("metric_snapshots")
      .select("engagement,social_account_id")
      .eq("organization_id", organizationId)
      .order("metric_date", { ascending: false })
      .limit(50)
  ]);

  const adMetrics: (MetricValue & { _raw: Record<string, number> })[] = (adSnapshots.data ?? []).map((row: Record<string, unknown>) => {
    const impressions = Number(row.impressions ?? 0);
    const spend = Number(row.spend ?? 0);
    const clicks = Number(row.clicks ?? 0);
    const engagement = Number(row.engagement ?? 0);

    return {
      value: 0,
      socialAccountId: undefined,
      _raw: { impressions, spend, clicks, engagement, ctr: impressions > 0 ? (clicks / impressions) * 100 : 0, cpc: clicks > 0 ? spend / clicks : 0, cpm: impressions > 0 ? (spend / impressions) * 1000 : 0 }
    };
  });

  const recentEngagement = (pageSnapshots.data ?? [])
    .filter((s: Record<string, unknown>) => Number(s.engagement) > 0)
    .slice(0, 7)
    .reduce((sum: number, s: Record<string, unknown>) => sum + Number(s.engagement ?? 0), 0);

  const olderEngagement = (pageSnapshots.data ?? [])
    .filter((s: Record<string, unknown>) => Number(s.engagement) > 0)
    .slice(7, 14)
    .reduce((sum: number, s: Record<string, unknown>) => sum + Number(s.engagement ?? 0), 0);

  return {
    adMetrics,
    pageMetrics: [{ value: recentEngagement }, { value: olderEngagement }]
  };
}

function getMetricValue(
  rule: AlertRule,
  adMetrics: (MetricValue & { _raw: Record<string, number> })[],
  pageMetrics: MetricValue[]
): number | null {
  const latest = adMetrics[0]?._raw;
  if (!latest) return null;

  switch (rule.metric_type) {
    case "cpc": return latest.cpc;
    case "ctr": return latest.ctr;
    case "spend": return latest.spend;
    case "cpm": return latest.cpm;
    case "impressions": return latest.impressions;
    case "reach": return adMetrics.reduce((s, m) => s + (m._raw?.impressions ?? 0), 0);
    case "clicks": return latest.clicks;
    case "cost_per_result": return latest.spend > 0 && latest.spend > 0 ? latest.spend / Math.max(1, latest.spend) : 0;
    case "engagement_drop": {
      const recent = pageMetrics[0]?.value ?? 0;
      const older = pageMetrics[1]?.value ?? 1;
      if (older === 0) return 0;
      return ((recent - older) / older) * 100;
    }
    default: return null;
  }
}

export async function evaluateAlertRules(organizationId: string) {
  const supabase = createSupabaseAdminClient();

  const { data: rules } = await supabase
    .from("alert_rules")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("enabled", true);

  if (!rules || rules.length === 0) return [];

  const { adMetrics, pageMetrics } = await fetchOrgMetrics(organizationId);

  const events = [];

  for (const rule of rules as AlertRule[]) {
    const metricValue = getMetricValue(rule, adMetrics as (MetricValue & { _raw: Record<string, number> })[], pageMetrics);
    if (metricValue === null) continue;

    const triggered = evaluateCondition(metricValue, rule.condition, rule.threshold);

    if (triggered) {
      const message = `${rule.name}: ${formatMetricType(rule.metric_type)} ${metricValue.toFixed(2)} es ${getConditionLabel(rule.condition)} ${rule.threshold}`;

      const { error } = await supabase.from("alert_events").insert({
        alert_rule_id: rule.id,
        organization_id: organizationId,
        metric_value: metricValue,
        threshold: rule.threshold,
        message
      });

      if (!error) {
        await supabase
          .from("alert_rules")
          .update({ last_triggered_at: new Date().toISOString() })
          .eq("id", rule.id);

        events.push({ ruleId: rule.id, message });
      }
    }
  }

  return events;
}

export async function evaluateAllOrganizationsAlerts() {
  const supabase = createSupabaseAdminClient();

  const { data: orgs } = await supabase
    .from("organizations")
    .select("id");

  const results = [];

  for (const org of orgs ?? []) {
    const events = await evaluateAlertRules(org.id);
    if (events.length > 0) {
      results.push({ organizationId: org.id, events });
    }
  }

  return results;
}
