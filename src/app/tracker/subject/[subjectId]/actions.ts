"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";

export async function addContest(formData: FormData) {
  await requireAdmin();
  const subjectId = String(formData.get("subjectId"));
  const slug = String(formData.get("slug") || "").trim();
  const displayName =
    String(formData.get("display_name") || "").trim() || null;
  const cutoffRaw = String(formData.get("cutoff") || "").trim();
  const back = `/tracker/subject/${subjectId}`;

  if (!slug) {
    redirect(`${back}?error=${encodeURIComponent("Contest slug is required.")}`);
  }
  let cutoff: number | null = null;
  if (cutoffRaw) {
    if (!/^\d+$/.test(cutoffRaw)) {
      redirect(
        `${back}?error=${encodeURIComponent(
          "Challenge cutoff must be a whole number."
        )}`
      );
    }
    cutoff = Number(cutoffRaw);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tracker_contests").insert({
    subject_id: subjectId,
    slug,
    display_name: displayName,
    lecture_cutoff_challenge_count: cutoff,
  });
  if (error) {
    redirect(
      `${back}?error=${encodeURIComponent(
        error.code === "23505"
          ? `Slug "${slug}" is already mapped under this subject.`
          : error.message
      )}`
    );
  }
  revalidatePath(back);
  redirect(back);
}

export async function addStudent(formData: FormData) {
  await requireAdmin();
  const subjectId = String(formData.get("subjectId"));
  const back = `/tracker/subject/${subjectId}`;

  const username = String(formData.get("hackerrank_username") || "").trim();
  const name = String(formData.get("name") || "").trim() || null;
  if (!username) {
    redirect(
      `${back}?error=${encodeURIComponent("HackerRank username is required.")}`
    );
  }

  const supabase = await createClient();
  const { data: subject } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", subjectId)
    .single();
  if (!subject) {
    redirect(`${back}?error=${encodeURIComponent("Subject not found.")}`);
  }

  const { error } = await supabase.from("tracker_students").insert({
    campus_id: subject!.campus_id,
    subject_id: subjectId,
    name,
    hackerrank_username: username,
  });
  if (error) {
    redirect(
      `${back}?error=${encodeURIComponent(
        error.code === "23505"
          ? `"${username}" is already on this subject's roster.`
          : error.message
      )}`
    );
  }
  revalidatePath(back);
  redirect(back);
}

export async function deleteStudent(formData: FormData) {
  await requireAdmin();
  const subjectId = String(formData.get("subjectId"));
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("tracker_students").delete().eq("id", id);
  revalidatePath(`/tracker/subject/${subjectId}`);
}
