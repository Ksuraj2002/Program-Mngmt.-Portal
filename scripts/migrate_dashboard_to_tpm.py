"""
One-shot migration from the standalone dashboard_app (Flask/SQLAlchemy) to
the merged TPM portal (Next.js + Supabase).

Reads:
  --source-db PATH         Path to dashboard_app's SQLite file (default:
                           ../Tracker/dashboard_app/dev.db relative to this
                           file). Passing a Postgres URL is not supported by
                           this stdlib-only reader; if the tracker's data
                           lives in Supabase Postgres, dump it to a local
                           SQLite copy first or extend this script.

Writes to (via Supabase REST):
  SUPABASE_URL             https://<project>.supabase.co
  SUPABASE_SERVICE_ROLE_KEY  service_role key (server-only)

Behavior:
  - Campus and Subject rows are matched by name against TPM's existing
    tables. Missing ones are created. Every FK is remapped to TPM's UUIDs.
  - Contests, challenges, students, and only the LATEST leaderboard snapshot
    per contest are copied. Older snapshots are dropped by design — the
    merged UI only ever uses the latest fetch, and copying every historical
    fetch bloats the DB for no gain.
  - Idempotent-ish: contests are keyed by (subject_id, slug); students by
    (subject_id, lower(username)) — a re-run won't duplicate them. Snapshots
    are just re-inserted, so if you re-run, delete tracker_leaderboard_snapshots
    for the affected contests first (or just fetch again from the UI).

Run:
  python scripts/migrate_dashboard_to_tpm.py \\
      --source-db /path/to/dashboard_app/dev.db
"""
import argparse
import json
import os
import sqlite3
import sys
import urllib.request
from pathlib import Path

DEFAULT_SOURCE = (
    Path(__file__).resolve().parent.parent.parent
    / "Tracker"
    / "dashboard_app"
    / "dev.db"
)


def env(name):
    v = os.environ.get(name)
    if not v:
        sys.exit(f"ERROR: env var {name} is required.")
    return v


class Supa:
    def __init__(self):
        self.url = env("SUPABASE_URL").rstrip("/")
        self.key = env("SUPABASE_SERVICE_ROLE_KEY")

    def _req(self, method, path, body=None, params=None, prefer=None):
        url = f"{self.url}/rest/v1{path}"
        if params:
            qs = "&".join(f"{k}={v}" for k, v in params.items())
            url = f"{url}?{qs}"
        data = None
        if body is not None:
            data = json.dumps(body).encode("utf-8")
        req = urllib.request.Request(url, data=data, method=method)
        req.add_header("apikey", self.key)
        req.add_header("Authorization", f"Bearer {self.key}")
        req.add_header("Content-Type", "application/json")
        if prefer:
            req.add_header("Prefer", prefer)
        with urllib.request.urlopen(req) as resp:
            raw = resp.read()
            if not raw:
                return None
            return json.loads(raw)

    def select(self, table, params):
        return self._req("GET", f"/{table}", params=params) or []

    def insert(self, table, row):
        return self._req(
            "POST",
            f"/{table}",
            body=[row],
            prefer="return=representation",
        )


def match_or_create_campus(supa, name, cache):
    if name in cache:
        return cache[name]
    hits = supa.select("campuses", {"name": f"eq.{name}", "select": "id,name"})
    if hits:
        cache[name] = hits[0]["id"]
        return cache[name]
    created = supa.insert("campuses", {"name": name})
    cache[name] = created[0]["id"]
    print(f"  created campus: {name}")
    return cache[name]


def match_or_create_subject(supa, campus_id, name, cache):
    key = (campus_id, name)
    if key in cache:
        return cache[key]
    hits = supa.select(
        "subjects",
        {
            "campus_id": f"eq.{campus_id}",
            "name": f"eq.{name}",
            "select": "id,name",
        },
    )
    if hits:
        cache[key] = hits[0]["id"]
        return cache[key]
    created = supa.insert(
        "subjects", {"campus_id": campus_id, "name": name}
    )
    cache[key] = created[0]["id"]
    print(f"  created subject: {name}")
    return cache[key]


def match_or_create_contest(supa, subject_id, slug, row):
    hits = supa.select(
        "tracker_contests",
        {
            "subject_id": f"eq.{subject_id}",
            "slug": f"eq.{slug}",
            "select": "id",
        },
    )
    if hits:
        return hits[0]["id"], False
    created = supa.insert(
        "tracker_contests",
        {
            "subject_id": subject_id,
            "slug": slug,
            "display_name": row["display_name"],
            "lecture_cutoff_challenge_count": row["lecture_cutoff_challenge_count"],
            "last_fetched_at": row["last_fetched_at"],
        },
    )
    return created[0]["id"], True


def upsert_student(supa, campus_id, subject_id, row):
    username = row["hackerrank_username"]
    hits = supa.select(
        "tracker_students",
        {
            "subject_id": f"eq.{subject_id}",
            "hackerrank_username": f"eq.{username}",
            "select": "id",
        },
    )
    if hits:
        return hits[0]["id"], False
    created = supa.insert(
        "tracker_students",
        {
            "campus_id": campus_id,
            "subject_id": subject_id,
            "name": row["name"],
            "hackerrank_username": username,
        },
    )
    return created[0]["id"], True


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--source-db", type=Path, default=DEFAULT_SOURCE)
    args = ap.parse_args()

    if not args.source_db.exists():
        sys.exit(f"ERROR: source DB not found at {args.source_db}")

    supa = Supa()
    conn = sqlite3.connect(args.source_db)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()

    campus_cache = {}
    subject_cache = {}

    campuses = cur.execute("SELECT * FROM campuses ORDER BY name").fetchall()
    print(f"Source has {len(campuses)} campuses.")
    for c in campuses:
        print(f"- {c['name']}")
        campus_id = match_or_create_campus(supa, c["name"], campus_cache)

        subjects = cur.execute(
            "SELECT * FROM subjects WHERE campus_id = ? ORDER BY name",
            (c["id"],),
        ).fetchall()
        for s in subjects:
            print(f"  - subject {s['name']}")
            subject_id = match_or_create_subject(
                supa, campus_id, s["name"], subject_cache
            )

            students = cur.execute(
                "SELECT * FROM students WHERE subject_id = ?", (s["id"],)
            ).fetchall()
            new_students = 0
            for st in students:
                _, created = upsert_student(supa, campus_id, subject_id, st)
                if created:
                    new_students += 1
            print(
                f"    students: {new_students} new / {len(students)} in source"
            )

            contests = cur.execute(
                "SELECT * FROM contests WHERE subject_id = ?", (s["id"],)
            ).fetchall()
            for cs in contests:
                new_contest_id, created = match_or_create_contest(
                    supa, subject_id, cs["slug"], cs
                )
                marker = "new" if created else "existing"
                print(f"    contest {cs['slug']} ({marker})")

                if created:
                    challenges = cur.execute(
                        "SELECT * FROM challenges WHERE contest_id = ? ORDER BY sequence",
                        (cs["id"],),
                    ).fetchall()
                    for ch in challenges:
                        supa.insert(
                            "tracker_challenges",
                            {
                                "contest_id": new_contest_id,
                                "hr_challenge_id": ch["hr_challenge_id"],
                                "name": ch["name"],
                                "max_score": float(ch["max_score"] or 0),
                                "sequence": ch["sequence"],
                            },
                        )
                    print(f"      challenges: {len(challenges)}")

                    latest = cur.execute(
                        "SELECT MAX(fetched_at) AS f FROM leaderboard_snapshots WHERE contest_id = ?",
                        (cs["id"],),
                    ).fetchone()
                    if latest and latest["f"]:
                        snaps = cur.execute(
                            "SELECT * FROM leaderboard_snapshots "
                            "WHERE contest_id = ? AND fetched_at = ?",
                            (cs["id"], latest["f"]),
                        ).fetchall()
                        for snap in snaps:
                            supa.insert(
                                "tracker_leaderboard_snapshots",
                                {
                                    "contest_id": new_contest_id,
                                    "hackerrank_username": snap["hackerrank_username"],
                                    "hackerrank_hacker_id": snap["hackerrank_hacker_id"],
                                    "total_score": float(snap["total_score"] or 0),
                                    "rank": snap["rank"],
                                    "time_taken": snap["time_taken"],
                                    "fetched_at": snap["fetched_at"],
                                },
                            )
                        print(f"      snapshots: {len(snaps)} (latest batch)")

    print("Done.")


if __name__ == "__main__":
    main()
