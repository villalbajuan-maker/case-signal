-- CaseSignal demo seed
--
-- Usage notes:
-- 1. Replace the email in the membership block with a real auth user email
--    that already exists in auth.users / public.profiles in your project.
-- 2. Run this file after the initial schema migration.
-- 3. The script is idempotent for the core demo records below.

begin;

-- ---------------------------------------------------------------------------
-- Demo firm
-- ---------------------------------------------------------------------------

insert into public.firms (
  id,
  name,
  slug,
  timezone,
  status
) values (
  '11111111-1111-1111-1111-111111111111',
  'LexControl Immigration Demo',
  'lexcontrol-demo',
  'America/New_York',
  'active'
)
on conflict (id) do update
set
  name = excluded.name,
  slug = excluded.slug,
  timezone = excluded.timezone,
  status = excluded.status;

-- ---------------------------------------------------------------------------
-- Optional membership bootstrap
-- Replace the email below with a real user in your project before running.
-- If no matching profile exists, this block inserts nothing.
-- ---------------------------------------------------------------------------

with target_user as (
  select id
  from public.profiles
  where email = 'lex@lexcontrol.co'
  limit 1
)
insert into public.firm_memberships (
  firm_id,
  user_id,
  role,
  status
)
select
  '11111111-1111-1111-1111-111111111111',
  target_user.id,
  'firm_admin',
  'active'
from target_user
on conflict (firm_id, user_id) do update
set
  role = excluded.role,
  status = excluded.status;

-- ---------------------------------------------------------------------------
-- Global rule set
-- ---------------------------------------------------------------------------

insert into public.rule_sets (
  id,
  name,
  version,
  status,
  definition_json
) values (
  '22222222-2222-2222-2222-222222222222',
  'core_decision_rules',
  'v1',
  'active',
  jsonb_build_object(
    'priority_date_logic', jsonb_build_object(
      'supported_categories', jsonb_build_array('F2A', 'EB2', 'EB3')
    ),
    'time_based_logic', jsonb_build_object(
      'supported_forms', jsonb_build_array('I-765')
    )
  )
)
on conflict (name, version) do update
set
  status = excluded.status,
  definition_json = excluded.definition_json;

-- ---------------------------------------------------------------------------
-- Public source snapshots
-- ---------------------------------------------------------------------------

insert into public.source_snapshots (
  id,
  source_type,
  source_key,
  source_url,
  effective_date,
  published_date,
  fetched_at,
  checksum,
  parsed_payload_json,
  status,
  notes
) values
(
  '33333333-3333-3333-3333-333333333331',
  'visa_bulletin',
  'visa_bulletin_2026_05',
  'https://travel.state.gov/content/travel/en/legal/visa-law0/visa-bulletin/2026/visa-bulletin-for-may-2026.html',
  '2026-05-01',
  '2026-04-27',
  timezone('utc', now()),
  'demo-vb-2026-05',
  jsonb_build_object(
    'month', '2026-05',
    'family_final_action', jsonb_build_object(
      'F2A', jsonb_build_object(
        'all_chargeability', '01AUG24',
        'mexico', '01AUG23'
      )
    ),
    'employment_final_action', jsonb_build_object(
      'EB2', jsonb_build_object(
        'all_chargeability', 'C',
        'china', '01SEP21',
        'india', '15JUL14'
      ),
      'EB3', jsonb_build_object(
        'all_chargeability', '01JUN24',
        'china', '15JUN21',
        'india', '15NOV13'
      )
    )
  ),
  'parsed',
  'Demo snapshot based on audited May 2026 bulletin'
),
(
  '33333333-3333-3333-3333-333333333332',
  'uscis_filing_chart_guidance',
  'uscis_filing_chart_2026_05',
  'https://www.uscis.gov/green-card/green-card-processes-and-procedures/visa-availability-priority-dates/adjustment-of-status-filing-charts-from-the-visa-bulletin',
  '2026-05-01',
  '2026-04-27',
  timezone('utc', now()),
  'demo-uscis-chart-2026-05',
  jsonb_build_object(
    'month', '2026-05',
    'family_chart', 'DATES_FOR_FILING',
    'employment_chart', 'FINAL_ACTION_DATES'
  ),
  'parsed',
  'Demo snapshot based on audited USCIS filing-chart guidance'
),
(
  '33333333-3333-3333-3333-333333333333',
  'uscis_processing_time',
  'uscis_processing_time_i765_c09_nbc_2026_04',
  'https://egov.uscis.gov/processing-times/',
  '2026-04-27',
  '2026-04-27',
  timezone('utc', now()),
  'demo-pt-i765-2026-04',
  jsonb_build_object(
    'form_type', 'I-765',
    'category', 'Based on pending adjustment of status application',
    'office', 'National Benefits Center',
    'metric_type', '80_percent_completed_within',
    'value', '4 Months'
  ),
  'parsed',
  'Demo processing-time snapshot for time-based follow-up behavior'
)
on conflict (source_key) do update
set
  source_url = excluded.source_url,
  effective_date = excluded.effective_date,
  published_date = excluded.published_date,
  fetched_at = excluded.fetched_at,
  checksum = excluded.checksum,
  parsed_payload_json = excluded.parsed_payload_json,
  status = excluded.status,
  notes = excluded.notes;

-- ---------------------------------------------------------------------------
-- Demo case import
-- ---------------------------------------------------------------------------

insert into public.case_imports (
  id,
  firm_id,
  file_name,
  storage_path,
  status,
  total_rows,
  valid_rows,
  invalid_rows,
  created_cases,
  updated_cases,
  error_summary_json,
  created_at,
  completed_at
) values (
  '44444444-4444-4444-4444-444444444444',
  '11111111-1111-1111-1111-111111111111',
  'demo-cases.csv',
  'seed/demo-cases.csv',
  'completed',
  4,
  4,
  0,
  4,
  0,
  '[]'::jsonb,
  timezone('utc', now()),
  timezone('utc', now())
)
on conflict (id) do update
set
  status = excluded.status,
  total_rows = excluded.total_rows,
  valid_rows = excluded.valid_rows,
  invalid_rows = excluded.invalid_rows,
  created_cases = excluded.created_cases,
  updated_cases = excluded.updated_cases,
  error_summary_json = excluded.error_summary_json,
  completed_at = excluded.completed_at;

-- ---------------------------------------------------------------------------
-- Demo cases
-- ---------------------------------------------------------------------------

insert into public.cases (
  id,
  firm_id,
  firm_case_id,
  client_label,
  beneficiary_label,
  form_type,
  case_type,
  category,
  subcategory,
  country_chargeability,
  priority_date,
  filing_date,
  receipt_date,
  processing_office,
  service_center,
  case_stage,
  status,
  needs_review,
  source_import_id
) values
(
  '55555555-5555-5555-5555-555555555551',
  '11111111-1111-1111-1111-111111111111',
  'CS-1001',
  'Acosta Family',
  'Maria Acosta',
  'I-130',
  'family_preference',
  'F2A',
  null,
  'COLOMBIA',
  '2024-06-15',
  '2024-07-01',
  '2024-07-01',
  'Service Center Operations',
  'SCOPS',
  'petition_pending',
  'active',
  false,
  '44444444-4444-4444-4444-444444444444'
),
(
  '55555555-5555-5555-5555-555555555552',
  '11111111-1111-1111-1111-111111111111',
  'CS-1002',
  'Rao Employment',
  'Arjun Rao',
  'I-140',
  'employment_preference',
  'EB2',
  null,
  'INDIA',
  '2014-06-20',
  '2024-08-15',
  '2024-08-15',
  'Texas Service Center',
  'TSC',
  'ready_for_aos_review',
  'active',
  false,
  '44444444-4444-4444-4444-444444444444'
),
(
  '55555555-5555-5555-5555-555555555553',
  '11111111-1111-1111-1111-111111111111',
  'CS-1003',
  'Lin Employment',
  'Wei Lin',
  'I-140',
  'employment_preference',
  'EB3',
  null,
  'CHINA',
  '2021-08-01',
  '2024-09-10',
  '2024-09-10',
  'Nebraska Service Center',
  'NSC',
  'priority_date_tracking',
  'active',
  false,
  '44444444-4444-4444-4444-444444444444'
),
(
  '55555555-5555-5555-5555-555555555554',
  '11111111-1111-1111-1111-111111111111',
  'CS-1004',
  'Gomez Work Permit',
  'Sofia Gomez',
  'I-765',
  'time_based',
  'C09',
  'Based on pending adjustment of status application',
  'MEXICO',
  null,
  '2025-11-15',
  '2025-11-15',
  'National Benefits Center',
  'NBC',
  'ead_pending',
  'active',
  false,
  '44444444-4444-4444-4444-444444444444'
)
on conflict (firm_id, firm_case_id) do update
set
  client_label = excluded.client_label,
  beneficiary_label = excluded.beneficiary_label,
  form_type = excluded.form_type,
  case_type = excluded.case_type,
  category = excluded.category,
  subcategory = excluded.subcategory,
  country_chargeability = excluded.country_chargeability,
  priority_date = excluded.priority_date,
  filing_date = excluded.filing_date,
  receipt_date = excluded.receipt_date,
  processing_office = excluded.processing_office,
  service_center = excluded.service_center,
  case_stage = excluded.case_stage,
  status = excluded.status,
  needs_review = excluded.needs_review,
  source_import_id = excluded.source_import_id;

insert into public.case_import_rows (
  case_import_id,
  row_number,
  raw_payload_json,
  normalized_payload_json,
  status,
  error_messages_json,
  case_id
) values
(
  '44444444-4444-4444-4444-444444444444',
  1,
  jsonb_build_object('firm_case_id', 'CS-1001', 'form_type', 'I-130', 'category', 'F2A'),
  jsonb_build_object('firm_case_id', 'CS-1001', 'form_type', 'I-130', 'category', 'F2A'),
  'completed',
  '[]'::jsonb,
  '55555555-5555-5555-5555-555555555551'
),
(
  '44444444-4444-4444-4444-444444444444',
  2,
  jsonb_build_object('firm_case_id', 'CS-1002', 'form_type', 'I-140', 'category', 'EB2'),
  jsonb_build_object('firm_case_id', 'CS-1002', 'form_type', 'I-140', 'category', 'EB2'),
  'completed',
  '[]'::jsonb,
  '55555555-5555-5555-5555-555555555552'
),
(
  '44444444-4444-4444-4444-444444444444',
  3,
  jsonb_build_object('firm_case_id', 'CS-1003', 'form_type', 'I-140', 'category', 'EB3'),
  jsonb_build_object('firm_case_id', 'CS-1003', 'form_type', 'I-140', 'category', 'EB3'),
  'completed',
  '[]'::jsonb,
  '55555555-5555-5555-5555-555555555553'
),
(
  '44444444-4444-4444-4444-444444444444',
  4,
  jsonb_build_object('firm_case_id', 'CS-1004', 'form_type', 'I-765', 'category', 'C09'),
  jsonb_build_object('firm_case_id', 'CS-1004', 'form_type', 'I-765', 'category', 'C09'),
  'completed',
  '[]'::jsonb,
  '55555555-5555-5555-5555-555555555554'
)
on conflict (case_import_id, row_number) do update
set
  raw_payload_json = excluded.raw_payload_json,
  normalized_payload_json = excluded.normalized_payload_json,
  status = excluded.status,
  error_messages_json = excluded.error_messages_json,
  case_id = excluded.case_id;

-- ---------------------------------------------------------------------------
-- Decision run
-- ---------------------------------------------------------------------------

insert into public.decision_runs (
  id,
  firm_id,
  run_type,
  status,
  rule_set_id,
  started_at,
  completed_at,
  case_count,
  changed_case_count,
  error_count,
  summary_json
) values (
  '66666666-6666-6666-6666-666666666666',
  '11111111-1111-1111-1111-111111111111',
  'weekly_scheduled',
  'completed',
  '22222222-2222-2222-2222-222222222222',
  timezone('utc', now()),
  timezone('utc', now()),
  4,
  4,
  0,
  jsonb_build_object(
    'act_now', 1,
    'prepare', 1,
    'wait', 1,
    'follow_up', 1
  )
)
on conflict (id) do update
set
  status = excluded.status,
  case_count = excluded.case_count,
  changed_case_count = excluded.changed_case_count,
  error_count = excluded.error_count,
  summary_json = excluded.summary_json,
  completed_at = excluded.completed_at;

insert into public.decision_run_sources (
  decision_run_id,
  source_snapshot_id
) values
('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333331'),
('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333332'),
('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333')
on conflict (decision_run_id, source_snapshot_id) do nothing;

-- ---------------------------------------------------------------------------
-- Case decisions
-- ---------------------------------------------------------------------------

insert into public.case_decisions (
  id,
  firm_id,
  case_id,
  decision_run_id,
  decision_state,
  recommended_action,
  reason_summary,
  reason_detail,
  priority_score,
  priority_bucket,
  explanation_json,
  changed_from_prior,
  visible_in_report
) values
(
  '77777777-7777-7777-7777-777777777771',
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555551',
  '66666666-6666-6666-6666-666666666666',
  'act_now',
  'Prepare filing review immediately',
  'Priority date is current under this month''s applicable family chart.',
  'F2A case is current for the applicable chart selection and should move into immediate filing review.',
  95,
  'p1',
  jsonb_build_object(
    'source_month', '2026-05',
    'source_type', 'visa_bulletin',
    'category', 'F2A',
    'country', 'COLOMBIA',
    'priority_date', '2024-06-15',
    'threshold_date', 'CURRENT'
  ),
  true,
  true
),
(
  '77777777-7777-7777-7777-777777777772',
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555552',
  '66666666-6666-6666-6666-666666666666',
  'prepare',
  'Prepare AOS package and attorney review',
  'Priority date is close enough to warrant preparation.',
  'EB2 India case is near actionable review and should be prepared to move quickly when internal readiness is confirmed.',
  78,
  'p3',
  jsonb_build_object(
    'source_month', '2026-05',
    'source_type', 'uscis_filing_chart_guidance',
    'category', 'EB2',
    'country', 'INDIA',
    'priority_date', '2014-06-20',
    'threshold_date', '2014-07-15'
  ),
  true,
  true
),
(
  '77777777-7777-7777-7777-777777777773',
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555553',
  '66666666-6666-6666-6666-666666666666',
  'wait',
  'No action this week',
  'Priority date is not yet current for the applicable chart.',
  'EB3 China case remains behind the threshold date and should continue waiting.',
  30,
  'p5',
  jsonb_build_object(
    'source_month', '2026-05',
    'source_type', 'visa_bulletin',
    'category', 'EB3',
    'country', 'CHINA',
    'priority_date', '2021-08-01',
    'threshold_date', '2021-06-15'
  ),
  true,
  true
),
(
  '77777777-7777-7777-7777-777777777774',
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555554',
  '66666666-6666-6666-6666-666666666666',
  'follow_up',
  'Review follow-up eligibility with USCIS',
  'Case age is beyond the benchmark used for this workflow.',
  'I-765 pending case appears to be outside the target processing benchmark and should be reviewed for follow-up.',
  88,
  'p2',
  jsonb_build_object(
    'source_date', '2026-04-27',
    'source_type', 'uscis_processing_time',
    'form_type', 'I-765',
    'category', 'C09',
    'office', 'National Benefits Center',
    'benchmark', '4 Months',
    'receipt_date', '2025-11-15'
  ),
  true,
  true
)
on conflict (id) do update
set
  decision_state = excluded.decision_state,
  recommended_action = excluded.recommended_action,
  reason_summary = excluded.reason_summary,
  reason_detail = excluded.reason_detail,
  priority_score = excluded.priority_score,
  priority_bucket = excluded.priority_bucket,
  explanation_json = excluded.explanation_json,
  changed_from_prior = excluded.changed_from_prior,
  visible_in_report = excluded.visible_in_report;

-- ---------------------------------------------------------------------------
-- Weekly report
-- ---------------------------------------------------------------------------

insert into public.weekly_reports (
  id,
  firm_id,
  decision_run_id,
  report_date,
  report_period_start,
  report_period_end,
  status,
  summary_json
) values (
  '88888888-8888-8888-8888-888888888888',
  '11111111-1111-1111-1111-111111111111',
  '66666666-6666-6666-6666-666666666666',
  '2026-04-27',
  '2026-04-21',
  '2026-04-27',
  'published',
  jsonb_build_object(
    'needs_attention_count', 1,
    'prepare_count', 1,
    'follow_up_count', 1,
    'waiting_count', 1,
    'changed_cases_count', 4
  )
)
on conflict (firm_id, report_date) do update
set
  decision_run_id = excluded.decision_run_id,
  report_period_start = excluded.report_period_start,
  report_period_end = excluded.report_period_end,
  status = excluded.status,
  summary_json = excluded.summary_json;

insert into public.weekly_report_items (
  weekly_report_id,
  case_id,
  case_decision_id,
  section_key,
  sort_order
) values
(
  '88888888-8888-8888-8888-888888888888',
  '55555555-5555-5555-5555-555555555551',
  '77777777-7777-7777-7777-777777777771',
  'needs_attention',
  1
),
(
  '88888888-8888-8888-8888-888888888888',
  '55555555-5555-5555-5555-555555555554',
  '77777777-7777-7777-7777-777777777774',
  'follow_up',
  2
),
(
  '88888888-8888-8888-8888-888888888888',
  '55555555-5555-5555-5555-555555555552',
  '77777777-7777-7777-7777-777777777772',
  'prepare',
  3
),
(
  '88888888-8888-8888-8888-888888888888',
  '55555555-5555-5555-5555-555555555553',
  '77777777-7777-7777-7777-777777777773',
  'waiting',
  4
)
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- Activity feed
-- ---------------------------------------------------------------------------

insert into public.activity_events (
  firm_id,
  case_id,
  event_type,
  payload_json
) values
(
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555551',
  'decision_changed',
  jsonb_build_object('from', null, 'to', 'act_now')
),
(
  '11111111-1111-1111-1111-111111111111',
  '55555555-5555-5555-5555-555555555554',
  'decision_changed',
  jsonb_build_object('from', null, 'to', 'follow_up')
)
on conflict do nothing;

commit;
