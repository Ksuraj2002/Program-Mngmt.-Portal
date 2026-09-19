import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/database";

export async function getCurrentProfile(): Promise<{
  userId: string;
  profile: Profile;
} | null> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .single();

  if (!profile) return null;
  return { userId: userData.user.id, profile };
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
