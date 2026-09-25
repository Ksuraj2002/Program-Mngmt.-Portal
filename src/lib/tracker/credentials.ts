import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { HR_ACCOUNTS, type HRAccount } from "./account";
import { decryptCookie, encryptCookie } from "./crypto";

export type HRCredentialStatus = "active" | "expired";

export type HRCredentialRow = {
  account: HRAccount;
  last_refresh_ok_at: string | null;
  last_refresh_error: string | null;
  status: HRCredentialStatus;
  updated_at: string;
};

type StoredRow = HRCredentialRow & { cookie_ciphertext: string };

// Public metadata (no ciphertext) for admin UI. Uses the request-scoped client
// so RLS still applies — non-admins never see this data.
export async function listCredentialStatus(): Promise<HRCredentialRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tracker_hr_credentials")
    .select("account, last_refresh_ok_at, last_refresh_error, status, updated_at");
  const byAccount = new Map<string, HRCredentialRow>();
  for (const row of (data ?? []) as HRCredentialRow[]) {
    byAccount.set(row.account, row);
  }
  return HR_ACCOUNTS.map(
    (account): HRCredentialRow =>
      byAccount.get(account) ?? {
        account,
        last_refresh_ok_at: null,
        last_refresh_error: null,
        status: "expired",
        updated_at: "",
      }
  );
}

// Server-only: reads and decrypts the stored cookie. Used by the cron and the
// on-demand admin refresh. Uses the service-role client so it works from
// unauthenticated cron requests.
export async function getStoredCookie(account: HRAccount): Promise<string | null> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("tracker_hr_credentials")
    .select("cookie_ciphertext")
    .eq("account", account)
    .maybeSingle();
  const row = data as { cookie_ciphertext: string } | null;
  if (!row?.cookie_ciphertext) return null;
  return decryptCookie(row.cookie_ciphertext);
}

export async function saveCookie(
  account: HRAccount,
  cookie: string,
  updatedBy: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("tracker_hr_credentials").upsert(
    {
      account,
      cookie_ciphertext: encryptCookie(cookie),
      status: "active" as const,
      last_refresh_error: null,
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
    },
    { onConflict: "account" }
  );
  if (error) throw new Error(`Cookie write failed: ${error.message}`);
}

export async function markRefreshOk(account: HRAccount): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("tracker_hr_credentials")
    .update({
      last_refresh_ok_at: new Date().toISOString(),
      last_refresh_error: null,
      status: "active" as const,
    })
    .eq("account", account);
}

export async function markCookieExpired(
  account: HRAccount,
  reason: string
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("tracker_hr_credentials")
    .update({
      status: "expired" as const,
      last_refresh_error: reason.slice(0, 500),
    })
    .eq("account", account);
}

export async function markRefreshError(
  account: HRAccount,
  reason: string
): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("tracker_hr_credentials")
    .update({ last_refresh_error: reason.slice(0, 500) })
    .eq("account", account);
}

// Read-only check for the homepage banner. Uses the request-scoped client so
// only admins (who can select the table) get counts back — faculty see 0.
export async function countExpiredCookies(): Promise<{
  expired: string[];
  missing: string[];
}> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tracker_hr_credentials")
    .select("account, status");
  const rows = (data ?? []) as { account: string; status: HRCredentialStatus }[];
  const present = new Set(rows.map((r) => r.account));
  const expired = rows.filter((r) => r.status === "expired").map((r) => r.account);
  const missing = HR_ACCOUNTS.filter((a) => !present.has(a));
  return { expired, missing };
}
