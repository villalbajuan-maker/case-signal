create schema if not exists research;

create type research.survey_status as enum ('draft', 'active', 'archived');
create type research.submission_source as enum (
  'self_submitted',
  'assisted_live_interview',
  'referral',
  'outbound_request'
);
create type research.review_status as enum (
  'new',
  'reviewed',
  'high_signal',
  'follow_up',
  'archived'
);

create table research.surveys (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  status research.survey_status not null default 'draft',
  version text not null default 'v1',
  estimated_minutes integer not null default 10,
  config_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table research.admin_users (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now())
);

create or replace function research.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, research
as $$
  select exists (
    select 1
    from research.admin_users au
    where au.user_id = auth.uid()
  );
$$;

create table research.submissions (
  id uuid primary key default gen_random_uuid(),
  survey_id uuid not null references research.surveys (id) on delete restrict,
  submitted_at timestamptz not null default timezone('utc', now()),
  source research.submission_source not null default 'self_submitted',
  interviewer_name text,
  respondent_role text not null,
  years_experience text not null,
  practice_types jsonb not null default '[]'::jsonb,
  active_case_volume text not null,
  primary_case_system text not null,
  review_frequency text not null,
  public_sources_used jsonb not null default '[]'::jsonb,
  source_reviewer_role text not null,
  prioritization_method text not null,
  manuality_score integer not null check (manuality_score between 1 and 5),
  difficulty_score integer not null check (difficulty_score between 1 and 5),
  early_review_frequency text not null,
  late_identification_frequency text not null,
  dependency_score integer not null check (dependency_score between 1 and 5),
  external_info_contribution text not null,
  problem_seriousness text not null,
  top_operational_difficulties jsonb not null default '[]'::jsonb,
  time_spent_level text not null,
  manual_reduction_value_score integer not null check (manual_reduction_value_score between 1 and 5),
  most_valuable_outcome text not null,
  weekly_view_usefulness_score integer not null check (weekly_view_usefulness_score between 1 and 5),
  likely_to_use_alongside_current_system text not null,
  comfort_with_separate_tool text not null,
  trust_factors jsonb not null default '[]'::jsonb,
  demo_interest text not null,
  referral_openness text not null,
  referral_count_estimate text not null,
  follow_up_openness text not null,
  additional_comments text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table research.submission_meta (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references research.submissions (id) on delete cascade,
  ip_hash text,
  user_agent text,
  referrer text,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  created_at timestamptz not null default timezone('utc', now())
);

create table research.reviews (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null unique references research.submissions (id) on delete cascade,
  review_status research.review_status not null default 'new',
  signal_score integer check (signal_score between 1 and 100),
  internal_notes text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table research.referrals (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references research.submissions (id) on delete cascade,
  name text,
  email text,
  notes text,
  created_at timestamptz not null default timezone('utc', now())
);

create index idx_research_surveys_status
  on research.surveys (status, slug);

create index idx_research_submissions_survey_submitted_at
  on research.submissions (survey_id, submitted_at desc);

create index idx_research_submissions_primary_system
  on research.submissions (primary_case_system);

create index idx_research_submissions_problem_seriousness
  on research.submissions (problem_seriousness);

create index idx_research_submissions_demo_interest
  on research.submissions (demo_interest);

create index idx_research_reviews_status
  on research.reviews (review_status, reviewed_at desc);

create trigger set_research_surveys_updated_at
before update on research.surveys
for each row
execute function public.set_updated_at();

create trigger set_research_submissions_updated_at
before update on research.submissions
for each row
execute function public.set_updated_at();

create trigger set_research_reviews_updated_at
before update on research.reviews
for each row
execute function public.set_updated_at();

alter table research.surveys enable row level security;
alter table research.admin_users enable row level security;
alter table research.submissions enable row level security;
alter table research.submission_meta enable row level security;
alter table research.reviews enable row level security;
alter table research.referrals enable row level security;

create policy "research_surveys_select_active_public"
on research.surveys
for select
using (status = 'active');

create policy "research_surveys_admin_all"
on research.surveys
for all
using (research.is_admin())
with check (research.is_admin());

create policy "research_admin_users_admin_select"
on research.admin_users
for select
using (research.is_admin());

create policy "research_admin_users_admin_insert"
on research.admin_users
for insert
with check (research.is_admin());

create policy "research_admin_users_admin_delete"
on research.admin_users
for delete
using (research.is_admin());

create policy "research_submissions_public_insert"
on research.submissions
for insert
with check (
  exists (
    select 1
    from research.surveys s
    where s.id = survey_id
      and s.status = 'active'
  )
);

create policy "research_submissions_admin_select"
on research.submissions
for select
using (research.is_admin());

create policy "research_submissions_admin_update"
on research.submissions
for update
using (research.is_admin())
with check (research.is_admin());

create policy "research_submission_meta_public_insert"
on research.submission_meta
for insert
with check (
  exists (
    select 1
    from research.submissions rs
    join research.surveys s on s.id = rs.survey_id
    where rs.id = submission_id
      and s.status = 'active'
  )
);

create policy "research_submission_meta_admin_select"
on research.submission_meta
for select
using (research.is_admin());

create policy "research_reviews_admin_all"
on research.reviews
for all
using (research.is_admin())
with check (research.is_admin());

create policy "research_referrals_public_insert"
on research.referrals
for insert
with check (
  exists (
    select 1
    from research.submissions rs
    join research.surveys s on s.id = rs.survey_id
    where rs.id = submission_id
      and s.status = 'active'
  )
);

create policy "research_referrals_admin_select"
on research.referrals
for select
using (research.is_admin());

create or replace view research.submissions_with_review
with (security_invoker = true) as
select
  rs.*,
  rv.review_status,
  rv.signal_score,
  rv.internal_notes,
  rv.reviewed_by,
  rv.reviewed_at
from research.submissions rs
left join research.reviews rv
  on rv.submission_id = rs.id;

insert into research.surveys (
  slug,
  title,
  description,
  status,
  version,
  estimated_minutes,
  config_json
)
values (
  'casesignal-problem-validation-v1',
  'Immigration Case Prioritization — Operations Research',
  'Research survey for validating workflow, prioritization pain points, and openness to a weekly decision layer in immigration operations.',
  'draft',
  'v2',
  10,
  jsonb_build_object(
    'sections',
    jsonb_build_array(
      'background',
      'current_workflow',
      'friction_and_pain_points',
      'cost_and_value',
      'reaction_to_the_concept',
      'follow_up_and_referrals'
    )
  )
)
on conflict (slug) do nothing;
