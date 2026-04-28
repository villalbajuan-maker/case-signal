create extension if not exists pgcrypto;

create type public.app_role as enum ('firm_admin', 'firm_member');
create type public.membership_status as enum ('active', 'invited', 'disabled');
create type public.firm_status as enum ('active', 'trialing', 'disabled');
create type public.case_status as enum ('active', 'archived');
create type public.import_status as enum ('pending', 'processing', 'completed', 'failed', 'partial');
create type public.source_type as enum (
  'visa_bulletin',
  'uscis_filing_chart_guidance',
  'uscis_processing_time'
);
create type public.snapshot_status as enum ('pending', 'fetched', 'parsed', 'failed', 'stale');
create type public.decision_run_type as enum ('weekly_scheduled', 'manual_recompute', 'post_import');
create type public.job_status as enum ('pending', 'running', 'completed', 'failed', 'partial');
create type public.decision_state as enum ('act_now', 'prepare', 'wait', 'follow_up', 'needs_data');
create type public.priority_bucket as enum ('p1', 'p2', 'p3', 'p4', 'p5');
create type public.report_status as enum ('draft', 'published', 'failed');
create type public.notification_channel as enum ('email');
create type public.notification_status as enum ('pending', 'sent', 'failed');

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email;

  return new;
end;
$$;

create table public.firms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'America/New_York',
  status public.firm_status not null default 'trialing',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.firm_memberships (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null default 'firm_member',
  status public.membership_status not null default 'invited',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (firm_id, user_id)
);

create table public.cases (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  firm_case_id text not null,
  client_label text,
  beneficiary_label text,
  form_type text not null,
  case_type text,
  category text,
  subcategory text,
  country_chargeability text,
  priority_date date,
  filing_date date,
  receipt_date date,
  processing_office text,
  service_center text,
  case_stage text,
  status public.case_status not null default 'active',
  needs_review boolean not null default false,
  source_import_id uuid,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  archived_at timestamptz,
  unique (firm_id, firm_case_id)
);

create table public.case_metadata (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases (id) on delete cascade,
  key text not null,
  value_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (case_id, key)
);

create table public.case_imports (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  uploaded_by uuid references public.profiles (id) on delete set null,
  file_name text not null,
  storage_path text,
  status public.import_status not null default 'pending',
  total_rows integer not null default 0,
  valid_rows integer not null default 0,
  invalid_rows integer not null default 0,
  created_cases integer not null default 0,
  updated_cases integer not null default 0,
  error_summary_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table public.case_import_rows (
  id uuid primary key default gen_random_uuid(),
  case_import_id uuid not null references public.case_imports (id) on delete cascade,
  row_number integer not null,
  raw_payload_json jsonb not null default '{}'::jsonb,
  normalized_payload_json jsonb not null default '{}'::jsonb,
  status public.import_status not null default 'pending',
  error_messages_json jsonb not null default '[]'::jsonb,
  case_id uuid references public.cases (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (case_import_id, row_number)
);

create table public.source_snapshots (
  id uuid primary key default gen_random_uuid(),
  source_type public.source_type not null,
  source_key text not null unique,
  source_url text not null,
  effective_date date,
  published_date date,
  fetched_at timestamptz,
  checksum text,
  raw_content_path text,
  parsed_payload_json jsonb not null default '{}'::jsonb,
  status public.snapshot_status not null default 'pending',
  notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.rule_sets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  version text not null,
  status text not null default 'active',
  definition_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (name, version)
);

create table public.decision_runs (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  run_type public.decision_run_type not null,
  status public.job_status not null default 'pending',
  triggered_by uuid references public.profiles (id) on delete set null,
  rule_set_id uuid references public.rule_sets (id) on delete set null,
  started_at timestamptz,
  completed_at timestamptz,
  case_count integer not null default 0,
  changed_case_count integer not null default 0,
  error_count integer not null default 0,
  summary_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.decision_run_sources (
  id uuid primary key default gen_random_uuid(),
  decision_run_id uuid not null references public.decision_runs (id) on delete cascade,
  source_snapshot_id uuid not null references public.source_snapshots (id) on delete restrict,
  unique (decision_run_id, source_snapshot_id)
);

create table public.case_decisions (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  case_id uuid not null references public.cases (id) on delete cascade,
  decision_run_id uuid not null references public.decision_runs (id) on delete cascade,
  decision_state public.decision_state not null,
  recommended_action text not null,
  reason_summary text not null,
  reason_detail text,
  priority_score integer not null default 0,
  priority_bucket public.priority_bucket not null default 'p5',
  explanation_json jsonb not null default '{}'::jsonb,
  changed_from_prior boolean not null default false,
  visible_in_report boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  decision_run_id uuid not null references public.decision_runs (id) on delete cascade,
  report_date date not null,
  report_period_start date not null,
  report_period_end date not null,
  status public.report_status not null default 'draft',
  summary_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (firm_id, report_date)
);

create table public.weekly_report_items (
  id uuid primary key default gen_random_uuid(),
  weekly_report_id uuid not null references public.weekly_reports (id) on delete cascade,
  case_id uuid not null references public.cases (id) on delete cascade,
  case_decision_id uuid not null references public.case_decisions (id) on delete cascade,
  section_key text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  case_id uuid references public.cases (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  payload_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  firm_id uuid not null references public.firms (id) on delete cascade,
  user_id uuid references public.profiles (id) on delete set null,
  weekly_report_id uuid references public.weekly_reports (id) on delete cascade,
  channel public.notification_channel not null default 'email',
  template_key text not null,
  status public.notification_status not null default 'pending',
  provider_message_id text,
  sent_at timestamptz,
  error_message text,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.cases
  add constraint cases_source_import_id_fkey
  foreign key (source_import_id)
  references public.case_imports (id)
  on delete set null;

create index idx_firm_memberships_user_active
  on public.firm_memberships (user_id, status);

create index idx_cases_firm_status
  on public.cases (firm_id, status, updated_at desc);

create index idx_cases_firm_form_type
  on public.cases (firm_id, form_type);

create index idx_case_imports_firm_created_at
  on public.case_imports (firm_id, created_at desc);

create index idx_source_snapshots_type_effective_date
  on public.source_snapshots (source_type, effective_date desc);

create index idx_decision_runs_firm_created_at
  on public.decision_runs (firm_id, created_at desc);

create index idx_case_decisions_firm_case_created_at
  on public.case_decisions (firm_id, case_id, created_at desc);

create index idx_case_decisions_dashboard
  on public.case_decisions (firm_id, decision_state, priority_bucket, priority_score desc);

create index idx_weekly_reports_firm_report_date
  on public.weekly_reports (firm_id, report_date desc);

create index idx_activity_events_firm_created_at
  on public.activity_events (firm_id, created_at desc);

create trigger set_firms_updated_at
before update on public.firms
for each row
execute function public.set_updated_at();

create trigger set_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger set_firm_memberships_updated_at
before update on public.firm_memberships
for each row
execute function public.set_updated_at();

create trigger set_cases_updated_at
before update on public.cases
for each row
execute function public.set_updated_at();

create trigger set_case_metadata_updated_at
before update on public.case_metadata
for each row
execute function public.set_updated_at();

create trigger set_source_snapshots_updated_at
before update on public.source_snapshots
for each row
execute function public.set_updated_at();

create trigger set_rule_sets_updated_at
before update on public.rule_sets
for each row
execute function public.set_updated_at();

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.is_firm_member(target_firm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.firm_memberships fm
    where fm.firm_id = target_firm_id
      and fm.user_id = auth.uid()
      and fm.status = 'active'
  );
$$;

create or replace function public.is_firm_admin(target_firm_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.firm_memberships fm
    where fm.firm_id = target_firm_id
      and fm.user_id = auth.uid()
      and fm.status = 'active'
      and fm.role = 'firm_admin'
  );
$$;

create or replace view public.current_case_decisions
with (security_invoker = true) as
select *
from (
  select
    cd.*,
    row_number() over (
      partition by cd.case_id
      order by cd.created_at desc, cd.id desc
    ) as rn
  from public.case_decisions cd
) ranked
where rn = 1;

alter table public.firms enable row level security;
alter table public.profiles enable row level security;
alter table public.firm_memberships enable row level security;
alter table public.cases enable row level security;
alter table public.case_metadata enable row level security;
alter table public.case_imports enable row level security;
alter table public.case_import_rows enable row level security;
alter table public.source_snapshots enable row level security;
alter table public.rule_sets enable row level security;
alter table public.decision_runs enable row level security;
alter table public.decision_run_sources enable row level security;
alter table public.case_decisions enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.weekly_report_items enable row level security;
alter table public.activity_events enable row level security;
alter table public.notification_deliveries enable row level security;

create policy "profiles_select_self"
on public.profiles
for select
using (id = auth.uid());

create policy "profiles_update_self"
on public.profiles
for update
using (id = auth.uid())
with check (id = auth.uid());

create policy "firms_select_member"
on public.firms
for select
using (public.is_firm_member(id));

create policy "firms_update_admin"
on public.firms
for update
using (public.is_firm_admin(id))
with check (public.is_firm_admin(id));

create policy "firm_memberships_select_member"
on public.firm_memberships
for select
using (public.is_firm_member(firm_id));

create policy "firm_memberships_admin_insert"
on public.firm_memberships
for insert
with check (public.is_firm_admin(firm_id));

create policy "firm_memberships_admin_update"
on public.firm_memberships
for update
using (public.is_firm_admin(firm_id))
with check (public.is_firm_admin(firm_id));

create policy "cases_select_member"
on public.cases
for select
using (public.is_firm_member(firm_id));

create policy "cases_insert_member"
on public.cases
for insert
with check (public.is_firm_member(firm_id));

create policy "cases_update_member"
on public.cases
for update
using (public.is_firm_member(firm_id))
with check (public.is_firm_member(firm_id));

create policy "case_metadata_select_member"
on public.case_metadata
for select
using (
  exists (
    select 1
    from public.cases c
    where c.id = case_metadata.case_id
      and public.is_firm_member(c.firm_id)
  )
);

create policy "case_metadata_insert_member"
on public.case_metadata
for insert
with check (
  exists (
    select 1
    from public.cases c
    where c.id = case_metadata.case_id
      and public.is_firm_member(c.firm_id)
  )
);

create policy "case_metadata_update_member"
on public.case_metadata
for update
using (
  exists (
    select 1
    from public.cases c
    where c.id = case_metadata.case_id
      and public.is_firm_member(c.firm_id)
  )
)
with check (
  exists (
    select 1
    from public.cases c
    where c.id = case_metadata.case_id
      and public.is_firm_member(c.firm_id)
  )
);

create policy "case_imports_select_member"
on public.case_imports
for select
using (public.is_firm_member(firm_id));

create policy "case_imports_insert_admin"
on public.case_imports
for insert
with check (public.is_firm_admin(firm_id));

create policy "case_imports_update_admin"
on public.case_imports
for update
using (public.is_firm_admin(firm_id))
with check (public.is_firm_admin(firm_id));

create policy "case_import_rows_select_member"
on public.case_import_rows
for select
using (
  exists (
    select 1
    from public.case_imports ci
    where ci.id = case_import_rows.case_import_id
      and public.is_firm_member(ci.firm_id)
  )
);

create policy "case_import_rows_insert_admin"
on public.case_import_rows
for insert
with check (
  exists (
    select 1
    from public.case_imports ci
    where ci.id = case_import_rows.case_import_id
      and public.is_firm_admin(ci.firm_id)
  )
);

create policy "case_import_rows_update_admin"
on public.case_import_rows
for update
using (
  exists (
    select 1
    from public.case_imports ci
    where ci.id = case_import_rows.case_import_id
      and public.is_firm_admin(ci.firm_id)
  )
)
with check (
  exists (
    select 1
    from public.case_imports ci
    where ci.id = case_import_rows.case_import_id
      and public.is_firm_admin(ci.firm_id)
  )
);

create policy "source_snapshots_select_authenticated"
on public.source_snapshots
for select
to authenticated
using (true);

create policy "rule_sets_select_authenticated"
on public.rule_sets
for select
to authenticated
using (true);

create policy "decision_runs_select_member"
on public.decision_runs
for select
using (public.is_firm_member(firm_id));

create policy "decision_run_sources_select_member"
on public.decision_run_sources
for select
using (
  exists (
    select 1
    from public.decision_runs dr
    where dr.id = decision_run_sources.decision_run_id
      and public.is_firm_member(dr.firm_id)
  )
);

create policy "case_decisions_select_member"
on public.case_decisions
for select
using (public.is_firm_member(firm_id));

create policy "weekly_reports_select_member"
on public.weekly_reports
for select
using (public.is_firm_member(firm_id));

create policy "weekly_report_items_select_member"
on public.weekly_report_items
for select
using (
  exists (
    select 1
    from public.weekly_reports wr
    where wr.id = weekly_report_items.weekly_report_id
      and public.is_firm_member(wr.firm_id)
  )
);

create policy "activity_events_select_member"
on public.activity_events
for select
using (public.is_firm_member(firm_id));

create policy "notification_deliveries_select_member"
on public.notification_deliveries
for select
using (public.is_firm_member(firm_id));
