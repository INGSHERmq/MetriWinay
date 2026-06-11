"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type BusinessGoalRow = {
  id: string;
  organization_id: string;
  social_account_id: string;
  goal_type: string;
  target_value: number;
  created_at: string;
  updated_at: string;
};

export type GoalWithProgress = {
  goal: BusinessGoalRow | null;
  accountId: string;
  accountUsername: string;
  accountProvider: string;
  accountAvatar: string | null;
  accountType: string | null;
  currentFollowers: number;
};

export async function getGoalsWithProgress(organizationId: string): Promise<GoalWithProgress[]> {
  const supabase = await createSupabaseServerClient();

  const { data: accounts } = await supabase
    .from("social_accounts")
    .select("id, provider, username, avatar_url, account_type")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (!accounts || accounts.length === 0) return [];

  const { data: snapshots } = await supabase
    .from("metric_snapshots")
    .select("social_account_id, followers, metric_date")
    .in("social_account_id", accounts.map((a) => a.id))
    .order("metric_date", { ascending: false });

  const latestFollowers = new Map<string, number>();
  for (const snap of snapshots ?? []) {
    if (!latestFollowers.has(snap.social_account_id)) {
      latestFollowers.set(snap.social_account_id, snap.followers ?? 0);
    }
  }

  const { data: goals } = await supabase
    .from("business_goals")
    .select("*")
    .eq("organization_id", organizationId);

  const goalsByAccount = new Map<string, BusinessGoalRow>();
  for (const g of goals ?? []) {
    goalsByAccount.set(g.social_account_id, g);
  }

  return accounts.map((a) => ({
    goal: goalsByAccount.get(a.id) ?? null,
    accountId: a.id,
    accountUsername: a.username,
    accountProvider: a.provider,
    accountAvatar: a.avatar_url,
    accountType: a.account_type,
    currentFollowers: latestFollowers.get(a.id) ?? 0,
  }));
}

export async function upsertBusinessGoal(formData: FormData) {
  const organizationId = formData.get("organizationId") as string;
  const socialAccountId = formData.get("socialAccountId") as string;
  const goalType = formData.get("goalType") as string;
  const targetValue = Number(formData.get("targetValue"));

  if (!organizationId || !socialAccountId || !targetValue || targetValue <= 0) {
    throw new Error("Datos invalidos para crear la meta");
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.from("business_goals").upsert(
    {
      organization_id: organizationId,
      social_account_id: socialAccountId,
      goal_type: goalType,
      target_value: targetValue,
    },
    { onConflict: "social_account_id, goal_type" }
  );

  if (error) throw new Error(error.message);
  revalidatePath("/");
}

export async function deleteBusinessGoal(formData: FormData) {
  const goalId = formData.get("goalId") as string;
  if (!goalId) throw new Error("Falta el id de la meta");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("business_goals").delete().eq("id", goalId);
  if (error) throw new Error(error.message);
  revalidatePath("/");
}
