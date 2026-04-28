import { cache } from "react";
import { notFound } from "next/navigation";

import { createAdminClient, createClient } from "@/lib/supabase/server";
import type { CaseDetail, DashboardCase, ReportSummary } from "@/lib/types";

function unwrapRelation<T>(value: T | T[] | null): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value;
}

interface ViewerIdentity {
  id: string;
  email?: string;
}

const DEV_BYPASS_EMAIL = process.env.DEV_BYPASS_EMAIL;

async function getDevBypassUser(): Promise<ViewerIdentity | null> {
  if (process.env.NODE_ENV !== "development" || !DEV_BYPASS_EMAIL) {
    return null;
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("email", DEV_BYPASS_EMAIL)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    email: data.email
  };
}

async function getQueryClient() {
  const devUser = await getDevBypassUser();
  if (devUser) {
    return createAdminClient();
  }

  return createClient();
}

async function getFirmId() {
  const user = await getCurrentUser();

  if (!user) return null;

  const supabase = await getQueryClient();

  const { data, error } = await supabase
    .from("firm_memberships")
    .select("firm_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.firm_id ?? null;
}

export const getCurrentUser = cache(async () => {
  const devUser = await getDevBypassUser();
  if (devUser) return devUser;

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email
  } satisfies ViewerIdentity;
});

export const getDashboardCases = cache(async () => {
  const supabase = await getQueryClient();
  const firmId = await getFirmId();

  if (!firmId) return [];

  const { data, error } = await supabase
    .from("current_case_decisions")
    .select(
      `
      case_id,
      decision_state,
      recommended_action,
      reason_summary,
      priority_bucket,
      priority_score,
      changed_from_prior,
      created_at,
      cases!inner (
        firm_case_id,
        client_label,
        beneficiary_label,
        form_type,
        category,
        country_chargeability,
        case_stage,
        firm_id
      )
    `
    )
    .eq("firm_id", firmId)
    .order("priority_score", { ascending: false });

  if (error) throw error;

  return (data ?? [])
    .map((row) => {
      const caseRow = unwrapRelation(row.cases);
      if (!caseRow) return null;

      return {
        case_id: row.case_id,
        firm_case_id: caseRow.firm_case_id,
        client_label: caseRow.client_label,
        beneficiary_label: caseRow.beneficiary_label,
        form_type: caseRow.form_type,
        category: caseRow.category,
        country_chargeability: caseRow.country_chargeability,
        case_stage: caseRow.case_stage,
        decision_state: row.decision_state,
        recommended_action: row.recommended_action,
        reason_summary: row.reason_summary,
        priority_bucket: row.priority_bucket,
        priority_score: row.priority_score,
        changed_from_prior: row.changed_from_prior,
        created_at: row.created_at
      } satisfies DashboardCase;
    })
    .filter((row): row is DashboardCase => row !== null);
});

export const getCaseById = cache(async (caseId: string) => {
  const supabase = await getQueryClient();
  const firmId = await getFirmId();

  if (!firmId) return null;

  const { data, error } = await supabase
    .from("current_case_decisions")
    .select(
      `
      case_id,
      decision_state,
      recommended_action,
      reason_summary,
      reason_detail,
      priority_bucket,
      priority_score,
      changed_from_prior,
      created_at,
      explanation_json,
      cases!inner (
        id,
        firm_case_id,
        client_label,
        beneficiary_label,
        form_type,
        category,
        country_chargeability,
        case_stage,
        firm_id
      )
    `
    )
    .eq("firm_id", firmId)
    .eq("case_id", caseId)
    .maybeSingle();

  if (error) throw error;
  if (!data) notFound();

  const caseRow = unwrapRelation(data.cases);
  if (!caseRow) notFound();

  return {
    case_id: data.case_id,
    firm_case_id: caseRow.firm_case_id,
    client_label: caseRow.client_label,
    beneficiary_label: caseRow.beneficiary_label,
    form_type: caseRow.form_type,
    category: caseRow.category,
    country_chargeability: caseRow.country_chargeability,
    case_stage: caseRow.case_stage,
    decision_state: data.decision_state,
    recommended_action: data.recommended_action,
    reason_summary: data.reason_summary,
    reason_detail: data.reason_detail,
    priority_bucket: data.priority_bucket,
    priority_score: data.priority_score,
    changed_from_prior: data.changed_from_prior,
    created_at: data.created_at,
    explanation_json: (data.explanation_json ?? {}) as Record<string, unknown>
  } satisfies CaseDetail;
});

export const getReports = cache(async () => {
  const supabase = await getQueryClient();
  const firmId = await getFirmId();

  if (!firmId) return [];

  const { data, error } = await supabase
    .from("weekly_reports")
    .select("id, report_date, status, summary_json")
    .eq("firm_id", firmId)
    .order("report_date", { ascending: false });

  if (error) throw error;

  return (data ?? []) as ReportSummary[];
});
