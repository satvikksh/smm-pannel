# SMM Panel — Deployment

This monorepo ships **four independent applications** to **Vercel** plus a shared
MongoDB. Each application is its own Vercel project with its own Root Directory,
env vars and domain. There is no "one server running everything".

## Architecture

| App | Package | Root Directory | Local dev | Production URL |
| --- | --- | --- | --- | --- |
| User panel | `@smm/user` | `apps/user` | `next dev --port 3000` | `https://smmpanel.vercel.app` |
| Admin panel | `@smm/admin` | `apps/admin` | `next dev --port 3001` | `https://admin.smmpanel.vercel.app` |
| Super Admin panel | `@smm/super-admin` | `apps/super-admin` | `next dev --port 3002` | `https://super.smmpanel.vercel.app` |
| API | `@smm/api` | `apps/api` | `tsx watch src/index.ts` (:4000) | `https://api.smmpanel.vercel.app` |

All requests to the API go to `NEXT_PUBLIC_API_URL` (a build-time, browser-visible
*non-secret* string) `/api/v1/...`. Cookies carry the sessions (`HttpOnly`);
secrets never reach the browser.

## One-time prerequisites

1. **Vercel** — a Vercel account with the GitHub repository connected.
2. **MongoDB Atlas** — a cluster + a database user; copy the connection string.
3. **Google Cloud Console** (User panel Google login, optional) — an OAuth client
   whose **Authorized redirect URI** is exactly:
   `https://api.smmpanel.vercel.app/api/auth/google/callback`
4. A local MongoDB (only for local development; `mongodb://127.0.0.1:27017/smm_panel`).

## Deploying

### 1. Create four Vercel projects

Create one Vercel project per app, each pointing at this repository. For **each**
project set:

- **Root Directory** — one of `apps/user`, `apps/admin`, `apps/super-admin`, `apps/api`.
- **Framework Preset** — `Next.js` for the three panels; `Other` for `apps/api`.
- **Build Command** — leave at the default (`npm run build`). The API's `build`
  script type-checks the code; the actual Lambda is created by `apps/api/vercel.json`.
- **Install Command** — leave default. Vercel detects the npm workspaces at the
  repo root and runs `npm install` once per deployment.

Each app carries its own `vercel.json` so the config is explicit and versioned.
The Next panels use `"framework": "nextjs"`; the API uses `@vercel/node` with a
catch-all route to `api/index.ts`.

### 2. Domain routing (Vercel dashboard → Project → Domains)

The production URLs are Vercel-hosted subdomains of your Vercel team:

- `smmpanel.vercel.app` → User project
- `admin.smmpanel.vercel.app` → Admin project
- `super.smmpanel.vercel.app` → Super Admin project
- `api.smmpanel.vercel.app` → API project

To use your own domain (recommended for Admin tenants), add it as a custom domain
per project and point its DNS (see Vercel's per-project instructions). For per-admin
tenant subdomains set `ROOT_DOMAIN` (server) and `NEXT_PUBLIC_ROOT_DOMAIN` (browser)
to the shared base — e.g. `smmpannel.com` — so `ram-kumar.smmpannel.com` resolves.

> ⚠️ Custom domains change the CORS/site topology. Re-check §6 before/after adding them.

### 3. Environment variables

Each panel project reads only `NEXT_PUBLIC_*` (`process.env.NEXT_PUBLIC_API_URL` is
inlined at build time). The API project reads everything server-side.

| Variable | User | Admin | Super Admin | API | Notes |
| --- | --- | --- | --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | ✅ | ✅ | ✅ | – | `https://api.smmpanel.vercel.app` (no `/api/v1`; panels append it) |
| `NEXT_PUBLIC_USER_APP_URL` | – | – | – | ✅ | `https://smmpanel.vercel.app` |
| `NEXT_PUBLIC_ADMIN_APP_URL` | – | – | – | ✅ | `https://admin.smmpanel.vercel.app` |
| `NEXT_PUBLIC_SUPER_ADMIN_APP_URL` | – | – | – | ✅ | `https://super.smmpanel.vercel.app` |
| `NEXT_PUBLIC_ROOT_DOMAIN` | – | ✅ | – | – | `localhost` in dev; your base domain in prod |
| `ROOT_DOMAIN` | – | ✅ | – | ✅ | server-side alias of the above |
| `API_BASE_URL` | – | ✅ | – | – | server-side API origin for the Admin tenant proxy |
| `API_CORS_ORIGINS` | – | – | – | ✅ | optional extra origins (comma-separated) |
| `MONGODB_URI` | – | – | – | ✅ | Atlas connection string |
| `JWT_ACCESS_SECRET` | – | – | – | ✅ | ≥ 32 random chars |
| `JWT_REFRESH_SECRET` | – | – | – | ✅ | ≥ 32 random chars |
| `JWT_ACCESS_TTL` | – | – | – | ✅ | e.g. `15m` |
| `JWT_REFRESH_TTL_DAYS` | – | – | – | ✅ | e.g. `30` |
| `COOKIE_SECRET` | – | – | – | ✅ | ≥ 32 random chars |
| `SUPER_ADMIN_EMAIL` | – | – | – | ✅ | seeded once, idempotent |
| `SUPER_ADMIN_PASSWORD` | – | – | – | ✅ | ≥ 8 chars; sets the Super Admin password |
| `GOOGLE_CLIENT_ID` | – | – | – | ✅ | Google OAuth (User panel) |
| `GOOGLE_CLIENT_SECRET` | – | – | – | ✅ | Google OAuth (User panel) |
| `GOOGLE_REDIRECT_URI` | – | – | – | ✅ | `https://api.smmpanel.vercel.app/api/auth/google/callback` |

Rules that keep this safe:

- **No secrets in `NEXT_PUBLIC_*`.** Anything prefixed `NEXT_PUBLIC_` is inlined
  into the browser bundle. Secrets live only in the API project (server-side).
- Every panel reads its API origin from `NEXT_PUBLIC_API_URL`. It is not read
  during static prerendering — builds succeed even before the variable is wired
  in — but the **first API request** made without it fails loudly with
  instructions. Configure it in each panel project (Vercel → *panel* project →
  Settings → Environment Variables), e.g. for the Super Admin panel:

  ```
  NEXT_PUBLIC_API_URL=https://api.smmpanel.vercel.app
  ```

  (User and Admin panels use the same value; the API project does not need it.
  Secrets are never pre-fixed `NEXT_PUBLIC_` and never end up there.)
- The API project must always know the three panel origins (always included in the
  CORS allow-list regardless of env, then overridden/extended by the env values).

### 4. Deploy order

1. **API** first (the panels and tenants depend on it).
2. **User** panel.
3. **Super Admin** panel.
4. **Admin** panel.

Ticket each deployment in the Vercel dashboard; smoke-test after each (§8).

## Local development (unchanged)

```bash
npm install
cp .env.example .env.local   # fill in real values
npm run dev                  # runs env:sync + all four apps via turbo
```

The four apps listen on :3000 (user), :3001 (admin), :3002 (super-admin),
:4000 (api). `npm run env:sync` regenerates each app's `.env.local` from the root
`.env[.local]` — it copies only `NEXT_PUBLIC_*`, `API_BASE_URL` and `ROOT_DOMAIN`;
secrets never land in the apps.

## Auth topology & cookies

- Roles are **hard-separated** by session cookie name (`smm_us_*`, `smm_ad_*`,
  `smm_sa_*`) and enforced server-side per route. A user session cannot reach admin
  or super-admin endpoints; an admin session cannot reach super-admin endpoints.
- Google OAuth is **User panel only** and runs entirely through the API
  (`/api/auth/google`); the client secret never reaches the browser.
- `SUPER_ADMIN_EMAIL/PASSWORD` authenticate only on the Super Admin project.
- **Production**: set-cookie uses `Secure; SameSite=None` so the browser sends the
  cookies to `api.smmpanel.vercel.app` from any sibling panel. Development stays
  `SameSite=Lax` over http://localhost.
- The Google OAuth state/redirect cookies use the same `Secure` policy and are
  scoped to `/api/auth` on the API origin.

## CORS allow-list (API)

The API accepts requests with credentials from an explicit allow-list — no
wildcard:

- `https://smmpanel.vercel.app`, `https://admin.smmpanel.vercel.app`,
  `https://super.smmpanel.vercel.app` (always enabled)
- `http://localhost:3000/3001/3002` and `http://127.0.0.1:3000/3001/3002` (dev)
- Any origin from `API_CORS_ORIGINS` (optional extras)
- Any subdomain of `NEXT_PUBLIC_ROOT_DOMAIN`/`ROOT_DOMAIN` (per-admin tenants)

## Verification

Verified locally (must stay green):

- [x] `npm run typecheck` — 10/10 tasks
- [x] `npm run lint` — 10/10 tasks
- [x] `npm run test` — 13/13 tasks, 80/80 API tests (incl. role separation)
- [x] `npm run build` — 4/4 apps
- [x] CORS live check: prod origin allowed + credentials, localhost allowed,
      unknown origin rejected
- [x] Serverless handler smoke test: DB connect, super-admin seed (idempotent),
      `/health`, `/api/v1/settings/public`, Google OAuth 302
- [x] No production code path depends on `localhost:*` / `127.0.0.1:*` (verified by
      grep sweep; remaining occurrences are dev-only fallbacks, tests and the CORS
      dev allow-list)

Requires the Vercel dashboard / live network (run these yourself after deploying
and mark UNVERIFIED below):

- [ ] The four production URLs answer 200 inside their domains
- [ ] `https://api.smmpanel.vercel.app/health` → `{"status":"ok",...}`
- [ ] User login/register hits `https://api.smmpanel.vercel.app/api/v1` (check the
      browser network tab; cookie domain is `api.smmpanel.vercel.app`)
- [ ] Google login round-trip completes (redirect URI authorised in Google console)
- [ ] Super Admin login at `https://super.smmpanel.vercel.app`
- [ ] Admin tenant resolution on `https://admin.smmpanel.vercel.app`
- [ ] Sealed secrets: `SUPER_ADMIN_PASSWORD`/`JWT_*` never re-appear in the panel apps
- [ ] Custom domains (if used) still pass CORS — adjust `API_CORS_ORIGINS`/app URLs
- [ ] MongoDB Atlas network access allows Vercel function IPs (or the cluster is
      open to Vercel egress via your firewall rules)

## Rollback

Vercel keeps every deployment. On a bad release, Settings → Deployments → promote
the previous immutable deployment. The API is stateless (sessions live in MongoDB
`Session` documents), so a revert is immediate — users just re-login if their
refresh token was rotated across the split.