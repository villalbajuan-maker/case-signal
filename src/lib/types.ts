export type DecisionState = "act_now" | "prepare" | "wait" | "follow_up" | "needs_data";

export interface DashboardCase {
  case_id: string;
  firm_case_id: string;
  client_label: string | null;
  beneficiary_label: string | null;
  form_type: string;
  category: string | null;
  country_chargeability: string | null;
  case_stage: string | null;
  decision_state: DecisionState;
  recommended_action: string;
  reason_summary: string;
  priority_bucket: string;
  priority_score: number;
  changed_from_prior: boolean;
  created_at: string;
}

export interface ReportSummary {
  id: string;
  report_date: string;
  status: string;
  summary_json: {
    needs_attention_count?: number;
    prepare_count?: number;
    follow_up_count?: number;
    waiting_count?: number;
    changed_cases_count?: number;
  };
}

export interface CaseDetail extends DashboardCase {
  reason_detail: string | null;
  explanation_json: Record<string, unknown>;
}
