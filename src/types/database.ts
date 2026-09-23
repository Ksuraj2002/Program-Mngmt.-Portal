export type Role = "admin" | "faculty";
export type EntryType = "assignment" | "test";

export type TrackerContest = {
  id: string;
  subject_id: string;
  slug: string;
  display_name: string | null;
  lecture_cutoff_challenge_count: number | null;
  last_fetched_at: string | null;
  created_at: string;
};

export type TrackerChallenge = {
  id: string;
  contest_id: string;
  hr_challenge_id: string;
  name: string | null;
  max_score: number;
  sequence: number;
};

export type TrackerStudent = {
  id: string;
  campus_id: string;
  subject_id: string;
  name: string | null;
  hackerrank_username: string;
  created_at: string;
};

export type TrackerLeaderboardSnapshot = {
  id: string;
  contest_id: string;
  hackerrank_username: string;
  hackerrank_hacker_id: string | null;
  total_score: number | null;
  rank: number | null;
  time_taken: number | null;
  fetched_at: string;
};

export type Profile = {
  id: string;
  full_name: string;
  role: Role;
  created_at: string;
};

export type Campus = {
  id: string;
  name: string;
  created_at: string;
};

export type Subject = {
  id: string;
  campus_id: string;
  name: string;
  created_at: string;
};

export type FacultySubject = {
  faculty_id: string;
  subject_id: string;
  created_at: string;
};

export type Entry = {
  id: string;
  subject_id: string;
  type: EntryType;
  title: string;
  description: string | null;
  due_date: string;
  max_marks: number | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string; full_name: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      campuses: {
        Row: Campus;
        Insert: Partial<Campus> & { name: string };
        Update: Partial<Campus>;
        Relationships: [];
      };
      subjects: {
        Row: Subject;
        Insert: Partial<Subject> & { campus_id: string; name: string };
        Update: Partial<Subject>;
        Relationships: [
          {
            foreignKeyName: "subjects_campus_id_fkey";
            columns: ["campus_id"];
            isOneToOne: false;
            referencedRelation: "campuses";
            referencedColumns: ["id"];
          }
        ];
      };
      faculty_subjects: {
        Row: FacultySubject;
        Insert: Pick<FacultySubject, "faculty_id" | "subject_id">;
        Update: Partial<FacultySubject>;
        Relationships: [
          {
            foreignKeyName: "faculty_subjects_faculty_id_fkey";
            columns: ["faculty_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "faculty_subjects_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      entries: {
        Row: Entry;
        Insert: Partial<Entry> & {
          subject_id: string;
          type: EntryType;
          title: string;
          due_date: string;
        };
        Update: Partial<Entry>;
        Relationships: [
          {
            foreignKeyName: "entries_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "entries_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      tracker_contests: {
        Row: TrackerContest;
        Insert: Partial<TrackerContest> & { subject_id: string; slug: string };
        Update: Partial<TrackerContest>;
        Relationships: [
          {
            foreignKeyName: "tracker_contests_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      tracker_challenges: {
        Row: TrackerChallenge;
        Insert: Partial<TrackerChallenge> & {
          contest_id: string;
          hr_challenge_id: string;
          sequence: number;
        };
        Update: Partial<TrackerChallenge>;
        Relationships: [
          {
            foreignKeyName: "tracker_challenges_contest_id_fkey";
            columns: ["contest_id"];
            isOneToOne: false;
            referencedRelation: "tracker_contests";
            referencedColumns: ["id"];
          }
        ];
      };
      tracker_students: {
        Row: TrackerStudent;
        Insert: Partial<TrackerStudent> & {
          campus_id: string;
          subject_id: string;
          hackerrank_username: string;
        };
        Update: Partial<TrackerStudent>;
        Relationships: [
          {
            foreignKeyName: "tracker_students_campus_id_fkey";
            columns: ["campus_id"];
            isOneToOne: false;
            referencedRelation: "campuses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tracker_students_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      tracker_leaderboard_snapshots: {
        Row: TrackerLeaderboardSnapshot;
        Insert: Partial<TrackerLeaderboardSnapshot> & {
          contest_id: string;
          hackerrank_username: string;
        };
        Update: Partial<TrackerLeaderboardSnapshot>;
        Relationships: [
          {
            foreignKeyName: "tracker_leaderboard_snapshots_contest_id_fkey";
            columns: ["contest_id"];
            isOneToOne: false;
            referencedRelation: "tracker_contests";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      tracker_subject_aggregates: {
        Row: {
          subject_id: string;
          campus_id: string;
          subject_name: string;
          student_count: number;
          participants: number;
          avg_score: number;
          top_score: number;
          min_score: number;
          median_score: number;
          avg_pct_completion: number;
          contest_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      teaches_subject: {
        Args: { target_subject_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
