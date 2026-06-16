-- ============================================================
--  SchoolAgenda — Complete Supabase Schema
--  Run this in: SQL Editor → New query → Run
-- ============================================================

-- ──────────────────────────────────────────────────────────────
-- 1. EXTENSIONS
-- ──────────────────────────────────────────────────────────────

create extension if not exists btree_gist;

-- ──────────────────────────────────────────────────────────────
-- 2. TABLES
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

create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null,
  role       text not null check (role in ('admin','teacher','student','parent')),
  grade_id   bigint references public.grades(id) on delete set null,
  created_at timestamptz default now()
);

create table public.teacher_subjects (
  id         bigint generated always as identity primary key,
  teacher_id uuid   not null references public.profiles(id) on delete cascade,
  subject_id bigint not null references public.subjects(id) on delete cascade,
  unique (teacher_id, subject_id)
);

create table public.parent_student_connections (
  id         bigint generated always as identity primary key,
  parent_id  uuid   not null references public.profiles(id) on delete cascade,
  student_id uuid   not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (parent_id, student_id)
);

create table public.shared_keys (
  id         bigint generated always as identity primary key,
  student_id uuid   not null references public.profiles(id) on delete cascade,
  key        text   not null unique,
  expires_at timestamptz not null,
  used_by    uuid references public.profiles(id) on delete set null,
  used_at    timestamptz,
  created_at timestamptz default now()
);

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
-- 3. INDEXES
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
-- 4. HELPER FUNCTIONS
-- ──────────────────────────────────────────────────────────────

create or replace function public.my_role()
returns text language sql security definer stable as
$$ select role from public.profiles where id = auth.uid(); $$;

create or replace function public.my_grade_id()
returns bigint language sql security definer stable as
$$ select grade_id from public.profiles where id = auth.uid(); $$;

-- ──────────────────────────────────────────────────────────────
-- 5. GRANTS  ← the missing piece that caused all the trouble
-- ──────────────────────────────────────────────────────────────

grant usage on schema public to anon, authenticated;

grant execute on function public.my_role()     to authenticated;
grant execute on function public.my_grade_id() to authenticated;

grant select, insert, update, delete on public.profiles                   to authenticated;
grant select, insert, update, delete on public.grades                     to authenticated;
grant select, insert, update, delete on public.subjects                   to authenticated;
grant select, insert, update, delete on public.events                     to authenticated;
grant select, insert, update, delete on public.teacher_subjects           to authenticated;
grant select, insert, update, delete on public.parent_student_connections to authenticated;
grant select, insert, update, delete on public.shared_keys                to authenticated;

grant usage, select on all sequences in schema public to authenticated;

-- ──────────────────────────────────────────────────────────────
-- 6. ROW LEVEL SECURITY
-- ──────────────────────────────────────────────────────────────

alter table public.grades                     enable row level security;
alter table public.subjects                   enable row level security;
alter table public.profiles                   enable row level security;
alter table public.teacher_subjects           enable row level security;
alter table public.parent_student_connections enable row level security;
alter table public.shared_keys                enable row level security;
alter table public.events                     enable row level security;

-- grades
create policy "grades_select" on public.grades for select using (true);
create policy "grades_insert" on public.grades for insert with check (public.my_role() = 'admin');
create policy "grades_update" on public.grades for update using (public.my_role() = 'admin');
create policy "grades_delete" on public.grades for delete using (public.my_role() = 'admin');

-- subjects
create policy "subjects_select" on public.subjects for select using (true);
create policy "subjects_insert" on public.subjects for insert with check (public.my_role() = 'admin');
create policy "subjects_update" on public.subjects for update using (public.my_role() = 'admin');
create policy "subjects_delete" on public.subjects for delete using (public.my_role() = 'admin');

-- profiles
create policy "profiles_select_own" on public.profiles
  for select using (
    id = auth.uid()
    or public.my_role() = 'admin'
    or (public.my_role() = 'parent' and id in (
      select student_id from public.parent_student_connections where parent_id = auth.uid()
    ))
  );
create policy "profiles_insert_own" on public.profiles
  for insert with check (id = auth.uid());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid() or public.my_role() = 'admin');

-- teacher_subjects
create policy "ts_select" on public.teacher_subjects
  for select using (teacher_id = auth.uid() or public.my_role() in ('admin','student','parent'));
create policy "ts_write" on public.teacher_subjects
  for all using (public.my_role() = 'admin');

-- parent_student_connections
create policy "psc_select_own" on public.parent_student_connections
  for select using (parent_id = auth.uid() or student_id = auth.uid() or public.my_role() = 'admin');
create policy "psc_insert_parent" on public.parent_student_connections
  for insert with check (parent_id = auth.uid() or public.my_role() = 'admin');
create policy "psc_delete_parent" on public.parent_student_connections
  for delete using (parent_id = auth.uid() or public.my_role() = 'admin');

-- shared_keys
create policy "sk_select" on public.shared_keys
  for select using (student_id = auth.uid() or public.my_role() = 'parent' or public.my_role() = 'admin');
create policy "sk_insert_student" on public.shared_keys
  for insert with check (student_id = auth.uid());
create policy "sk_update_on_use" on public.shared_keys
  for update using (student_id = auth.uid() or public.my_role() in ('parent','admin'));

-- events
create policy "events_select_student" on public.events
  for select using (public.my_role() = 'student' and grade_id = public.my_grade_id());
create policy "events_select_parent" on public.events
  for select using (
    public.my_role() = 'parent' and grade_id in (
      select distinct p.grade_id from public.profiles p
      join public.parent_student_connections psc on psc.student_id = p.id
      where psc.parent_id = auth.uid()
    )
  );
create policy "events_select_teacher" on public.events
  for select using (
    public.my_role() = 'teacher' and grade_id in (
      select s.grade_id from public.subjects s
      join public.teacher_subjects ts on ts.subject_id = s.id
      where ts.teacher_id = auth.uid()
    )
  );
create policy "events_select_admin" on public.events
  for select using (public.my_role() = 'admin');
create policy "events_insert_teacher" on public.events
  for insert with check (
    public.my_role() = 'teacher' and teacher_id = auth.uid()
    and subject_id in (
      select subject_id from public.teacher_subjects where teacher_id = auth.uid()
    )
  );
create policy "events_update_own" on public.events
  for update using (teacher_id = auth.uid() or public.my_role() = 'admin');
create policy "events_delete_own" on public.events
  for delete using (teacher_id = auth.uid() or public.my_role() = 'admin');

-- ──────────────────────────────────────────────────────────────
-- 7. AUTO-CREATE PROFILE ON SIGNUP
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
-- 8. SEED DATA
-- ──────────────────────────────────────────────────────────────

insert into public.grades (name, year) values
  ('Grade 5B Vidra', 2026);

insert into public.subjects (name, grade_id) values
  ('Informatika',              1),
  ('Magyar',                   1),
  ('Etika',                    1),
  ('Magyar: olvasás nyelvtan', 1),
  ('Matek',                    1),
  ('Angol',                    1),
  ('Környezet',                1),
  ('Történelem',               1);

-- ──────────────────────────────────────────────────────────────
-- 9. AFTER SIGNING UP: promote yourself to admin
--    Find your UUID in Authentication → Users
-- ──────────────────────────────────────────────────────────────
--
--   update public.profiles set role = 'admin'
--   where id = '<your-uuid>';
