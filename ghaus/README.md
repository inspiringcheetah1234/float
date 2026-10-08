# Ghaus & Company — practice management

System of record and workflow layer for a Pakistani tax law firm, around FBR's IRIS portal. It does
**not** file returns. Multi-tenant (every table has `firm_id`, isolated by Postgres RLS), built by
Float AI for Ghaus & Company first.

- **Schema, phases and design**: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- **Conventions for anyone working on the code**: [`CLAUDE.md`](CLAUDE.md)

Stack: Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui · Supabase (Postgres, Auth with
TOTP MFA, Storage) · Vercel.

## Run it locally

Needs Node 22+ and Docker.

```bash
cd ghaus
npm install
npm run db:start          # local Supabase; prints the anon and service-role keys
cp .env.example .env.local   # fill in the keys printed above
npm run db:reset          # apply migrations
npm run seed:demo         # demo firm, staff, 24 clients, TY2025 + TY2026 season
npm run dev               # http://localhost:3000
```

Demo logins (password `Ghaus-demo-2026`): `owner@ghaus.test` (Owner, needs TOTP: the secret is printed
by the seed and saved to `.demo-credentials.json`; add it to any authenticator app),
`sana@ghaus.test` (Senior Associate, reviewer), `bilal@ghaus.test` and `hira@ghaus.test`
(Associates), `usman@ghaus.test` (Clerk).

## Tests

```bash
npm test             # unit tests: tax year, CNIC, PKR lakh/crore, dates, pipeline, wealth, deadlines
npm run test:db      # pgTAP: tenancy, permissions, 2FA gate, review gate, auto-tasks, deadlines, audit
npm run test:e2e     # Playwright against the running app (re-run db:reset + seed:demo first)
npm run typecheck && npm run lint && npm run build
```

## Deploy (Supabase + Vercel)

1. Create a Supabase project. Then, from `ghaus/`: `npx supabase link --project-ref <ref>` and
   `npx supabase db push` to apply the migrations.
2. In Supabase → Authentication: enable **TOTP** under Multi-Factor; turn **off** public sign-ups
   unless you want other firms to create accounts; set the Site URL to the Vercel URL.
3. Create the first firm: either set `ALLOW_FIRM_SIGNUP=true` temporarily and sign up at `/signup`
   (you become Owner and must enrol 2FA), then set it back to `false`.
4. Vercel: import the repo, set **Root Directory** to `ghaus`, and add the environment variables from
   `.env.example` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `ALLOW_FIRM_SIGNUP=false`).
5. Add staff under Settings → Users. Review Settings → Deadlines and Notice sections first: the
   seeded dates are defaults, **verify against current law**.

The repository root holds an unrelated static site; its Vercel project is unaffected.
