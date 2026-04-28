# CaseSignal Functional Architecture

Date: 2026-04-27

## 1. System Purpose

CaseSignal is a decision layer over an immigration firm's active case inventory.

Its job is to:

- ingest and persist case inventory
- normalize case data into a decision-ready format
- fetch and store public signal snapshots
- evaluate cases against rules
- generate case decisions and weekly reports
- surface a prioritized action queue in the UI

The system is not responsible for:

- document management
- full legal case management
- CRM workflows
- billing
- client communications

## 2. Top-Level Architecture

Recommended functional layers:

1. Presentation layer
   - web app UI
   - authenticated firm workspaces

2. Application layer
   - inventory management
   - imports
   - report generation
   - decision orchestration

3. Decision layer
   - source normalization
   - rule evaluation
   - prioritization
   - explainability

4. Data layer
   - firm data
   - case inventory
   - source snapshots
   - decision history
   - reports

5. Integration layer
   - public source fetchers
   - email notifications
   - scheduled jobs

## 3. Suggested Stack Direction

- Frontend: Next.js or similar React app
- Backend app logic: Next.js server routes or separate service
- Database/Auth/Storage: Supabase
- Scheduled jobs: Supabase cron, GitHub Actions, or background worker
- Email: Resend, Postmark, or similar
- Parsing/fetching: Python or Node workers

The key architectural decision is not framework choice. It is preserving clean separation between:

- inventory data
- source data
- decision outputs
- user-facing reports

## 4. Domain Model

Core domain entities:

- Firm
- User
- Membership
- Case
- Case import
- Source snapshot
- Rule set
- Decision run
- Case decision
- Weekly report
- Weekly report item
- Activity event

## 5. Database Tables

Below is the recommended MVP schema at a functional level.

### 5.1 firms

Purpose:

- top-level tenant container

Suggested fields:

- `id`
- `name`
- `slug`
- `timezone`
- `status`
- `created_at`
- `updated_at`

### 5.2 users

Purpose:

- identity records tied to auth

Suggested fields:

- `id`
- `email`
- `display_name`
- `created_at`
- `updated_at`

In Supabase, auth identity may live in auth tables, with app-specific profile data mirrored here.

### 5.3 firm_memberships

Purpose:

- map users to firms and roles

Suggested fields:

- `id`
- `firm_id`
- `user_id`
- `role`
- `status`
- `created_at`
- `updated_at`

Roles for MVP:

- `firm_admin`
- `firm_member`

### 5.4 cases

Purpose:

- canonical active inventory records

Suggested fields:

- `id`
- `firm_id`
- `firm_case_id`
- `client_label`
- `beneficiary_label`
- `form_type`
- `case_type`
- `category`
- `subcategory`
- `country_chargeability`
- `priority_date`
- `filing_date`
- `receipt_date`
- `processing_office`
- `service_center`
- `case_stage`
- `is_active`
- `needs_review`
- `source_import_id`
- `created_by`
- `created_at`
- `updated_at`
- `archived_at`

Constraints:

- unique on `firm_id + firm_case_id`

### 5.5 case_metadata

Purpose:

- optional extensible attributes without polluting the main case table

Suggested fields:

- `id`
- `case_id`
- `key`
- `value_json`
- `created_at`
- `updated_at`

This can be skipped if the initial schema stays narrow enough.

### 5.6 case_imports

Purpose:

- track CSV upload jobs and audit import status

Suggested fields:

- `id`
- `firm_id`
- `uploaded_by`
- `file_name`
- `storage_path`
- `status`
- `total_rows`
- `valid_rows`
- `invalid_rows`
- `created_cases`
- `updated_cases`
- `error_summary_json`
- `created_at`
- `completed_at`

### 5.7 case_import_rows

Purpose:

- row-level validation and error traceability

Suggested fields:

- `id`
- `case_import_id`
- `row_number`
- `raw_payload_json`
- `normalized_payload_json`
- `status`
- `error_messages_json`
- `case_id`
- `created_at`

This table is very useful for a good import UX.

### 5.8 source_snapshots

Purpose:

- store each fetched public source version used by decision runs

Suggested fields:

- `id`
- `source_type`
- `source_key`
- `source_url`
- `effective_date`
- `published_date`
- `fetched_at`
- `checksum`
- `raw_content_path`
- `parsed_payload_json`
- `status`
- `notes`

Examples of `source_type`:

- `visa_bulletin`
- `uscis_filing_chart_guidance`
- `uscis_processing_time`

Examples of `source_key`:

- `visa_bulletin_2026_05`
- `uscis_filing_chart_2026_05`
- `uscis_processing_time_i130_scops_lpr_spouse_child`

### 5.9 rule_sets

Purpose:

- version the business logic configuration

Suggested fields:

- `id`
- `name`
- `version`
- `status`
- `definition_json`
- `created_at`

This allows future rule changes without destroying auditability.

### 5.10 decision_runs

Purpose:

- record each evaluation batch

Suggested fields:

- `id`
- `firm_id`
- `run_type`
- `status`
- `triggered_by`
- `rule_set_id`
- `started_at`
- `completed_at`
- `case_count`
- `changed_case_count`
- `error_count`
- `summary_json`

Examples of `run_type`:

- `weekly_scheduled`
- `manual_recompute`
- `post_import`

### 5.11 decision_run_sources

Purpose:

- join decision runs to the source snapshots they used

Suggested fields:

- `id`
- `decision_run_id`
- `source_snapshot_id`

### 5.12 case_decisions

Purpose:

- store the latest and historical decision outcome per case per run

Suggested fields:

- `id`
- `firm_id`
- `case_id`
- `decision_run_id`
- `decision_state`
- `recommended_action`
- `reason_summary`
- `reason_detail`
- `priority_score`
- `priority_bucket`
- `explanation_json`
- `changed_from_prior`
- `visible_in_report`
- `created_at`

Examples of `decision_state`:

- `ACT_NOW`
- `PREPARE`
- `WAIT`
- `FOLLOW_UP`
- `NEEDS_DATA`

### 5.13 current_case_decisions

Purpose:

- optional denormalized table or view for fast dashboard access

Suggested fields:

- `case_id`
- `firm_id`
- `decision_run_id`
- `decision_state`
- `recommended_action`
- `priority_score`
- `changed_from_prior`
- `created_at`

This can be implemented as:

- materialized table updated after each run, or
- SQL view over `case_decisions`

### 5.14 weekly_reports

Purpose:

- top-level weekly report records

Suggested fields:

- `id`
- `firm_id`
- `decision_run_id`
- `report_date`
- `report_period_start`
- `report_period_end`
- `status`
- `summary_json`
- `created_at`

### 5.15 weekly_report_items

Purpose:

- case rows included in a report

Suggested fields:

- `id`
- `weekly_report_id`
- `case_id`
- `case_decision_id`
- `section_key`
- `sort_order`
- `created_at`

Examples of `section_key`:

- `needs_attention`
- `prepare`
- `follow_up`
- `waiting`
- `recently_changed`

### 5.16 activity_events

Purpose:

- audit and history feed

Suggested fields:

- `id`
- `firm_id`
- `case_id`
- `user_id`
- `event_type`
- `payload_json`
- `created_at`

Examples:

- case created
- import completed
- decision changed
- report generated

### 5.17 notification_deliveries

Purpose:

- track email sends and retries

Suggested fields:

- `id`
- `firm_id`
- `user_id`
- `weekly_report_id`
- `channel`
- `template_key`
- `status`
- `provider_message_id`
- `sent_at`
- `error_message`

## 6. Core Services

### 6.1 Auth and Firm Access Service

Responsibilities:

- authenticate users
- resolve firm context
- enforce tenancy and role checks

Key rules:

- users only see data from their firm
- admins can manage firm settings and imports

### 6.2 Inventory Service

Responsibilities:

- create cases
- update cases
- archive/reactivate cases
- validate required fields by case type
- expose case listings and filters

### 6.3 Import Service

Responsibilities:

- accept CSV uploads
- map columns to supported fields
- validate rows
- upsert cases by `firm_case_id`
- persist import audit trail

Outputs:

- import summary
- row-level errors
- created/updated counts

### 6.4 Source Ingestion Service

Responsibilities:

- fetch public source pages
- store raw snapshots
- parse structured data
- persist normalized payloads
- detect if source content changed

Subcomponents:

- Visa Bulletin fetcher/parser
- USCIS filing-chart guidance fetcher/parser
- USCIS processing-times fetcher/parser

### 6.5 Decision Engine Service

Responsibilities:

- load supported active cases
- map each case to relevant rule path
- evaluate public-signal conditions
- compute state/action/reason
- assign priority ordering
- emit explainable outputs

Functional sublayers:

- eligibility classifier
- signal resolver
- rule evaluator
- priority scorer
- explanation builder

### 6.6 Report Service

Responsibilities:

- generate weekly report summary
- group cases into report sections
- persist weekly report and items
- provide report views to UI

### 6.7 Notification Service

Responsibilities:

- send weekly update emails
- link users back to the dashboard or report
- track delivery outcomes

### 6.8 Analytics Service

Responsibilities:

- compute aggregated counts and trends
- support dashboard summary cards
- support simple history charts later

For MVP this can be SQL queries rather than a separate service.

## 7. Jobs and Schedulers

### 7.1 Source Refresh Jobs

Purpose:

- refresh public data snapshots

Recommended jobs:

- `refresh_visa_bulletin`
- `refresh_uscis_filing_chart_guidance`
- `refresh_uscis_processing_times`

Suggested cadence:

- Visa Bulletin: daily check, monthly effective updates
- USCIS filing chart guidance: daily check near month boundaries, otherwise daily or every few hours if needed
- USCIS processing times: weekly or controlled refresh

### 7.2 Weekly Decision Job

Purpose:

- run full decision evaluation for each firm

Input:

- active cases
- latest valid source snapshots
- active rule set

Output:

- decision run
- case decisions
- changed flags

### 7.3 Weekly Report Generation Job

Purpose:

- create report after weekly decision run

Output:

- weekly report
- report items
- report summary

### 7.4 Notification Job

Purpose:

- send report-available emails after report creation

### 7.5 Post-Import Recompute Job

Purpose:

- recompute decisions for newly imported or updated cases

This ensures users do not need to wait until the next weekly run to see a baseline decision.

## 8. UI Modules

### 8.1 Authentication Module

Screens:

- sign in
- invitation acceptance
- password reset if needed

### 8.2 Onboarding Module

Screens:

- create firm
- set timezone
- invite team
- first case import

### 8.3 Dashboard Module

Main function:

- show prioritized action queue

Key widgets:

- counts by state
- needs attention section
- recently changed section
- prepare soon section
- follow-up section
- waiting section
- filters

### 8.4 Inventory Module

Main function:

- browse and manage full case inventory

Key features:

- table view
- search
- filters
- archive toggle
- manual add/edit

### 8.5 Case Detail Module

Main function:

- explain one case deeply

Sections:

- case metadata
- current decision
- reason
- source basis
- history
- report history

### 8.6 Reports Module

Main function:

- browse weekly reports

Views:

- report list
- report detail
- changed cases this week

### 8.7 Settings Module

Main function:

- manage firm profile and notifications

Possible settings:

- timezone
- weekly notification recipients
- import template access

## 9. Main Flows

### 9.1 Firm Onboarding Flow

1. User signs up or is invited.
2. User creates firm workspace.
3. User sets firm timezone.
4. User uploads first CSV or creates first cases manually.
5. Import service validates and persists cases.
6. Post-import recompute job runs.
7. User lands on dashboard with first decision outputs.

### 9.2 CSV Import Flow

1. User opens import page.
2. User uploads CSV.
3. System parses headers and maps columns.
4. System validates rows.
5. Errors are shown before commit if possible.
6. Valid rows are upserted into `cases`.
7. Import audit records are stored.
8. Post-import recompute is triggered.
9. User sees import summary and updated dashboard.

### 9.3 Weekly Processing Flow

1. Scheduler checks source freshness.
2. Source ingestion jobs refresh snapshots if needed.
3. Weekly decision job runs per firm.
4. Rule engine evaluates all active supported cases.
5. New `case_decisions` are persisted.
6. Cases changed from prior run are flagged.
7. Weekly report is generated.
8. Notification emails are queued.
9. Users open the UI and review the updated queue.

### 9.4 Case Review Flow

1. User opens dashboard.
2. User filters to `ACT_NOW` or `FOLLOW_UP`.
3. User opens a case.
4. User reviews reason, source basis, and history.
5. User uses the result to drive work outside CaseSignal.

Important:

CaseSignal recommends and prioritizes. It does not execute the legal workflow itself in MVP.

### 9.5 Source Change to Decision Change Flow

1. Source changes, such as new Visa Bulletin month.
2. New source snapshot is stored.
3. Weekly decision run uses the new snapshot.
4. Cases are re-evaluated.
5. Some cases move from `WAIT` to `PREPARE` or `ACT_NOW`.
6. Report highlights newly changed cases.
7. Users review and act.

## 10. Decision Engine Functional Design

### 10.1 Inputs

- case data
- latest relevant source snapshots
- rule set version

### 10.2 Processing stages

1. Support check
   - is this case type supported?
2. Data completeness check
   - are required fields present?
3. Routing
   - priority-date logic or time-based logic
4. Signal resolution
   - which source rows/values apply?
5. Rule evaluation
   - determine outcome
6. Action generation
   - determine recommendation text
7. Priority scoring
   - rank among other cases
8. Explanation building
   - store human-readable reasoning and structured evidence

### 10.3 Example output model

For one case:

- `decision_state = ACT_NOW`
- `recommended_action = Prepare filing review immediately`
- `reason_summary = Priority date is current under this month's applicable chart`
- `priority_score = 92`
- `explanation_json = { source_month, chart_type, category_match, country_match, threshold_date, case_priority_date }`

## 11. Prioritization Model

The dashboard should not sort only by state. It also needs an internal priority model.

Suggested ordering factors:

- decision state severity
- changed this week
- source-driven urgency
- case age where relevant
- closeness to threshold

Example bucket logic:

- `P1`: act now and newly changed
- `P2`: act now but unchanged
- `P3`: follow-up candidates
- `P4`: prepare soon
- `P5`: wait

## 12. Explainability Model

Each decision should preserve:

- source type
- source effective month/date
- rule path used
- values compared
- resulting action

This is important for:

- trust
- debugging
- auditability
- support

## 13. Multi-Tenancy Model

CaseSignal should be firm-scoped.

Rules:

- all case data is partitioned by `firm_id`
- all reports are partitioned by `firm_id`
- all queries must enforce firm context
- source snapshots may be shared globally if they are public and identical across firms

Recommended split:

- tenant-specific tables: firms, memberships, cases, decisions, reports
- shared global tables: source_snapshots, rule_sets

## 14. Security and Access Control

Minimum requirements:

- row-level security by `firm_id`
- authenticated access only
- admin-only import permissions initially if desired
- audit trail for case creation/imports and decision runs

## 15. Performance Strategy

Likely dashboard access pattern:

- one firm
- current decisions
- filtered action queue

To support this:

- index `cases(firm_id, is_active)`
- index `case_decisions(firm_id, case_id, created_at desc)`
- index `weekly_reports(firm_id, report_date desc)`
- index `current_case_decisions(firm_id, decision_state, priority_score desc)`

Denormalizing current decisions is worth it for dashboard speed.

## 16. Failure Handling

### Source ingestion failure

If a public source fetch fails:

- keep prior valid snapshot
- log error
- flag source freshness warning in admin diagnostics

### Decision run partial failure

If some cases fail validation or evaluation:

- continue processing supported cases
- mark failed cases as `NEEDS_DATA` or `REVIEW_REQUIRED`
- record run errors in `decision_runs.summary_json`

### Import failure

- preserve row-level errors
- do not block valid rows if partial import behavior is allowed

## 17. Recommended MVP Build Order

### Phase 1

- auth
- firms and memberships
- cases
- CSV import
- manual case entry

### Phase 2

- source snapshots
- Visa Bulletin parser
- USCIS filing-chart parser
- basic decision engine for priority-date cases

### Phase 3

- dashboard
- case detail
- weekly report generation

### Phase 4

- notifications
- history and changed-case views
- selective time-based case logic

## 18. Recommended v1 Narrowing

To stay disciplined:

- support only a narrow list of case categories first
- treat unsupported cases explicitly
- keep the dashboard centered on decisions, not general task management
- do not build notes, assignments, or document workflows too early

## 19. Architecture Summary

The functional architecture should revolve around one loop:

1. ingest inventory
2. ingest public signals
3. compute decisions
4. prioritize outputs
5. present action queue
6. repeat weekly

That is the core system.

Everything else should support that loop, not distract from it.
