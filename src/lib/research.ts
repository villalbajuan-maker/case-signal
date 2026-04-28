export const CASESIGNAL_SURVEY_SLUG = "casesignal-problem-validation-v1";

export interface ResearchSubmissionInput {
  source: "self_submitted" | "assisted_live_interview" | "referral" | "outbound_request";
  interviewer_name: string | null;
  respondent_role: string;
  years_experience: string;
  practice_types: string[];
  active_case_volume: string;
  primary_case_system: string;
  review_frequency: string;
  public_sources_used: string[];
  source_reviewer_role: string;
  prioritization_method: string;
  manuality_score: number;
  difficulty_score: number;
  early_review_frequency: string;
  late_identification_frequency: string;
  dependency_score: number;
  external_info_contribution: string;
  problem_seriousness: string;
  top_operational_difficulties: string[];
  time_spent_level: string;
  manual_reduction_value_score: number;
  most_valuable_outcome: string;
  weekly_view_usefulness_score: number;
  likely_to_use_alongside_current_system: string;
  comfort_with_separate_tool: string;
  trust_factors: string[];
  demo_interest: string;
  referral_openness: string;
  referral_count_estimate: string;
  follow_up_openness: string;
  additional_comments: string | null;
}

export interface ResearchSubmissionPayload extends ResearchSubmissionInput {
  survey_slug: string;
}

export const researchOptions = {
  roles: [
    "Attorney",
    "Senior Paralegal",
    "Paralegal",
    "Operations Manager / Legal Operations",
    "Firm Owner / Managing Attorney",
    "Retired immigration professional",
    "Other"
  ],
  experienceBands: [
    "Less than 2 years",
    "2–5 years",
    "6–10 years",
    "11–20 years",
    "More than 20 years"
  ],
  practiceTypes: [
    "Family-based immigration",
    "Employment-based immigration",
    "Removal / litigation",
    "Humanitarian / asylum",
    "Business immigration",
    "Mixed immigration practice",
    "Other"
  ],
  caseVolumes: [
    "Fewer than 50",
    "50–150",
    "151–300",
    "301–700",
    "More than 700",
    "Not sure"
  ],
  primarySystems: [
    "Docketwise",
    "Clio",
    "MyCase",
    "INSZoom",
    "LawLogix",
    "eImmigration / Cerenade",
    "Spreadsheets / internal trackers",
    "Other",
    "Not sure"
  ],
  reviewFrequencies: [
    "Daily",
    "Several times per week",
    "Weekly",
    "A few times per month",
    "Monthly",
    "Only when a specific issue came up",
    "Rarely / never"
  ],
  publicSources: [
    "Visa Bulletin",
    "USCIS filing chart guidance",
    "USCIS processing times",
    "USCIS case status tools",
    "AILA updates or summaries",
    "Government announcements / policy updates",
    "Other",
    "Not sure"
  ],
  sourceReviewerRoles: [
    "Attorney",
    "Senior paralegal",
    "Paralegal",
    "Operations manager",
    "Multiple people informally",
    "It depended on the situation",
    "Not sure"
  ],
  prioritizationMethods: [
    "Mainly based on staff experience and judgment",
    "By checking the case management system and then reviewing public sources manually",
    "Through spreadsheets or internal tracking lists",
    "Through a structured internal process",
    "Through software automation",
    "It varied from week to week",
    "Not sure"
  ],
  frequencyScale: ["Very often", "Often", "Sometimes", "Rarely", "Never", "Not sure"],
  contributionScale: [
    "None of it",
    "A small part",
    "A moderate part",
    "A large part",
    "Most of it",
    "Not sure"
  ],
  seriousnessScale: [
    "Not a real problem",
    "Minor problem",
    "Moderate problem",
    "Significant problem",
    "Critical problem",
    "Not sure"
  ],
  topDifficulties: [
    "Reviewing public sources manually",
    "Interpreting what those sources meant for actual cases",
    "Deciding which cases to prioritize first",
    "Spending time on cases that were not yet actionable",
    "Missing or delaying follow-up on cases that needed attention",
    "Inconsistent judgment across team members",
    "Other"
  ],
  timeSpent: [
    "Very little",
    "A small but noticeable amount",
    "A moderate amount",
    "A significant amount",
    "A very large amount",
    "Not sure"
  ],
  mostValuableOutcomes: [
    "Saving staff time",
    "Knowing which cases need attention now",
    "Reducing unnecessary review of non-actionable cases",
    "Avoiding late follow-up or delayed action",
    "Creating more consistency across the team",
    "All of the above are similarly valuable"
  ],
  likelihoodScale: ["Very likely", "Likely", "Unsure", "Unlikely", "Very unlikely"],
  comfortScale: [
    "Very comfortable",
    "Somewhat comfortable",
    "Unsure",
    "Somewhat uncomfortable",
    "Very uncomfortable"
  ],
  trustFactors: [
    "Accuracy of recommendations",
    "Clear explanation of why a case was flagged",
    "Integration with existing systems",
    "Easy case import",
    "Reliability of public data sources",
    "Ability to review changes week by week",
    "Simplicity of the interface",
    "Other"
  ],
  interestScale: [
    "Very interested",
    "Interested",
    "Unsure",
    "Not very interested",
    "Not interested at all"
  ],
  yesMaybeNo: ["Yes", "Maybe", "No"],
  referralCounts: ["1–2", "3–5", "6–10", "More than 10", "Not sure"]
} as const;

export function getInitialResearchSubmission(): ResearchSubmissionInput {
  return {
    source: "self_submitted",
    interviewer_name: null,
    respondent_role: "",
    years_experience: "",
    practice_types: [],
    active_case_volume: "",
    primary_case_system: "",
    review_frequency: "",
    public_sources_used: [],
    source_reviewer_role: "",
    prioritization_method: "",
    manuality_score: 0,
    difficulty_score: 0,
    early_review_frequency: "",
    late_identification_frequency: "",
    dependency_score: 0,
    external_info_contribution: "",
    problem_seriousness: "",
    top_operational_difficulties: [],
    time_spent_level: "",
    manual_reduction_value_score: 0,
    most_valuable_outcome: "",
    weekly_view_usefulness_score: 0,
    likely_to_use_alongside_current_system: "",
    comfort_with_separate_tool: "",
    trust_factors: [],
    demo_interest: "",
    referral_openness: "",
    referral_count_estimate: "",
    follow_up_openness: "",
    additional_comments: ""
  };
}

export function validateResearchSubmission(input: ResearchSubmissionInput) {
  const errors: string[] = [];

  const requireString = (value: string, label: string) => {
    if (!value.trim()) errors.push(label);
  };

  const requireScale = (value: number, label: string) => {
    if (value < 1 || value > 5) errors.push(label);
  };

  const requireArray = (value: string[], label: string, max?: number) => {
    if (!value.length) errors.push(label);
    if (max && value.length > max) errors.push(`${label} (too many selections)`);
  };

  requireString(input.respondent_role, "Role");
  requireString(input.years_experience, "Years of experience");
  requireArray(input.practice_types, "Practice type");
  requireString(input.active_case_volume, "Active case volume");
  requireString(input.primary_case_system, "Primary case system");
  requireString(input.review_frequency, "Review frequency");
  requireArray(input.public_sources_used, "Public sources");
  requireString(input.source_reviewer_role, "Source reviewer role");
  requireString(input.prioritization_method, "Prioritization method");
  requireScale(input.manuality_score, "Manuality score");
  requireScale(input.difficulty_score, "Difficulty score");
  requireString(input.early_review_frequency, "Early review frequency");
  requireString(input.late_identification_frequency, "Late identification frequency");
  requireScale(input.dependency_score, "Dependency score");
  requireString(input.external_info_contribution, "External information contribution");
  requireString(input.problem_seriousness, "Problem seriousness");
  requireArray(input.top_operational_difficulties, "Top operational difficulties", 3);
  requireString(input.time_spent_level, "Time spent");
  requireScale(input.manual_reduction_value_score, "Manual reduction value score");
  requireString(input.most_valuable_outcome, "Most valuable outcome");
  requireScale(input.weekly_view_usefulness_score, "Weekly view usefulness score");
  requireString(input.likely_to_use_alongside_current_system, "Likelihood to use alongside current system");
  requireString(input.comfort_with_separate_tool, "Comfort with separate tool");
  requireArray(input.trust_factors, "Trust factors", 3);
  requireString(input.demo_interest, "Demo interest");
  requireString(input.referral_openness, "Referral openness");
  requireString(input.referral_count_estimate, "Referral count estimate");
  requireString(input.follow_up_openness, "Follow up openness");

  return {
    valid: errors.length === 0,
    errors
  };
}
