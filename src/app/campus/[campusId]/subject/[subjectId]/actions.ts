"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { EntryType } from "@/types/database";

export async function addEntry(formData: FormData) {
  const campusId = String(formData.get("campusId"));
  const subjectId = String(formData.get("subjectId"));
  const type = String(formData.get("type")) as EntryType;
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const dueDate = String(formData.get("due_date"));
  const maxMarksRaw = String(formData.get("max_marks") || "").trim();
  const returnType = String(formData.get("returnType") || "all");
  const returnQuery = returnType === "all" ? "" : `?type=${returnType}`;

  if (!title || !dueDate || (type !== "assignment" && type !== "test")) {
    redirect(
      `/campus/${campusId}/subject/${subjectId}?error=${encodeURIComponent(
        "Please fill in the type, title, and due date."
      )}`
    );
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  const { error } = await supabase.from("entries").insert({
    subject_id: subjectId,
    type,
    title,
    description: description || null,
    due_date: dueDate,
    max_marks: maxMarksRaw ? Number(maxMarksRaw) : null,
    created_by: userData.user?.id,
  });

  if (error) {
    redirect(
      `/campus/${campusId}/subject/${subjectId}?error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath(`/campus/${campusId}/subject/${subjectId}`);
  redirect(`/campus/${campusId}/subject/${subjectId}${returnQuery}`);
}

export async function deleteEntry(formData: FormData) {
  const campusId = String(formData.get("campusId"));
  const subjectId = String(formData.get("subjectId"));
  const entryId = String(formData.get("entryId"));

  const supabase = await createClient();
  await supabase.from("entries").delete().eq("id", entryId);

  revalidatePath(`/campus/${campusId}/subject/${subjectId}`);
}
