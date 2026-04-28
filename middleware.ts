import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

const RESEARCH_ENTRY_PATH = "/research/casesignal";

function getResearchHosts() {
  const rawHosts = [
    process.env.RESEARCH_HOSTNAME,
    process.env.NEXT_PUBLIC_RESEARCH_HOSTNAME
  ]
    .filter(Boolean)
    .flatMap((value) => value!.split(","))
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return new Set(rawHosts);
}

function isResearchHost(hostname: string) {
  const normalized = hostname.toLowerCase();
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

function isResearchPath(pathname: string) {
  return (
    pathname === RESEARCH_ENTRY_PATH ||
    pathname.startsWith("/research/") ||
    pathname.startsWith("/api/research/")
  );
}

export async function middleware(request: NextRequest) {
  const hostname =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.hostname;
  const pathname = request.nextUrl.pathname;

  if (isResearchHost(hostname) && !isResearchPath(pathname)) {
    const nextUrl = request.nextUrl.clone();
    nextUrl.pathname = RESEARCH_ENTRY_PATH;
    nextUrl.search = "";

    return NextResponse.redirect(nextUrl);
  }

  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
