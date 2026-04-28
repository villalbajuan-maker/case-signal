import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Thank You | CaseSignal Research",
  description: "Thank you for contributing to CaseSignal research."
};

export default function CaseSignalResearchThankYouPage() {
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

        <section className="researchFrame researchFrame--thankYou">
          <p className="researchEyebrow">Thank you</p>
          <h1>Your time and perspective mean a great deal to us.</h1>
          <p>
            We know thoughtful answers take time, and we’re sincerely grateful you shared yours.
          </p>
          <p>
            This research is helping us shape something with greater clarity and care. Your
            contribution is part of that process, and we do not take it lightly.
          </p>

          <div className="researchThankYouNote">
            <h2>One small favor, if someone comes to mind</h2>
            <p>
              If this felt worthwhile, we’d be very grateful if you shared this with a few trusted
              immigration colleagues who may also be open to helping.
            </p>
            <p>
              Even 3 to 5 thoughtful responses from people in the field would make a real difference
              for us.
            </p>
          </div>

          <div className="researchWelcome__actions">
            <Link className="researchPrimaryButton researchPrimaryButton--link" href="/research/casesignal">
              Share the questionnaire
            </Link>
            <p className="researchSoftLine">Thank you again for helping us build this responsibly.</p>
          </div>
        </section>
      </div>
    </main>
  );
}
