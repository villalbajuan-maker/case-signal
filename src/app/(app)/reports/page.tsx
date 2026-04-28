import { getReports } from "@/lib/data";
import { formatRelativeDate } from "@/lib/utils";

export default async function ReportsPage() {
  const reports = await getReports();

  return (
    <div className="pageStack">
      <header className="sectionIntro">
        <div className="eyebrow">Weekly Reports</div>
        <h1>Published report snapshots</h1>
        <p className="muted">
          Weekly processing turns fresh public signals into a stable review moment
          for the team. These reports preserve what changed and why.
        </p>
      </header>

      <section className="panel">
        <div className="reportStack">
          {reports.map((report) => (
            <article className="reportCard" key={report.id}>
              <div>
                <h2>{formatRelativeDate(report.report_date)}</h2>
                <p className="muted">Status: {report.status}</p>
              </div>
              <div className="reportMetrics">
                <span>Act now: {report.summary_json.needs_attention_count ?? 0}</span>
                <span>Prepare: {report.summary_json.prepare_count ?? 0}</span>
                <span>Follow up: {report.summary_json.follow_up_count ?? 0}</span>
                <span>Changed: {report.summary_json.changed_cases_count ?? 0}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
