"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { EntryType } from "@/types/database";

export async function addEntry(formData: FormData) {
  const campusId = String(formData.get("campusId"));
  const subjectId = String(formData.get("subjectId"));
  const type = String(formData.get("type")) as EntryType;
  const title = String(formData.get("title") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const dueDate = String(formData.get("due_date"));
  const testDateRaw = String(formData.get("test_date") || "").trim();
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

  if (type === "test" && !testDateRaw) {
    redirect(
      `/campus/${campusId}/subject/${subjectId}?error=${encodeURIComponent(
        "Please fill in the test date."
      )}`
    );
  }

  const supabase = await createClient();
  let createdBy = (await headers()).get("x-verified-user-id");
  if (!createdBy) {
    const { data: userData } = await supabase.auth.getUser();
    createdBy = userData.user?.id ?? null;
  }

  const { error } = await supabase.from("entries").insert({
    subject_id: subjectId,
    type,
    title,
    description: description || null,
    due_date: dueDate,
    test_date: type === "test" && testDateRaw ? testDateRaw : null,
    max_marks: maxMarksRaw ? Number(maxMarksRaw) : null,
    created_by: createdBy,
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
  revalidatePath(`/`);
}

export async function markEntryDone(formData: FormData) {
  const campusId = String(formData.get("campusId"));
  const subjectId = String(formData.get("subjectId"));
  const entryId = String(formData.get("entryId"));
  const linkRaw = String(formData.get("submission_link") || "").trim();

  const supabase = await createClient();
  await supabase
    .from("entries")
    .update({
      status: "done_by_tpm",
      change_request: null,
      submission_link: linkRaw || null,
    })
    .eq("id", entryId);

  revalidatePath(`/campus/${campusId}/subject/${subjectId}`);
  revalidatePath(`/`);
}

export async function approveEntry(formData: FormData) {
  const campusId = String(formData.get("campusId"));
  const subjectId = String(formData.get("subjectId"));
  const entryId = String(formData.get("entryId"));

  const supabase = await createClient();
  await supabase
    .from("entries")
    .update({ status: "approved", change_request: null })
    .eq("id", entryId);

  revalidatePath(`/campus/${campusId}/subject/${subjectId}`);
  revalidatePath(`/`);
}

export async function requestEntryChanges(formData: FormData) {
  const campusId = String(formData.get("campusId"));
  const subjectId = String(formData.get("subjectId"));
  const entryId = String(formData.get("entryId"));
  const changes = String(formData.get("change_request") || "").trim();

  if (!changes) {
    redirect(
      `/campus/${campusId}/subject/${subjectId}?error=${encodeURIComponent(
        "Please describe the changes you'd like."
      )}`
    );
  }

  const supabase = await createClient();
  await supabase
    .from("entries")
    .update({ status: "pending", change_request: changes })
    .eq("id", entryId);

  revalidatePath(`/campus/${campusId}/subject/${subjectId}`);
  revalidatePath(`/`);
}
