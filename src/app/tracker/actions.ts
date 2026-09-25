"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth";
import { HR_ACCOUNTS, type HRAccount } from "@/lib/tracker/account";
import { saveCookie } from "@/lib/tracker/credentials";
import { refreshAccountFromStorage } from "@/lib/tracker/refresh";

export async function saveHrCookieAction(formData: FormData) {
  const { userId } = await requireAdmin();
  const account = String(formData.get("account") || "");
  const cookie = String(formData.get("cookie") || "").trim();

  if (!HR_ACCOUNTS.includes(account as HRAccount)) {
    redirect(
      `/tracker?error=${encodeURIComponent(
        `Unknown HackerRank account "${account}".`
      )}`
    );
  }
  if (!cookie) {
    redirect(
      `/tracker?error=${encodeURIComponent(
        `Paste the ${account} account's HackerRank cookie before saving.`
      )}`
    );
  }

  await saveCookie(account as HRAccount, cookie, userId);

  revalidatePath("/tracker");
  revalidatePath("/");
  redirect(
    `/tracker?flash=${encodeURIComponent(
      `Saved cookie for ${account}. Daily auto-refresh will use it; click "Refresh now" to run it immediately.`
    )}`
  );
}

export async function refreshAccountNowAction(formData: FormData) {
  await requireAdmin();
  const account = String(formData.get("account") || "");
  if (!HR_ACCOUNTS.includes(account as HRAccount)) {
    redirect(
      `/tracker?error=${encodeURIComponent(
        `Unknown HackerRank account "${account}".`
      )}`
    );
  }

  const supabase = await createClient();
  const result = await refreshAccountFromStorage(supabase, account as HRAccount);

  revalidatePath("/tracker");
  revalidatePath("/");

  if (result.authFailed) {
    redirect(
      `/tracker?error=${encodeURIComponent(
        `Stored cookie for ${account} is expired. Paste a fresh cookie above and save.`
      )}`
    );
  }
  const summary = `Refreshed ${result.ok} of ${result.total} contests on the ${account} account.${
    result.failed.length ? ` Failures: ${result.failed.join("; ")}` : ""
  }`;
  redirect(`/tracker?flash=${encodeURIComponent(summary)}`);
}
