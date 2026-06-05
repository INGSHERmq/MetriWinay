import { env } from "@/lib/config";
import { createClient } from "@supabase/supabase-js";

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
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for metrics insertion.");
  }

  // Crear cliente admin con configuración específica para bypasear RLS
  const supabase = createClient(
    env.NEXT_PUBLIC_SUPABASE_URL!,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      global: {
        headers: {
          apikey: env.SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`
        }
      }
    }
  );

  console.log("🔑 Usando SERVICE_ROLE_KEY para inserción directa");

  const { data, error } = await supabase.from("metric_snapshots").upsert(
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
  ).select();

  if (error) {
    console.error("❌ Error al insertar métrica:", error);
    throw error;
  }

  console.log("✅ Métrica insertada correctamente:", data);
}

export function calculateEngagementRate(engagement: number, reach: number) {
  if (reach <= 0) return 0;
  return Number(((engagement / reach) * 100).toFixed(2));
}
