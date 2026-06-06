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

create table public.events (
  id          bigint generated always as identity primary key,
  title       text        not null,
  type        text        not null check (type in ('Exam','Quiz','Test','Homework','Presentation')),
  date        date        not null,
  description text,
  subject_id  bigint      not null references public.subjects(id) on delete cascade,
  grade_id    bigint      not null references public.grades(id)   on delete cascade,
  teacher_id  uuid        not null references public.profiles(id) on delete cascade,
  created_at  timestamptz default now()
);

-- ──────────────────────────────────────────────────────────────
-- 2. INDEXES
-- ──────────────────────────────────────────────────────────────

create index on public.events (grade_id, date);
create index on public.events (teacher_id);
create index on public.teacher_subjects (teacher_id);

-- ──────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────

alter table public.grades           enable row level security;
alter table public.subjects         enable row level security;
alter table public.profiles         enable row level security;
alter table public.teacher_subjects enable row level security;
alter table public.events           enable row level security;

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

-- ── PROFILES: users read own row; admin reads all ────────────
create policy "profiles_select_own" on public.profiles
  for select using (
    id = auth.uid() or public.my_role() = 'admin'
  );

create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (
    id = auth.uid() or public.my_role() = 'admin'
  );

-- ── TEACHER_SUBJECTS: teachers see own; admin sees all ───────
create policy "ts_select" on public.teacher_subjects
  for select using (
    teacher_id = auth.uid() or public.my_role() in ('admin','student','parent')
  );

create policy "ts_write" on public.teacher_subjects
  for all using (public.my_role() = 'admin');

-- ── EVENTS ───────────────────────────────────────────────────
-- Students/parents: only see events for their own grade
create policy "events_select_student_parent" on public.events
  for select using (
    public.my_role() in ('student','parent')
    and grade_id = public.my_grade_id()
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

-- Teachers: can only update/delete their own events
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
