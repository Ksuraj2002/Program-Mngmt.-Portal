"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function addCampus(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  const supabase = await createClient();
  await supabase.from("campuses").insert({ name });
  revalidatePath("/admin/campuses");
  revalidatePath("/");
}

export async function deleteCampus(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));

  const supabase = await createClient();
  await supabase.from("campuses").delete().eq("id", id);
  revalidatePath("/admin/campuses");
  revalidatePath("/");
}
