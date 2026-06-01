import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSlug } from "@/lib/slug";

export async function ensureDefaultOrganization(input: {
  userId: string;
  email?: string | null;
  organizationName?: string | null;
}) {
  const supabase = createSupabaseAdminClient();

  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", input.userId)
    .limit(1)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (membership?.organization_id) return membership.organization_id as string;

  const baseName =
    input.organizationName?.trim() ||
    input.email?.split("@")[0]?.replace(/[._-]+/g, " ") ||
    "Mi workspace";
  const baseSlug = createSlug(baseName) || "workspace";
  const slug = `${baseSlug}-${input.userId.slice(0, 8)}`;

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .insert({ name: baseName, slug })
    .select("id")
    .single();

  if (organizationError) throw organizationError;

  const { error: memberError } = await supabase.from("organization_members").insert({
    organization_id: organization.id,
    user_id: input.userId,
    role: "OWNER"
  });

  if (memberError) throw memberError;

  return organization.id as string;
}
