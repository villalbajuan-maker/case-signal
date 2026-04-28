"use client";

import { useState, useTransition } from "react";

import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const isDevBypassEnabled =
    process.env.NODE_ENV === "development" && !!process.env.NEXT_PUBLIC_DEV_BYPASS_ENABLED;
  const [email, setEmail] = useState("lex@lexcontrol.co");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${origin}/auth/callback`
        }
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Check your email for a secure sign-in link.");
    });
  };

  return (
    <form className="authCard" onSubmit={handleSubmit}>
      <div className="eyebrow">CaseSignal</div>
      <h1>Sign in to the decision layer.</h1>
      <p className="muted">
        The workspace centers attention, not case storage. Use your firm email to
        receive a secure sign-in link.
      </p>

      <label className="field">
        <span>Email</span>
        <input
          autoComplete="email"
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@firm.com"
          type="email"
          value={email}
        />
      </label>

      <button className="primaryButton" disabled={isPending} type="submit">
        {isPending ? "Sending link..." : "Send sign-in link"}
      </button>

      {isDevBypassEnabled ? (
        <p className="helperMessage">
          Local dev bypass is enabled. You can go directly to the dashboard without
          waiting on email.
        </p>
      ) : null}

      {message ? <p className="helperMessage">{message}</p> : null}
    </form>
  );
}
