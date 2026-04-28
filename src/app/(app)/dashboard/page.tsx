import { CaseList } from "@/components/app/case-list";
import { MetricCard } from "@/components/app/metric-card";
import { getDashboardCases } from "@/lib/data";

export default async function DashboardPage() {
  const cases = await getDashboardCases();

  const actNow = cases.filter((item) => item.decision_state === "act_now");
  const prepare = cases.filter((item) => item.decision_state === "prepare");
  const followUp = cases.filter((item) => item.decision_state === "follow_up");
  const waiting = cases.filter((item) => item.decision_state === "wait");

  return (
    <div className="pageStack">
      <header className="heroPanel">
        <div>
          <div className="eyebrow">Attention Queue</div>
          <h1>This week&apos;s operational decisions.</h1>
          <p className="muted">
            Start with the cases that require movement now. The system sorts the
            inventory around decision state and urgency, not around storage.
          </p>
        </div>
      </header>

      <section className="metricsGrid">
        <MetricCard label="Act Now" tone="urgent" value={actNow.length} />
        <MetricCard label="Prepare" value={prepare.length} />
        <MetricCard label="Follow Up" tone="calm" value={followUp.length} />
        <MetricCard label="Waiting" value={waiting.length} />
      </section>

      <CaseList
        cases={actNow}
        description="Highest-leverage cases that should move first."
        title="Needs Attention Now"
      />
      <CaseList
        cases={prepare}
        description="Cases that are not fully actionable yet, but should be staged."
        title="Prepare Soon"
      />
      <CaseList
        cases={followUp}
        description="Cases that may need intervention or status review."
        title="Follow Up"
      />
      <CaseList
        cases={waiting}
        description="Cases still outside the action window."
        title="Waiting"
      />
    </div>
  );
}
