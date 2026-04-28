import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { getCurrentUser } from "@/lib/data";

function getResearchHosts() {
  const rawHosts = [process.env.RESEARCH_HOSTNAME, process.env.NEXT_PUBLIC_RESEARCH_HOSTNAME]
    .filter(Boolean)
    .flatMap((value) => value!.split(","))
    .map((value) => value.trim().toLowerCase().split(":")[0])
    .filter(Boolean);

  return new Set(rawHosts);
}

function isResearchHost(hostname: string) {
  const normalized = hostname.toLowerCase().split(":")[0];
  const configuredHosts = getResearchHosts();

  if (configuredHosts.has(normalized)) {
    return true;
  }

  return (
    normalized.startsWith("research.") ||
    normalized.startsWith("interview.") ||
    normalized.startsWith("survey.")
  );
}

export default async function HomePage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const code = typeof params.code === "string" ? params.code : null;
  const next = typeof params.next === "string" ? params.next : "/dashboard";

  if (code) {
    redirect(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next)}`);
  }

  const headerStore = await headers();
  const requestHost =
    headerStore.get("x-forwarded-host") ?? headerStore.get("host") ?? "";

  if (requestHost && isResearchHost(requestHost)) {
    redirect("/research/casesignal");
  }

  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
