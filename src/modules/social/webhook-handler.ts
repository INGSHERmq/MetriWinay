import { createSupabaseAdminClient } from "@/lib/supabase/admin";

type WebhookEntry = {
  id: string;
  time: number;
  changes?: {
    field: string;
    value: Record<string, unknown>;
  }[];
  messaging?: unknown[];
};

type WebhookPayload = {
  object: "page" | "instagram" | "permissions";
  entry: WebhookEntry[];
};

type CommentWebhook = {
  comment_id?: string;
  page_id?: string;
  from?: { id?: string; name?: string };
  message?: string;
  parent_id?: boolean;
  created_time?: number;
  verb?: string;
  photo_id?: string;
  post_id?: string;
  post?: { id?: string; status_type?: string; message?: string };
};

async function extractOrganizationId(pageId: string): Promise<string | null> {
  const supabase = createSupabaseAdminClient();
  const result = await supabase
    .from("social_accounts")
    .select("organization_id")
    .eq("provider_account_id", pageId)
    .limit(1)
    .maybeSingle();

  return result.data?.organization_id ?? null;
}

async function handleCommentEvent(entry: WebhookEntry) {
  const change = entry.changes?.[0];
  if (!change) return;

  const value = change.value as CommentWebhook;
  if (!value.comment_id || !value.page_id) return;

  const organizationId = await extractOrganizationId(value.page_id);
  if (!organizationId) return;

  const supabase = createSupabaseAdminClient();

  await supabase.from("page_comments").upsert({
    organization_id: organizationId,
    social_account_id: value.page_id,
    comment_id: value.comment_id,
    parent_id: value.parent_id ? value.comment_id : null,
    message: value.message ?? "",
    from_name: value.from?.name ?? null,
    created_time: value.created_time
      ? new Date(value.created_time * 1000).toISOString()
      : new Date().toISOString(),
    is_hidden: change.field === "comments" && change.value?.verb === "hide",
    raw_payload: value
  }, { onConflict: "social_account_id,comment_id" });

  await logEvent(organizationId, "meta", "comment", value);
}

async function handleFeedEvent(entry: WebhookEntry) {
  const change = entry.changes?.[0];
  if (!change) return;

  const value = change.value as Record<string, unknown>;
  const pageId = entry.id;

  const organizationId = await extractOrganizationId(pageId);
  if (!organizationId) return;

  await logEvent(organizationId, "meta", "feed_" + (change.value?.verb ?? "update"), value);
}

async function handleConversationsEvent(entry: WebhookEntry) {
  const change = entry.changes?.[0];
  if (!change) return;

  const pageId = entry.id;
  const organizationId = await extractOrganizationId(pageId);
  if (!organizationId) return;

  await logEvent(organizationId, "meta", "conversation", change.value);
}

async function logEvent(
  organizationId: string,
  provider: string,
  eventType: string,
  payload: unknown
) {
  const supabase = createSupabaseAdminClient();

  await supabase.from("integration_events").insert({
    organization_id: organizationId,
    provider,
    event_type: eventType,
    payload
  });
}

export async function handleWebhookPayload(payload: WebhookPayload) {
  if (payload.object !== "page") return { handled: 0 };

  let handled = 0;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      try {
        switch (change.field) {
          case "comments":
            await handleCommentEvent(entry);
            handled++;
            break;
          case "feed":
            await handleFeedEvent(entry);
            handled++;
            break;
          case "conversations":
            await handleConversationsEvent(entry);
            handled++;
            break;
          default:
            // Log unknown events for debugging
            const orgId = await extractOrganizationId(entry.id);
            if (orgId) {
              await logEvent(orgId, "meta", `unknown_${change.field}`, {
                entry_id: entry.id,
                value: change.value
              });
              handled++;
            }
        }
      } catch (err) {
        console.error(`Webhook handler error for field ${change.field}:`, err);
      }
    }
  }

  return { handled };
}
