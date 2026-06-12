-- ============================================================
--  SchoolAgenda — Supabase SQL Schema
--  Run this in your Supabase project: SQL Editor → New query
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. TABLES
-- ──────────────────────────────────────────────────────────────

create table public.grades (
  id         bigint generated always as identity primary key,
  name       text not null,
  year       int  not null,
  created_at timestamptz default now()
);

create table public.subjects (
  id         bigint generated always as identity primary key,
  name       text   not null,
  grade_id   bigint not null references public.grades(id) on delete cascade,
  created_at timestamptz default now()
);

-- Extends Supabase's auth.users with role + grade info
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       text not null check (role in ('admin','teacher','student','parent')),
  grade_id   bigint references public.grades(id) on delete set null,
  created_at timestamptz default now()
);

-- Which teacher teaches which subject
create table public.teacher_subjects (
  id         bigint generated always as identity primary key,
  teacher_id uuid   not null references public.profiles(id) on delete cascade,
  subject_id bigint not null references public.subjects(id) on delete cascade,
  unique (teacher_id, subject_id)
);

-- Link parents to their children (students)
create table public.parent_student_connections (
  id         bigint generated always as identity primary key,
  parent_id  uuid   not null references public.profiles(id) on delete cascade,
  student_id uuid   not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (parent_id, student_id)
);

-- Temporary shared keys for parents to use during signup
create table public.shared_keys (
  id         bigint generated always as identity primary key,
  student_id uuid   not null references public.profiles(id) on delete cascade,
  key        text   not null unique,
  expires_at timestamptz not null,
  used_by    uuid references public.profiles(id) on delete set null,
  used_at    timestamptz,
  created_at timestamptz default now()
);

create extension if not exists btree_gist;

create table public.events (
  id          bigint generated always as identity primary key,
  title       text        not null,
  type        text        not null check (type in ('Exam','Quiz','Test','Homework','Presentation')),
  date        date        not null,
  starts_at   timestamptz not null,
  ends_at     timestamptz not null,
  description text,
  subject_id  bigint      not null references public.subjects(id) on delete cascade,
  grade_id    bigint      not null references public.grades(id)   on delete cascade,
  teacher_id  uuid        not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now(),
  constraint events_time_order check (ends_at > starts_at),
  constraint events_no_overlap exclude using gist (
    grade_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  )
);

-- ──────────────────────────────────────────────────────────────
-- 2. INDEXES
-- ──────────────────────────────────────────────────────────────

create index on public.events (grade_id, date);
create index on public.events (starts_at);
create index on public.events (teacher_id);
create index on public.teacher_subjects (teacher_id);
create index on public.parent_student_connections (parent_id);
create index on public.parent_student_connections (student_id);
create index on public.shared_keys (student_id);
create index on public.shared_keys (key);
create index on public.shared_keys (expires_at);

-- ──────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────

alter table public.grades                     enable row level security;
alter table public.subjects                   enable row level security;
alter table public.profiles                   enable row level security;
alter table public.teacher_subjects           enable row level security;
alter table public.parent_student_connections enable row level security;
alter table public.shared_keys                enable row level security;
alter table public.events                     enable row level security;

-- Helper: get current user's role from profiles
create or replace function public.my_role()
returns text language sql security definer stable as
$$
  select role from public.profiles where id = auth.uid();
$$;

-- Helper: get current user's grade_id
create or replace function public.my_grade_id()
returns bigint language sql security definer stable as
$$
  select grade_id from public.profiles where id = auth.uid();
$$;

-- ── GRADES: everyone can read; only admin can write ──────────
create policy "grades_select" on public.grades
  for select using (true);

create policy "grades_insert" on public.grades
  for insert with check (public.my_role() = 'admin');

create policy "grades_update" on public.grades
  for update using (public.my_role() = 'admin');

create policy "grades_delete" on public.grades
  for delete using (public.my_role() = 'admin');

-- ── SUBJECTS: everyone can read; only admin can write ────────
create policy "subjects_select" on public.subjects
  for select using (true);

create policy "subjects_insert" on public.subjects
  for insert with check (public.my_role() = 'admin');

create policy "subjects_update" on public.subjects
  for update using (public.my_role() = 'admin');

create policy "subjects_delete" on public.subjects
  for delete using (public.my_role() = 'admin');

-- ── PROFILES ─────────────────────────────────────────────────
-- Users see their own row; admin sees all;
-- parents can see their linked children's profiles
create policy "profiles_select_own" on public.profiles
  for select using (
    id = auth.uid()
    or public.my_role() = 'admin'
    or (
      public.my_role() = 'parent'
      and id in (
        select student_id from public.parent_student_connections
        where parent_id = auth.uid()
      )
    )
  );

create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (
    id = auth.uid() or public.my_role() = 'admin'
  );

-- ── TEACHER_SUBJECTS ─────────────────────────────────────────
create policy "ts_select" on public.teacher_subjects
  for select using (
    teacher_id = auth.uid() or public.my_role() in ('admin','student','parent')
  );

create policy "ts_write" on public.teacher_subjects
  for all using (public.my_role() = 'admin');

-- ── PARENT_STUDENT_CONNECTIONS ───────────────────────────────
create policy "psc_select_own" on public.parent_student_connections
  for select using (
    parent_id = auth.uid() or
    student_id = auth.uid() or
    public.my_role() = 'admin'
  );

-- Parents can insert their own connections; admin can insert any
create policy "psc_insert_parent" on public.parent_student_connections
  for insert with check (
    parent_id = auth.uid() or
    public.my_role() = 'admin'
  );

-- Parents can remove their own connections; admin can remove any
create policy "psc_delete_parent" on public.parent_student_connections
  for delete using (
    parent_id = auth.uid() or
    public.my_role() = 'admin'
  );

-- ── SHARED_KEYS ──────────────────────────────────────────────
-- Students see their own keys; parents can read any key to validate; admin sees all
create policy "sk_select" on public.shared_keys
  for select using (
    student_id = auth.uid() or
    public.my_role() = 'parent' or
    public.my_role() = 'admin'
  );

-- Only students can generate keys for themselves
create policy "sk_insert_student" on public.shared_keys
  for insert with check (student_id = auth.uid());

-- Parents can mark a key as used; students and admin can also update
create policy "sk_update_on_use" on public.shared_keys
  for update using (
    student_id = auth.uid() or
    public.my_role() = 'parent' or
    public.my_role() = 'admin'
  );

-- ── EVENTS ───────────────────────────────────────────────────
-- Students: only see events for their own grade
create policy "events_select_student" on public.events
  for select using (
    public.my_role() = 'student'
    and grade_id = public.my_grade_id()
  );

-- Parents: see events for all their children's grades
create policy "events_select_parent" on public.events
  for select using (
    public.my_role() = 'parent'
    and grade_id in (
      select distinct p.grade_id from public.profiles p
      join public.parent_student_connections psc on psc.student_id = p.id
      where psc.parent_id = auth.uid()
    )
  );

-- Teachers: see events for grades they teach
create policy "events_select_teacher" on public.events
  for select using (
    public.my_role() = 'teacher'
    and grade_id in (
      select s.grade_id from public.subjects s
      join public.teacher_subjects ts on ts.subject_id = s.id
      where ts.teacher_id = auth.uid()
    )
  );

-- Admin: sees everything
create policy "events_select_admin" on public.events
  for select using (public.my_role() = 'admin');

-- Teachers: can only insert events for subjects they teach
create policy "events_insert_teacher" on public.events
  for insert with check (
    public.my_role() = 'teacher'
    and teacher_id = auth.uid()
    and subject_id in (
      select subject_id from public.teacher_subjects
      where teacher_id = auth.uid()
    )
  );

-- Teachers: can only update/delete their own events; admin can do anything
create policy "events_update_own" on public.events
  for update using (
    teacher_id = auth.uid() or public.my_role() = 'admin'
  );

create policy "events_delete_own" on public.events
  for delete using (
    teacher_id = auth.uid() or public.my_role() = 'admin'
  );

-- ──────────────────────────────────────────────────────────────
-- 4. AUTO-CREATE PROFILE ON SIGNUP
--    (Supabase trigger — runs whenever a new user registers)
-- ──────────────────────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as
$$
begin
  insert into public.profiles (id, full_name, role, grade_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'User'),
    coalesce(new.raw_user_meta_data->>'role', 'student'),
    (new.raw_user_meta_data->>'grade_id')::bigint
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ──────────────────────────────────────────────────────────────
-- 5. SEED DATA (optional — remove in production)
-- ──────────────────────────────────────────────────────────────

insert into public.grades (name, year) values
  ('Grade 9A', 2026),
  ('Grade 10B', 2026),
  ('Grade 11C', 2026);

insert into public.subjects (name, grade_id) values
  ('Mathematics',  1),
  ('Physics',      1),
  ('Biology',      1),
  ('Mathematics',  2),
  ('Chemistry',    2),
  ('History',      2),
  ('Calculus',     3),
  ('Literature',   3),
  ('Physics',      3);

-- Note: user profiles are created automatically via the trigger above.
-- To create an admin manually (after signing up via the app):
--
--   update public.profiles set role = 'admin' where id = '<your-user-uuid>';