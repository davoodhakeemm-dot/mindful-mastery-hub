-- ROLES
create type public.app_role as enum ('admin','student');
create type public.student_status as enum ('pending','approved','suspended','removed');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own roles readable" on public.user_roles for select to authenticated using (user_id = auth.uid());
create policy "admins read roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- PROFILES / REGISTRATIONS
create table public.profiles (
  id uuid primary key,
  full_name text not null,
  age int,
  phone text,
  whatsapp text,
  gmail text not null,
  address text,
  photo_url text,
  selected_course uuid,
  status public.student_status not null default 'pending',
  consent_accepted boolean not null default false,
  registered_at timestamptz not null default now(),
  last_login timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "admins read profiles" on public.profiles for select to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid() and lower(gmail) = lower(coalesce(auth.jwt() ->> 'email','')));
create policy "update own profile fields" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid() and status = (select p.status from public.profiles p where p.id = auth.uid()));
create policy "admins update profiles" on public.profiles for update to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- COURSES
create table public.courses (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title_en text not null,
  title_ml text not null,
  description_en text,
  description_ml text,
  language text not null default 'bilingual',
  cover_path text,
  created_at timestamptz not null default now()
);
grant select on public.courses to authenticated, anon;
grant insert, update, delete on public.courses to authenticated;
grant all on public.courses to service_role;
alter table public.courses enable row level security;
create policy "courses readable" on public.courses for select using (true);
create policy "admins manage courses" on public.courses for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- COURSE ACCESS (authorized gmail accounts)
create table public.course_access (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  gmail text not null,
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  unique (course_id, gmail)
);
grant select on public.course_access to authenticated;
grant insert, update, delete on public.course_access to authenticated;
grant all on public.course_access to service_role;
alter table public.course_access enable row level security;
create policy "read own access" on public.course_access for select to authenticated using (lower(gmail) = lower(coalesce(auth.jwt() ->> 'email','')));
create policy "admins manage access" on public.course_access for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.has_course_access(_user_id uuid, _course_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    join public.course_access ca on lower(ca.gmail) = lower(p.gmail)
    where p.id = _user_id and p.status = 'approved'
      and ca.course_id = _course_id and ca.revoked = false
  )
$$;

-- LESSONS
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  lesson_number int not null default 1,
  title_en text not null,
  title_ml text,
  description_en text,
  description_ml text,
  content_en text,
  content_ml text,
  notes text,
  video_path text,
  pdf_path text,
  image_path text,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.lessons to authenticated;
grant all on public.lessons to service_role;
alter table public.lessons enable row level security;
create policy "authorized students read lessons" on public.lessons for select to authenticated using (public.has_course_access(auth.uid(), course_id));
create policy "admins manage lessons" on public.lessons for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- PROGRESS
create table public.student_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (user_id, lesson_id)
);
grant select, insert, update on public.student_progress to authenticated;
grant all on public.student_progress to service_role;
alter table public.student_progress enable row level security;
create policy "own progress" on public.student_progress for select to authenticated using (user_id = auth.uid());
create policy "insert own progress" on public.student_progress for insert to authenticated with check (user_id = auth.uid());
create policy "update own progress" on public.student_progress for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "admins read progress" on public.student_progress for select to authenticated using (public.has_role(auth.uid(),'admin'));

-- ADMIN GATE ATTEMPTS (rate limiting)
create table public.admin_key_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  fingerprint text not null,
  success boolean not null default false,
  created_at timestamptz not null default now()
);
grant all on public.admin_key_attempts to service_role;
alter table public.admin_key_attempts enable row level security;

-- SEED COURSES
insert into public.courses (slug, title_en, title_ml, description_en, description_ml, language) values
('hypnotism-malayalam','Hypnotism — Malayalam','ഹിപ്നോട്ടിസം — മലയാളം','Educational hypnotism course taught in Malayalam.','മലയാളത്തിൽ ഹിപ്നോട്ടിസം പഠനം.','malayalam'),
('hypnotism-english','Hypnotism — English','ഹിപ്നോട്ടിസം — ഇംഗ്ലീഷ്','Educational hypnotism course taught in English.','ഇംഗ്ലീഷിൽ ഹിപ്നോട്ടിസം പഠനം.','english');

insert into public.lessons (course_id, lesson_number, title_en, title_ml, description_en, description_ml, content_en, content_ml)
select c.id, 1, 'Introduction to Hypnotism', 'ഹിപ്നോട്ടിസം — ആമുഖം',
 'What hypnotism is, and what it is not.',
 'ഹിപ്നോട്ടിസം എന്താണ്, എന്തല്ല.',
 'Hypnotism is a technique involving focused attention, relaxation, and increased responsiveness to suggestions. Hypnosis is commonly described as a state involving focused attention and heightened suggestibility. It is not the same as ordinary sleep, and a person generally retains awareness and the ability to respond according to their own choices. Hypnotism has been studied in psychological and scientific contexts and has also been used in performance and certain complementary or clinical settings by appropriately trained professionals. This course teaches students to understand hypnotism responsibly rather than presenting it as supernatural mind control.',
 'ഹിപ്നോട്ടിസം (Hypnotism) എന്നത് ശ്രദ്ധയെ ഒരു പ്രത്യേക കാര്യത്തിൽ കേന്ദ്രീകരിക്കൽ, വിശ്രമാവസ്ഥ, നിർദ്ദേശങ്ങളോട് കൂടുതൽ ശ്രദ്ധ പുലർത്തുന്ന അവസ്ഥ എന്നിവയുമായി ബന്ധപ്പെട്ട ഒരു സാങ്കേതികവിദ്യയാണ്. ഹിപ്നോസിസ് സാധാരണ ഉറക്കത്തിന് തുല്യമല്ല. ഹിപ്നോട്ടിക് അവസ്ഥയിലുള്ള വ്യക്തിക്ക് ചുറ്റുപാടുകളെക്കുറിച്ച് ഒരു പരിധിവരെ ബോധവാനായിരിക്കാം. ഒരാളുടെ മനസ്സിന്റെ പൂർണ്ണ നിയന്ത്രണം മറ്റൊരാൾക്ക് ലഭിക്കുന്നു എന്നത് ഹിപ്നോസിസിന്റെ ശാസ്ത്രീയമായ വിവരണം അല്ല. ഈ കോഴ്സ് ഹിപ്നോട്ടിസത്തെ ശാസ്ത്രീയവും ഉത്തരവാദിത്തപരവുമായ രീതിയിൽ മനസ്സിലാക്കാൻ സഹായിക്കുന്നതിനാണ്.'
from public.courses c;