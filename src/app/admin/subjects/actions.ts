"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function addSubject(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim();
  const campusId = String(formData.get("campus_id") || "");
  if (!name || !campusId) return;

  const supabase = await createClient();
  await supabase.from("subjects").insert({ name, campus_id: campusId });
  revalidatePath("/admin/subjects");
}

export async function deleteSubject(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id"));

  const supabase = await createClient();
  await supabase.from("subjects").delete().eq("id", id);
  revalidatePath("/admin/subjects");
}
