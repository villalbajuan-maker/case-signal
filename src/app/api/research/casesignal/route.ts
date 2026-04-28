import { createHash } from "node:crypto";

import { NextResponse } from "next/server";

import { CASESIGNAL_SURVEY_SLUG, type ResearchSubmissionPayload, validateResearchSubmission } from "@/lib/research";
import { createAdminClient } from "@/lib/supabase/server";

function hashIp(ip: string | null) {
  if (!ip) return null;
  return createHash("sha256").update(ip).digest("hex");
}

function cleanString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function cleanNullableString(value: unknown) {
  const cleaned = cleanString(value);
  return cleaned.length ? cleaned : null;
}

function cleanStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanScale(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePayload(body: Partial<ResearchSubmissionPayload>) {
  const source: ResearchSubmissionPayload["source"] =
    body.source === "assisted_live_interview" ||
    body.source === "referral" ||
    body.source === "outbound_request"
      ? body.source
      : "self_submitted";

  return {
    source,
    interviewer_name: cleanNullableString(body.interviewer_name),
    respondent_role: cleanString(body.respondent_role),
    years_experience: cleanString(body.years_experience),
    practice_types: cleanStringArray(body.practice_types),
    active_case_volume: cleanString(body.active_case_volume),
    primary_case_system: cleanString(body.primary_case_system),
    review_frequency: cleanString(body.review_frequency),
    public_sources_used: cleanStringArray(body.public_sources_used),
    source_reviewer_role: cleanString(body.source_reviewer_role),
    prioritization_method: cleanString(body.prioritization_method),
    manuality_score: cleanScale(body.manuality_score),
    difficulty_score: cleanScale(body.difficulty_score),
    early_review_frequency: cleanString(body.early_review_frequency),
    late_identification_frequency: cleanString(body.late_identification_frequency),
    dependency_score: cleanScale(body.dependency_score),
    external_info_contribution: cleanString(body.external_info_contribution),
    problem_seriousness: cleanString(body.problem_seriousness),
    top_operational_difficulties: cleanStringArray(body.top_operational_difficulties),
    time_spent_level: cleanString(body.time_spent_level),
    manual_reduction_value_score: cleanScale(body.manual_reduction_value_score),
    most_valuable_outcome: cleanString(body.most_valuable_outcome),
    weekly_view_usefulness_score: cleanScale(body.weekly_view_usefulness_score),
    likely_to_use_alongside_current_system: cleanString(body.likely_to_use_alongside_current_system),
    comfort_with_separate_tool: cleanString(body.comfort_with_separate_tool),
    trust_factors: cleanStringArray(body.trust_factors),
    demo_interest: cleanString(body.demo_interest),
    referral_openness: cleanString(body.referral_openness),
    referral_count_estimate: cleanString(body.referral_count_estimate),
    follow_up_openness: cleanString(body.follow_up_openness),
    additional_comments: cleanNullableString(body.additional_comments)
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ResearchSubmissionPayload>;
    const surveySlug = cleanString(body.survey_slug) || CASESIGNAL_SURVEY_SLUG;
    const submission = normalizePayload(body);
    const validation = validateResearchSubmission(submission);

    if (!validation.valid) {
      return NextResponse.json(
        {
          error: "Please complete the required fields before submitting.",
          fields: validation.errors
        },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const { data: survey, error: surveyError } = await supabase
      .schema("research")
      .from("surveys")
      .select("id, status")
      .eq("slug", surveySlug)
      .single();

    if (surveyError || !survey) {
      return NextResponse.json(
        { error: "The research survey is not available right now." },
        { status: 404 }
      );
    }

    if (survey.status === "archived") {
      return NextResponse.json(
        { error: "This research survey is no longer accepting responses." },
        { status: 410 }
      );
    }

    const { data: insertedSubmission, error: submissionError } = await supabase
      .schema("research")
      .from("submissions")
      .insert({
        survey_id: survey.id,
        ...submission
      })
      .select("id")
      .single();

    if (submissionError || !insertedSubmission) {
      throw submissionError ?? new Error("Unable to save research submission.");
    }

    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIp = request.headers.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0]?.trim() || realIp || null;

    await Promise.all([
      supabase.schema("research").from("submission_meta").insert({
        submission_id: insertedSubmission.id,
        ip_hash: hashIp(ip),
        user_agent: request.headers.get("user-agent"),
        referrer: request.headers.get("referer"),
        utm_source: cleanNullableString(body["utm_source" as keyof typeof body]),
        utm_medium: cleanNullableString(body["utm_medium" as keyof typeof body]),
        utm_campaign: cleanNullableString(body["utm_campaign" as keyof typeof body])
      }),
      supabase.schema("research").from("reviews").insert({
        submission_id: insertedSubmission.id
      })
    ]);

    return NextResponse.json({
      ok: true,
      submissionId: insertedSubmission.id,
      redirectTo: "/research/casesignal/thank-you"
    });
  } catch (error) {
    console.error("research submission failed", error);

    return NextResponse.json(
      { error: "We couldn't submit your response right now. Please try again." },
      { status: 500 }
    );
  }
}
