# CaseSignal

Decision layer for immigration case inventory.

## Local setup

1. Copy `.env.example` to `.env.local`
2. Add your Supabase publishable key
3. Install dependencies:

```bash
npm install
```

4. Start the app:

```bash
npm run dev
```

## Local auth bypass

If Supabase email auth is rate-limited during development, you can enable a
strictly local bypass:

```bash
DEV_BYPASS_EMAIL=lex@lexcontrol.co
NEXT_PUBLIC_DEV_BYPASS_ENABLED=true
```

This only works in `development` and should never be used as a production auth
strategy.

## Current skeleton

- Next.js App Router
- Supabase SSR auth wiring
- login page with magic link sign-in
- protected app shell
- dashboard
- inventory view
- reports view
- case detail view

## Important note

This app is intentionally structured around the attention queue first. The UI
should continue to reinforce operational prioritization instead of drifting into
a generic case tracker.
