"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirectTo") || "/");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(redirectTo || "/");
}

export async function signOut() {
  const supabase = await createClient();
  // "local" scope clears the cookies without a network round trip to
  // Supabase to revoke the refresh token. The user is fully signed out
  // client-side either way — the refresh token they no longer hold can't
  // be replayed.
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
