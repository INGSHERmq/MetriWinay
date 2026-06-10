/**
 * One-time fix: tiktok_user_daily snapshots previously stored
 *   video_count    in impressions_unique  (should be impressions_organic)
 *   following_count in impressions_paid    (should be fan_adds)
 *
 * This script migrates those rows in-place.
 */
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const { data: rows, error } = await supabase
  .from("metric_snapshots")
  .select("id, impressions_unique, impressions_paid")
  .eq("provider_metric_id", "tiktok_user_daily");

if (error) {
  console.error("Error fetching rows:", error);
  process.exit(1);
}

console.log(`Found ${rows.length} tiktok_user_daily rows to migrate.`);

let fixed = 0;
for (const row of rows) {
  const { error: updateError } = await supabase
    .from("metric_snapshots")
    .update({
      impressions_organic: row.impressions_unique, // video_count moved here
      fan_adds: row.impressions_paid,              // following_count moved here
      impressions_unique: 0,
      impressions_paid: 0,
    })
    .eq("id", row.id);

  if (updateError) {
    console.error(`Error updating row ${row.id}:`, updateError);
  } else {
    fixed++;
  }
}

console.log(`Migration complete. ${fixed}/${rows.length} rows updated.`);
