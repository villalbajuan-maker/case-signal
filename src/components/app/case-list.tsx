import Link from "next/link";

import type { DashboardCase } from "@/lib/types";
import { formatDecisionState, formatRelativeDate } from "@/lib/utils";

interface CaseListProps {
  title: string;
  description: string;
  cases: DashboardCase[];
}

export function CaseList({ title, description, cases }: CaseListProps) {
  return (
    <section className="panel">
      <div className="panelHeader">
        <div>
          <h2>{title}</h2>
          <p className="muted">{description}</p>
        </div>
        <span className="pill">{cases.length} cases</span>
      </div>

      <div className="caseList">
        {cases.length === 0 ? (
          <div className="emptyState">
            <p>No cases in this queue yet.</p>
          </div>
        ) : null}

        {cases.map((item) => (
          <Link className="caseRow" href={`/cases/${item.case_id}`} key={item.case_id}>
            <div className="caseRowPrimary">
              <div>
                <div className="rowTopline">
                  <strong>{item.firm_case_id}</strong>
                  <span className={`stateBadge stateBadge--${item.decision_state}`}>
                    {formatDecisionState(item.decision_state)}
                  </span>
                </div>
                <h3>{item.client_label ?? item.beneficiary_label ?? "Unlabeled case"}</h3>
                <p className="muted">{item.reason_summary}</p>
              </div>
            </div>

            <div className="caseRowMeta">
              <span>{item.form_type}</span>
              <span>{item.category ?? "Uncategorized"}</span>
              <span>{item.country_chargeability ?? "No country"}</span>
              <span>{formatRelativeDate(item.created_at)}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
