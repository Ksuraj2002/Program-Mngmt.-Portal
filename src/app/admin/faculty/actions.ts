"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/auth";

function randomTempPassword() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export async function addFaculty(formData: FormData) {
  await requireAdmin();
  const fullName = String(formData.get("full_name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  if (!fullName || !email) {
    redirect("/admin/faculty?error=" + encodeURIComponent("Name and email are required."));
  }

  const admin = createAdminClient();
  const tempPassword = randomTempPassword();

  const { error } = await admin.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (error) {
    redirect(`/admin/faculty?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/faculty");
  redirect(
    `/admin/faculty?created=${encodeURIComponent(
      email
    )}&tempPassword=${encodeURIComponent(tempPassword)}`
  );
}

export async function setRole(formData: FormData) {
  await requireAdmin();
  const facultyId = String(formData.get("facultyId"));
  const role = String(formData.get("role"));
  if (role !== "admin" && role !== "faculty") return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ role }).eq("id", facultyId);
  revalidatePath("/admin/faculty");
}

export async function removeFaculty(formData: FormData) {
  await requireAdmin();
  const facultyId = String(formData.get("facultyId"));

  const admin = createAdminClient();
  await admin.auth.admin.deleteUser(facultyId);
  revalidatePath("/admin/faculty");
}

export async function assignSubject(formData: FormData) {
  await requireAdmin();
  const facultyId = String(formData.get("facultyId"));
  const subjectId = String(formData.get("subjectId"));
  if (!facultyId || !subjectId) return;

  const supabase = await createClient();
  await supabase
    .from("faculty_subjects")
    .insert({ faculty_id: facultyId, subject_id: subjectId });
  revalidatePath("/admin/faculty");
}

export async function unassignSubject(formData: FormData) {
  await requireAdmin();
  const facultyId = String(formData.get("facultyId"));
  const subjectId = String(formData.get("subjectId"));

  const supabase = await createClient();
  await supabase
    .from("faculty_subjects")
    .delete()
    .eq("faculty_id", facultyId)
    .eq("subject_id", subjectId);
  revalidatePath("/admin/faculty");
}
