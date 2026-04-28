import { getCaseById } from "@/lib/data";
import { formatDecisionState } from "@/lib/utils";

export default async function CaseDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const caseItem = await getCaseById(id);

  if (!caseItem) return null;

  return (
    <div className="pageStack">
      <header className="heroPanel">
        <div>
          <div className="eyebrow">{caseItem.firm_case_id}</div>
          <h1>{caseItem.client_label ?? caseItem.beneficiary_label ?? "Case detail"}</h1>
          <p className="muted">{caseItem.reason_summary}</p>
        </div>
        <span className={`stateBadge stateBadge--${caseItem.decision_state}`}>
          {formatDecisionState(caseItem.decision_state)}
        </span>
      </header>

      <section className="detailGrid">
        <article className="panel">
          <h2>Recommended Action</h2>
          <p className="detailAction">{caseItem.recommended_action}</p>
          <p className="muted">{caseItem.reason_detail ?? "No additional detail yet."}</p>
        </article>

        <article className="panel">
          <h2>Case Metadata</h2>
          <dl className="detailList">
            <div>
              <dt>Form</dt>
              <dd>{caseItem.form_type}</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{caseItem.category ?? "Uncategorized"}</dd>
            </div>
            <div>
              <dt>Country</dt>
              <dd>{caseItem.country_chargeability ?? "No country"}</dd>
            </div>
            <div>
              <dt>Stage</dt>
              <dd>{caseItem.case_stage ?? "No stage"}</dd>
            </div>
            <div>
              <dt>Priority bucket</dt>
              <dd>{caseItem.priority_bucket.toUpperCase()}</dd>
            </div>
            <div>
              <dt>Priority score</dt>
              <dd>{caseItem.priority_score}</dd>
            </div>
          </dl>
        </article>
      </section>

      <section className="panel">
        <h2>Decision Evidence</h2>
        <pre className="jsonBlock">
          {JSON.stringify(caseItem.explanation_json, null, 2)}
        </pre>
      </section>
    </div>
  );
}
