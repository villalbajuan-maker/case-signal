import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/data";

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

  const user = await getCurrentUser();
  redirect(user ? "/dashboard" : "/login");
}
