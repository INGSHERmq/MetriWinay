import { z } from "zod";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const schedulePostSchema = z.object({
  organizationId: z.string().uuid(),
  accountIds: z.array(z.string().uuid()).min(1),
  body: z.string().max(2200).default(""),
  mediaUrls: z.array(z.string().url()).default([]),
  scheduledFor: z.string().datetime(),
  postType: z.enum(["feed", "story", "reel"]).default("feed"),
  createdBy: z.string().uuid().optional()
});

export async function schedulePost(input: z.infer<typeof schedulePostSchema>) {
  const payload = schedulePostSchema.parse(input);
  const supabase = createSupabaseAdminClient();

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      organization_id: payload.organizationId,
      body: payload.body,
      media_urls: payload.mediaUrls,
      scheduled_for: payload.scheduledFor,
      status: "SCHEDULED",
      created_by: payload.createdBy
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const targets = payload.accountIds.map((accountId) => ({
    post_id: post.id,
    social_account_id: accountId,
    status: "SCHEDULED"
  }));

  const { error: targetsError } = await supabase.from("post_targets").insert(targets);
  if (targetsError) throw new Error(targetsError.message);

  if (payload.postType !== "feed") {
    await supabase.from("posts").update({ post_type: payload.postType }).eq("id", post.id);
  }

  return post;
}
