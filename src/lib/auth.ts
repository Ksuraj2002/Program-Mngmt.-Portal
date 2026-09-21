import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getCurrentProfile(): Promise<{
  userId: string;
  profile: Profile;
} | null> {
  const supabase = await createClient();

  // Middleware already ran supabase.auth.getUser() for this request and
  // verified the session; reuse that result instead of hitting Supabase's
  // auth server again on every page/action.
  let userId = (await headers()).get("x-verified-user-id");
  if (!userId) {
    const { data: userData } = await supabase.auth.getUser();
    userId = userData.user?.id ?? null;
  }
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (!profile) return null;
  return { userId, profile };
}

export async function requireProfile() {
  const result = await getCurrentProfile();
  if (!result) redirect("/login");
  return result;
}

export async function requireAdmin() {
  const result = await requireProfile();
  if (result.profile.role !== "admin") redirect("/");
  return result;
}
