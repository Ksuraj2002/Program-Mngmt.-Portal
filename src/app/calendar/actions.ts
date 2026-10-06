"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function addTestOnDate(formData: FormData) {
  const subjectId = String(formData.get("subjectId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const testDate = String(formData.get("test_date") || "").trim();
  const dueDateRaw = String(formData.get("due_date") || "").trim();
  const maxMarksRaw = String(formData.get("max_marks") || "").trim();
  const month = String(formData.get("month") || "").trim();
  const returnMonth = /^\d{4}-\d{2}$/.test(month) ? `?month=${month}` : "";

  if (!subjectId || !title || !testDate) {
    redirect(
      `/calendar${returnMonth}${returnMonth ? "&" : "?"}error=${encodeURIComponent(
        "Please pick a subject and enter a title."
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
    type: "test",
    title,
    due_date: dueDateRaw || testDate,
    test_date: testDate,
    max_marks: maxMarksRaw ? Number(maxMarksRaw) : null,
    created_by: createdBy,
  });

  if (error) {
    redirect(
      `/calendar${returnMonth}${returnMonth ? "&" : "?"}error=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath("/calendar");
  revalidatePath("/");
  redirect(`/calendar${returnMonth}`);
}
