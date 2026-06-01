import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function ingestMetricSnapshot(input: {
  organizationId: string;
  socialAccountId: string;
  providerMetricId: string;
  metricDate: string;
  impressions: number;
  reach: number;
  engagement: number;
  followers: number;
}) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase.from("metric_snapshots").upsert(
    {
      organization_id: input.organizationId,
      social_account_id: input.socialAccountId,
      provider_metric_id: input.providerMetricId,
      metric_date: input.metricDate,
      impressions: input.impressions,
      reach: input.reach,
      engagement: input.engagement,
      followers: input.followers
    },
    { onConflict: "social_account_id,provider_metric_id,metric_date" }
  );

  if (error) throw error;
}

export function calculateEngagementRate(engagement: number, reach: number) {
  if (reach <= 0) return 0;
  return Number(((engagement / reach) * 100).toFixed(2));
}
