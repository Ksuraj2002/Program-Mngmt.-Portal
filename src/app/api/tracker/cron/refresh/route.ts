import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { HR_ACCOUNTS } from "@/lib/tracker/account";
import { refreshAccountFromStorage } from "@/lib/tracker/refresh";

// Daily HackerRank refresh, hit by Vercel Cron (see vercel.json).
// Auth: either Vercel's Bearer CRON_SECRET header, or ?secret=... query for
// manual runs / other schedulers.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  if (auth === `Bearer ${secret}`) return true;
  const url = new URL(req.url);
  return url.searchParams.get("secret") === secret;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const supabase = createAdminClient();
  const results = [];
  for (const account of HR_ACCOUNTS) {
    const r = await refreshAccountFromStorage(supabase, account);
    results.push({ account, ...r });
  }
  return NextResponse.json({ ran_at: new Date().toISOString(), results });
}

export async function POST(req: Request) {
  return GET(req);
}
