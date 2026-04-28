"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";

import {
  CASESIGNAL_SURVEY_SLUG,
  getInitialResearchSubmission,
  researchOptions,
  validateResearchSubmission,
  type ResearchSubmissionInput
} from "@/lib/research";

type SectionId =
  | "background"
  | "workflow"
  | "friction"
  | "cost"
  | "concept"
  | "followup";

type ResearchIntakeFormProps = {
  initialStep?: string;
};

type SectionDefinition = {
  id: SectionId;
  label: string;
  title: string;
  intro: string;
};

const sections: SectionDefinition[] = [
  {
    id: "background",
    label: "Who you are",
    title: "Tell us a little about your perspective",
    intro: "We’ll start with a few basics so we understand the kind of experience you’re speaking from."
  },
  {
    id: "workflow",
    label: "How this works today",
    title: "How does this usually happen in practice?",
    intro:
      "We’d like to understand how teams review public immigration information and turn it into decisions about which cases deserve attention."
  },
  {
    id: "friction",
    label: "Where friction appears",
    title: "Where does this become difficult?",
    intro:
      "This is where we look for the real pressure points: what feels manual, inconsistent, early, late, or too dependent on a few people."
  },
  {
    id: "cost",
    label: "Operational cost",
    title: "What does this cost the team in practice?",
    intro:
      "We’re looking at the real operational weight behind this work: time, attention, and effort that may be spent too early, too late, or too manually."
  },
  {
    id: "concept",
    label: "Your reaction",
    title: "Now imagine a calmer weekly way to review this",
    intro:
      "We’d like your reaction to a simple idea: a weekly operating view that helps a firm see which cases need attention, which can wait, and which may require follow-up."
  },
  {
    id: "followup",
    label: "With gratitude",
    title: "Thank you. One last small favor, if you’re open to it.",
    intro:
      "If this has felt worthwhile, we’d be grateful for a little more help through referrals or a short follow-up."
  }
];

const scaleLabels = {
  low: "Lower",
  high: "Higher"
};

function toggleValue(values: string[], value: string, max?: number) {
  if (values.includes(value)) {
    return values.filter((item) => item !== value);
  }

  if (max && values.length >= max) {
    return values;
  }

  return [...values, value];
}

function scaleValueLabel(value: number) {
  return value ? String(value) : "—";
}

export function ResearchIntakeForm({ initialStep }: ResearchIntakeFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [submission, setSubmission] = useState<ResearchSubmissionInput>(() => getInitialResearchSubmission());
  const [started, setStarted] = useState(() => Boolean(initialStep));
  const [currentSectionIndex, setCurrentSectionIndex] = useState(() => {
    const index = sections.findIndex((section) => section.id === initialStep);
    return index >= 0 ? index : 0;
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const index = sections.findIndex((section) => section.id === initialStep);
    if (initialStep && index >= 0) {
      setStarted(true);
      setCurrentSectionIndex(index);
    }
  }, [initialStep]);

  useEffect(() => {
    const nextUrl = started ? `${pathname}?step=${sections[currentSectionIndex].id}` : pathname;
    window.history.replaceState(null, "", nextUrl);
  }, [currentSectionIndex, pathname, started]);

  const currentSection = sections[currentSectionIndex];
  const progressValue = started ? ((currentSectionIndex + 1) / sections.length) * 100 : 0;
  const progressLabel = started
    ? `${currentSection.label} · Section ${currentSectionIndex + 1} of ${sections.length}`
    : "A brief research invitation";

  const sectionError = useMemo(() => validateCurrentSection(currentSection.id, submission), [currentSection.id, submission]);

  function patchSubmission(patch: Partial<ResearchSubmissionInput>) {
    setSubmission((current) => ({ ...current, ...patch }));
  }

  function beginInterview() {
    setStarted(true);
    setCurrentSectionIndex(0);
    setSubmitError(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    setSubmitError(null);

    if (currentSectionIndex === 0) {
      setStarted(false);
      window.history.replaceState(null, "", pathname);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setCurrentSectionIndex((index) => Math.max(0, index - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goForward() {
    const error = validateCurrentSection(currentSection.id, submission);
    if (error) {
      setSubmitError(error);
      return;
    }

    setSubmitError(null);
    setCurrentSectionIndex((index) => Math.min(sections.length - 1, index + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitForm() {
    const validation = validateResearchSubmission(submission);
    if (!validation.valid) {
      setSubmitError("Please complete the remaining required answers before submitting.");
      return;
    }

    setSubmitError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/research/casesignal", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            survey_slug: CASESIGNAL_SURVEY_SLUG,
            ...submission
          })
        });

        const payload = (await response.json()) as { error?: string; redirectTo?: string };

        if (!response.ok) {
          setSubmitError(payload.error ?? "We couldn't submit your response right now. Please try again.");
          return;
        }

        window.location.assign(payload.redirectTo ?? "/research/casesignal/thank-you");
      } catch {
        setSubmitError("We couldn't submit your response right now. Please try again.");
      }
    });
  }

  if (!started) {
    return (
      <section className="researchFrame researchWelcomePanel">
        <div className="researchWelcomePanel__copy">
          <p className="researchEyebrow">A brief research invitation</p>
          <h1>We’d be grateful for 10 thoughtful minutes.</h1>
          <p className="researchLead">
            We’re speaking with immigration professionals to better understand how law firms decide
            which active cases need attention when public immigration information changes.
          </p>
          <p className="researchLead researchLead--soft">
            This is part of early research for a product we’re building with genuine care. Your
            perspective would help us think more clearly, stay honest about what is truly useful,
            and build more responsibly.
          </p>

          <div className="researchWelcomePanel__actions">
            <button className="researchPrimaryButton" type="button" onClick={beginInterview}>
              Begin the interview
            </button>
            <p className="researchSoftLine">Thank you in advance for considering it.</p>
          </div>
        </div>

        <div className="researchWelcomePanel__aside">
          <div className="researchWelcomePanel__visual" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="researchInfoGrid">
            <article className="researchInfoCard">
              <strong>About 10 minutes</strong>
              <p>No preparation needed.</p>
            </article>
            <article className="researchInfoCard">
              <strong>Thoughtful, not technical</strong>
              <p>We’re here to learn from your real experience.</p>
            </article>
            <article className="researchInfoCard">
              <strong>Genuinely appreciated</strong>
              <p>Your answers directly support our research and product direction.</p>
            </article>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="researchFrame researchSurveyPanel">
      <header className="researchSurveyPanel__header">
        <div className="researchProgressMeta researchProgressMeta--v3">
          <p className="researchProgressLabel">{progressLabel}</p>
          <div className="researchProgressBar researchProgressBar--v3" aria-hidden="true">
            <span style={{ width: `${progressValue}%` }} />
          </div>
        </div>

        <div className="researchSectionHero">
          <div className="researchSectionHero__copy">
            <p className="researchSectionLabel">{currentSection.label}</p>
            <h2>{currentSection.title}</h2>
            <p>{currentSection.intro}</p>
          </div>
          <div className="researchSectionHero__badge">
            <span>{String(currentSectionIndex + 1).padStart(2, "0")}</span>
            <small>of {sections.length}</small>
          </div>
        </div>
      </header>

      <div className="researchSectionBody">{renderSection(currentSection.id, submission, patchSubmission)}</div>

      {submitError ? <p className="researchError">{submitError}</p> : null}

      <footer className="researchSurveyPanel__footer">
        <button className="researchGhostButton" type="button" onClick={goBack} disabled={isPending}>
          {currentSectionIndex === 0 ? "Back to welcome" : "Back"}
        </button>

        {currentSectionIndex === sections.length - 1 ? (
          <button className="researchPrimaryButton" type="button" onClick={submitForm} disabled={isPending}>
            {isPending ? "Submitting with thanks..." : "Submit with thanks"}
          </button>
        ) : (
          <button className="researchPrimaryButton" type="button" onClick={goForward}>
            Continue
          </button>
        )}
      </footer>
    </section>
  );
}

function renderSection(
  sectionId: SectionId,
  submission: ResearchSubmissionInput,
  patchSubmission: (patch: Partial<ResearchSubmissionInput>) => void
) {
  switch (sectionId) {
    case "background":
      return (
        <div className="researchSectionStack">
          <SingleSelectQuestion
            label="What best describes your role?"
            value={submission.respondent_role}
            options={researchOptions.roles}
            onChange={(value) => patchSubmission({ respondent_role: value })}
          />
          <SingleSelectQuestion
            label="How many years of experience do you have in immigration law?"
            value={submission.years_experience}
            options={researchOptions.experienceBands}
            onChange={(value) => patchSubmission({ years_experience: value })}
          />
          <MultiSelectQuestion
            label="What type of immigration practice are you most familiar with?"
            helper="Choose all that apply."
            values={submission.practice_types}
            options={researchOptions.practiceTypes}
            onToggle={(value) =>
              patchSubmission({ practice_types: toggleValue(submission.practice_types, value) })
            }
          />
          <SingleSelectQuestion
            label="Approximately how many active cases did the team or firm you worked with usually manage at one time?"
            value={submission.active_case_volume}
            options={researchOptions.caseVolumes}
            onChange={(value) => patchSubmission({ active_case_volume: value })}
          />
          <SingleSelectQuestion
            label="What system did your firm primarily use to manage immigration cases?"
            value={submission.primary_case_system}
            options={researchOptions.primarySystems}
            onChange={(value) => patchSubmission({ primary_case_system: value })}
          />
        </div>
      );
    case "workflow":
      return (
        <div className="researchSectionStack">
          <SingleSelectQuestion
            label="How often did your team review public immigration information that could affect case timing or next steps?"
            value={submission.review_frequency}
            options={researchOptions.reviewFrequencies}
            onChange={(value) => patchSubmission({ review_frequency: value })}
          />
          <MultiSelectQuestion
            label="Which public sources were most relevant in your workflow?"
            helper="Choose all that apply."
            values={submission.public_sources_used}
            options={researchOptions.publicSources}
            onToggle={(value) =>
              patchSubmission({
                public_sources_used: toggleValue(submission.public_sources_used, value)
              })
            }
          />
          <SingleSelectQuestion
            label="Who usually reviewed those sources and decided what they meant for active cases?"
            value={submission.source_reviewer_role}
            options={researchOptions.sourceReviewerRoles}
            onChange={(value) => patchSubmission({ source_reviewer_role: value })}
          />
          <SingleSelectQuestion
            label="How did your team usually decide which cases needed attention first?"
            value={submission.prioritization_method}
            options={researchOptions.prioritizationMethods}
            onChange={(value) => patchSubmission({ prioritization_method: value })}
          />
        </div>
      );
    case "friction":
      return (
        <div className="researchSectionStack">
          <ScaleQuestion
            label="How manual was the process of reviewing public immigration information and prioritizing cases?"
            value={submission.manuality_score}
            onChange={(value) => patchSubmission({ manuality_score: value })}
          />
          <ScaleQuestion
            label="How difficult was it to consistently know which cases needed attention first?"
            value={submission.difficulty_score}
            onChange={(value) => patchSubmission({ difficulty_score: value })}
          />
          <SingleSelectQuestion
            label="In your experience, how often were cases reviewed before they actually required action?"
            value={submission.early_review_frequency}
            options={researchOptions.frequencyScale}
            onChange={(value) => patchSubmission({ early_review_frequency: value })}
          />
          <SingleSelectQuestion
            label="In your experience, how often were cases identified too late for ideal preparation or follow-up?"
            value={submission.late_identification_frequency}
            options={researchOptions.frequencyScale}
            onChange={(value) => patchSubmission({ late_identification_frequency: value })}
          />
          <ScaleQuestion
            label="How dependent was this process on the knowledge or judgment of specific experienced team members?"
            value={submission.dependency_score}
            onChange={(value) => patchSubmission({ dependency_score: value })}
          />
          <SingleSelectQuestion
            label="How much of this prioritization difficulty was specifically caused by changing public or external immigration information?"
            value={submission.external_info_contribution}
            options={researchOptions.contributionScale}
            onChange={(value) => patchSubmission({ external_info_contribution: value })}
          />
          <SingleSelectQuestion
            label="Overall, how serious of an operational problem was this for firms like yours?"
            value={submission.problem_seriousness}
            options={researchOptions.seriousnessScale}
            onChange={(value) => patchSubmission({ problem_seriousness: value })}
          />
          <MultiSelectQuestion
            label="Which of the following created the most operational difficulty?"
            helper="Choose up to 3."
            values={submission.top_operational_difficulties}
            options={researchOptions.topDifficulties}
            max={3}
            onToggle={(value) =>
              patchSubmission({
                top_operational_difficulties: toggleValue(
                  submission.top_operational_difficulties,
                  value,
                  3
                )
              })
            }
          />
        </div>
      );
    case "cost":
      return (
        <div className="researchSectionStack">
          <SingleSelectQuestion
            label="How much operational time do you think your team spent reviewing, interpreting, and prioritizing cases based on changing public information?"
            value={submission.time_spent_level}
            options={researchOptions.timeSpent}
            onChange={(value) => patchSubmission({ time_spent_level: value })}
          />
          <ScaleQuestion
            label="How valuable would it be to reduce the amount of manual review and prioritization work in this area?"
            value={submission.manual_reduction_value_score}
            onChange={(value) => patchSubmission({ manual_reduction_value_score: value })}
          />
          <SingleSelectQuestion
            label="Which outcome would be most valuable to your team?"
            value={submission.most_valuable_outcome}
            options={researchOptions.mostValuableOutcomes}
            onChange={(value) => patchSubmission({ most_valuable_outcome: value })}
          />
        </div>
      );
    case "concept":
      return (
        <div className="researchSectionStack">
          <div className="researchConceptCard">
            <p>
              Imagine a weekly view showing which cases need attention, which can wait, and which
              may require follow-up, based on changing public immigration information.
            </p>
          </div>
          <ScaleQuestion
            label="How useful would that kind of weekly view be for a firm like yours?"
            value={submission.weekly_view_usefulness_score}
            onChange={(value) => patchSubmission({ weekly_view_usefulness_score: value })}
          />
          <SingleSelectQuestion
            label="If a tool like this worked reliably, how likely would a firm like yours be to use it alongside its current case management system?"
            value={submission.likely_to_use_alongside_current_system}
            options={researchOptions.likelihoodScale}
            onChange={(value) =>
              patchSubmission({ likely_to_use_alongside_current_system: value })
            }
          />
          <SingleSelectQuestion
            label="How comfortable do you think a firm like yours would be using a separate tool focused only on weekly case prioritization?"
            value={submission.comfort_with_separate_tool}
            options={researchOptions.comfortScale}
            onChange={(value) => patchSubmission({ comfort_with_separate_tool: value })}
          />
          <MultiSelectQuestion
            label="What would matter most before trusting a tool like this?"
            helper="Choose up to 3."
            values={submission.trust_factors}
            options={researchOptions.trustFactors}
            max={3}
            onToggle={(value) =>
              patchSubmission({
                trust_factors: toggleValue(submission.trust_factors, value, 3)
              })
            }
          />
          <SingleSelectQuestion
            label="If a tool like this worked reliably, how interested would you be in seeing a demo or example?"
            value={submission.demo_interest}
            options={researchOptions.interestScale}
            onChange={(value) => patchSubmission({ demo_interest: value })}
          />
        </div>
      );
    case "followup":
      return (
        <div className="researchSectionStack">
          <SingleSelectQuestion
            label="Would you be open to referring other immigration professionals who may be willing to answer a similar short research questionnaire?"
            value={submission.referral_openness}
            options={researchOptions.yesMaybeNo}
            onChange={(value) => patchSubmission({ referral_openness: value })}
          />
          <SingleSelectQuestion
            label="Approximately how many colleagues do you think might be open to helping?"
            value={submission.referral_count_estimate}
            options={researchOptions.referralCounts}
            onChange={(value) => patchSubmission({ referral_count_estimate: value })}
          />
          <SingleSelectQuestion
            label="Would you be open to a short follow-up conversation if needed?"
            value={submission.follow_up_openness}
            options={researchOptions.yesMaybeNo}
            onChange={(value) => patchSubmission({ follow_up_openness: value })}
          />
          <label className="researchQuestionCard researchQuestionCard--text">
            <span className="researchQuestionTitle">
              Is there anything else you think law firms struggle with when deciding which
              immigration cases need attention?
            </span>
            <span className="researchHelper">Optional.</span>
            <textarea
              className="researchTextarea"
              value={submission.additional_comments ?? ""}
              onChange={(event) => patchSubmission({ additional_comments: event.target.value })}
              placeholder="Share anything else that feels relevant."
            />
          </label>
        </div>
      );
  }
}

function SingleSelectQuestion({
  label,
  value,
  options,
  onChange
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <fieldset className="researchQuestionCard">
      <legend className="researchQuestionTitle">{label}</legend>
      <div className="researchButtonGrid">
        {options.map((option) => (
          <button
            key={option}
            className={`researchOptionButton${value === option ? " researchOptionButton--selected" : ""}`}
            type="button"
            onClick={() => onChange(option)}
          >
            <span>{option}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function MultiSelectQuestion({
  label,
  helper,
  values,
  options,
  onToggle,
  max
}: {
  label: string;
  helper?: string;
  values: string[];
  options: readonly string[];
  onToggle: (value: string) => void;
  max?: number;
}) {
  return (
    <fieldset className="researchQuestionCard">
      <legend className="researchQuestionTitle">{label}</legend>
      {helper ? <p className="researchHelper">{helper}</p> : null}
      <div className="researchButtonGrid">
        {options.map((option) => {
          const selected = values.includes(option);
          const disabled = Boolean(max && values.length >= max && !selected);

          return (
            <button
              key={option}
              className={`researchOptionButton${selected ? " researchOptionButton--selected" : ""}`}
              type="button"
              onClick={() => onToggle(option)}
              disabled={disabled}
            >
              <span>{option}</span>
              <small>{selected ? "Selected" : max ? `${values.length}/${max}` : ""}</small>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

function ScaleQuestion({
  label,
  value,
  onChange
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <fieldset className="researchQuestionCard">
      <legend className="researchQuestionTitle">{label}</legend>
      <div className="researchScaleLabels researchScaleLabels--v3">
        <span>{scaleLabels.low}</span>
        <span>{scaleLabels.high}</span>
      </div>
      <div className="researchScaleRow researchScaleRow--v3">
        {[1, 2, 3, 4, 5].map((option) => (
          <button
            key={option}
            className={`researchScaleTile${value === option ? " researchScaleTile--selected" : ""}`}
            type="button"
            onClick={() => onChange(option)}
          >
            <strong>{option}</strong>
            <span>{scaleValueLabel(option)}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function validateCurrentSection(sectionId: SectionId, submission: ResearchSubmissionInput) {
  switch (sectionId) {
    case "background":
      if (!submission.respondent_role) return "Please choose your role to continue.";
      if (!submission.years_experience) return "Please choose your years of experience to continue.";
      if (!submission.practice_types.length) return "Please choose at least one practice type to continue.";
      if (!submission.active_case_volume) return "Please choose an active case volume to continue.";
      if (!submission.primary_case_system) return "Please choose the primary case system to continue.";
      return null;
    case "workflow":
      if (!submission.review_frequency) return "Please choose a review frequency to continue.";
      if (!submission.public_sources_used.length) return "Please choose the public sources that matter most.";
      if (!submission.source_reviewer_role) return "Please choose who usually reviews those sources.";
      if (!submission.prioritization_method) return "Please choose how prioritization usually happens.";
      return null;
    case "friction":
      if (!submission.manuality_score) return "Please rate how manual the process felt.";
      if (!submission.difficulty_score) return "Please rate how difficult prioritization felt.";
      if (!submission.early_review_frequency) return "Please choose how often cases were reviewed too early.";
      if (!submission.late_identification_frequency) return "Please choose how often cases were identified too late.";
      if (!submission.dependency_score) return "Please rate how dependent the process was on experienced people.";
      if (!submission.external_info_contribution) return "Please choose how much this came from public information.";
      if (!submission.problem_seriousness) return "Please choose how serious this felt overall.";
      if (!submission.top_operational_difficulties.length) return "Please choose the main operational difficulties.";
      return null;
    case "cost":
      if (!submission.time_spent_level) return "Please choose how much time this usually consumed.";
      if (!submission.manual_reduction_value_score) return "Please rate how valuable reducing this work would be.";
      if (!submission.most_valuable_outcome) return "Please choose the outcome that would matter most.";
      return null;
    case "concept":
      if (!submission.weekly_view_usefulness_score) return "Please rate how useful that weekly view would be.";
      if (!submission.likely_to_use_alongside_current_system) return "Please choose how likely a firm would be to use it.";
      if (!submission.comfort_with_separate_tool) return "Please choose how comfortable a firm would feel using a separate tool.";
      if (!submission.trust_factors.length) return "Please choose the trust factors that matter most.";
      if (!submission.demo_interest) return "Please choose the level of demo interest.";
      return null;
    case "followup":
      if (!submission.referral_openness) return "Please let us know whether you’d be open to referrals.";
      if (!submission.referral_count_estimate) return "Please estimate how many colleagues might be open to helping.";
      if (!submission.follow_up_openness) return "Please let us know whether you’d be open to a short follow-up.";
      return null;
  }
}
