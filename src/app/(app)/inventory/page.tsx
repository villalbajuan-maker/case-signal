import Link from "next/link";

import { getDashboardCases } from "@/lib/data";
import { formatDecisionState } from "@/lib/utils";

export default async function InventoryPage() {
  const cases = await getDashboardCases();

  return (
    <div className="pageStack">
      <header className="sectionIntro">
        <div className="eyebrow">Inventory</div>
        <h1>Persisted case inventory</h1>
        <p className="muted">
          This is the full working inventory that feeds the decision engine. The
          main workflow still begins in the attention queue.
        </p>
      </header>

      <section className="panel">
        <div className="tableWrap">
          <table className="dataTable">
            <thead>
              <tr>
                <th>Case</th>
                <th>Form</th>
                <th>Category</th>
                <th>Country</th>
                <th>State</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {cases.map((item) => (
                <tr key={item.case_id}>
                  <td>
                    <Link href={`/cases/${item.case_id}`}>{item.firm_case_id}</Link>
                  </td>
                  <td>{item.form_type}</td>
                  <td>{item.category ?? "Uncategorized"}</td>
                  <td>{item.country_chargeability ?? "No country"}</td>
                  <td>{formatDecisionState(item.decision_state)}</td>
                  <td>{item.recommended_action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
