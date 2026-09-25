// Two HackerRank accounts host all our contests. The mapping between a
// contest and its account is stored explicitly in tracker_contests.hr_account
// when an admin sets it on the contest edit page; when null, we fall back to
// parsing the slug for a "101" or "301" token (the historical behavior).
export const HR_ACCOUNTS = ["101", "301"] as const;
export type HRAccount = (typeof HR_ACCOUNTS)[number];

// Slug-based fallback used when hr_account is null.
export function inferAccountFromSlug(slug: string): HRAccount | null {
  const tokens = slug.split("-");
  for (const acc of HR_ACCOUNTS) {
    if (tokens.includes(acc)) return acc;
  }
  return null;
}

// The canonical resolver every caller should use: stored override wins,
// slug parse is the fallback, null means "unassigned — needs admin action".
export function contestAccount(contest: {
  slug: string;
  hr_account?: HRAccount | null;
}): HRAccount | null {
  if (contest.hr_account) return contest.hr_account;
  return inferAccountFromSlug(contest.slug);
}
