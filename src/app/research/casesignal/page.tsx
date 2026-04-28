import type { Metadata } from "next";

import { ResearchIntakeForm } from "@/components/research/research-intake-form";

export const metadata: Metadata = {
  title: "CaseSignal Research | LexControl",
  description:
    "A brief research invitation for immigration professionals helping shape CaseSignal."
};

export default async function CaseSignalResearchPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const initialStep = typeof params.step === "string" ? params.step : undefined;

  return (
    <main className="researchPage">
      <div className="researchPage__backdrop" aria-hidden="true" />
      <div className="researchPage__inner">
        <header className="researchBrandBar">
          <div className="researchBrandMark">LC</div>
          <div>
            <p className="researchBrandLabel">LexControl Research</p>
            <p className="researchBrandSubtle">CaseSignal early problem validation</p>
          </div>
        </header>

        <ResearchIntakeForm initialStep={initialStep} />
      </div>
    </main>
  );
}
