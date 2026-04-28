import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentUser } from "@/lib/data";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="authLayout">
      <section className="authHero">
        <div className="eyebrow">Weekly case decisions powered by public data.</div>
        <h1>Know what deserves attention before the team starts triage.</h1>
        <p>
          CaseSignal reorganizes immigration inventory around real public signals,
          so the home screen tells the firm what to move, what to prepare, and
          what can wait.
        </p>
      </section>

      <LoginForm />
    </main>
  );
}
