@AGENTS.md

# Ghaus & Company — working conventions

Practice-management app for a Pakistani tax law firm, built by Float AI. It is the system of record
and workflow layer around FBR's IRIS portal. **It does not file returns.** Read `docs/ARCHITECTURE.md`
for the schema and phase plan before changing anything structural.

This app lives in `ghaus/` inside the `float` repo; the repo root is an unrelated static site. Run every
command from `ghaus/`.

## Commands

```bash
npm run db:start      # local Supabase (Docker); pulls images from Docker Hub
npm run db:reset      # re-apply all migrations from scratch
npm run db:types      # regenerate src/types/database.ts after any schema change
npm run test:db       # pgTAP tests in supabase/tests
npm test              # vitest unit tests (src/**/*.test.ts)
npm run typecheck && npm run lint
npm run seed:demo     # demo firm, staff, clients (needs .env.local with service-role key)
npm run dev           # http://localhost:3000
npm run test:e2e      # Playwright smoke tests (app + local Supabase must be running, demo seeded)
```

## Non-negotiables

1. **Multi-tenant**: every business table has `firm_id`. Isolation is enforced by RLS
   (`firm_id = app.firm_id()`), never only by app code. `firm_id` defaults from the session — do not
   pass it from the client. New tables must: add `firm_id`, standard audit columns, the `touch` and
   `audit` triggers, a cross-firm `check_firm_refs` trigger for every FK, RLS policies, and a pgTAP test.
2. **Soft delete only**: set `deleted_at`. App users have no DELETE privilege. Every query of a
   soft-deletable table filters `deleted_at is null` (views already do).
3. **Optimistic locking**: every update of an existing record sends the `updated_at` the user loaded
   (`.eq('updated_at', expected)`). Zero rows updated = conflict → show the conflict dialog, never
   silently overwrite. Use `updateWithLock()` in `src/server/actions/_lib.ts`.
4. **Audit**: the `audit` trigger logs every write. Explicit events (credential reveal, export) go
   through `log_event()`. Never write secrets or credentials to logs, console, errors or the activity log.
5. **Deadlines are data**: due dates come from `deadline_rules` / `deadline_overrides` via SQL
   (`return_due_date`, `appeal_limitation_date`, `v_client_tax_years.filing_due_date`). Never hard-code
   a date or day count in TypeScript.
6. **Review gate lives in the database** (triggers). The UI explains it; it does not implement it.
7. **Service-role key** (`src/lib/supabase/admin.ts`, `server-only`) is used only for: creating auth
   users, and (Phase 3) reading credential ciphertext after the caller's permission + aal2 is checked.
   Everything else runs as the signed-in user so RLS applies.
8. **2FA**: owner and anyone with vault access must have TOTP; the database hides all data from them
   until the session is `aal2`. The `(app)` layout routes them to `/mfa`.
9. **AI (Phase 4)** never writes on its own: extract → show → user confirms → write.

## Code conventions

- Server Components fetch with `createClient()` from `@/lib/supabase/server`; mutations are Server
  Actions in `src/server/actions/<module>.ts` returning `ActionResult` (`{ ok: true, data }` or
  `{ ok: false, error, conflict? }`); they validate input with zod and call `revalidatePath`.
- Permission checks in the UI use `ctx.can(module, 'view'|'edit')` from `getContext()` — this is for
  hiding controls only; RLS is the real check.
- Pure domain logic (tax year, CNIC, money, dates, pipeline labels, wealth) lives in `src/lib/domain`
  with vitest tests next to it. Keep it free of React and Supabase imports.
- Next.js 16: `params`, `searchParams`, `cookies()` are async; middleware is `src/proxy.ts`.
- UI: shadcn/ui primitives in `src/components/ui` (vendored by hand; the shadcn registry is blocked
  in the build sandbox). Prefer composing these over new primitives. Lucide icons.
- Tables/enums use snake_case in SQL; TypeScript uses the generated `Database` types
  (`Tables<'clients'>`, `Enums<'return_status'>` from `@/types/db`).

## Pakistan formats

- Money: PKR only. `formatPKR()` honours the user's lakh/crore vs international grouping
  (`12,34,56,789` vs `123,456,789`). Store as `numeric(16,2)`.
- Dates: display `DD-MM-YYYY` (`formatDate()`); store ISO dates. "Today" is Asia/Karachi.
- Tax year label: `TY2026 (Jul 2025–Jun 2026)` (`taxYearLabel()`). TY N = 1 July N-1 to 30 June N.
- CNIC: `12345-1234567-1` (validated in DB and zod). NTN/STRN are free-form digits/dashes.

## Legal content

Seeded deadlines, notice windows, ATL surcharges and s.114C thresholds are defaults, not legal advice.
Settings screens show "Verify against current law before relying on these." Section 114C is
feature-flagged OFF (`firms.s114c_enabled`) until notified.

## Environment

`.env.local` (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `CREDENTIALS_ENCRYPTION_KEY` (32 bytes, base64; Phase 3),
`ANTHROPIC_API_KEY` (Phase 4). Never commit real keys.
