// Contests are owned by one of two HackerRank accounts; we infer which from
// a token in the slug (e.g. "dsa-101-classwork" -> 101 account). The tracker
// landing page groups its bulk-fetch forms by this so one cookie paste
// refreshes every contest under that account.
export const HR_ACCOUNTS = ["101", "301"] as const;
export type HRAccount = (typeof HR_ACCOUNTS)[number];

export function contestAccount(slug: string): HRAccount | null {
  const tokens = slug.split("-");
  for (const acc of HR_ACCOUNTS) {
    if (tokens.includes(acc)) return acc;
  }
  return null;
}
