# SMM Panel

Multi-tenant SMM (social media marketing) panel. Four independent applications in
one npm-workspaces monorepo:

| App | Package | Local dev | Production |
| --- | --- | --- | --- |
| User panel | `@smm/user` | http://localhost:3000 | https://smmpanel.vercel.app |
| Admin panel | `@smm/admin` | http://localhost:3001 | https://admin.smmpanel.vercel.app |
| Super Admin panel | `@smm/super-admin` | http://localhost:3002 | https://super.smmpanel.vercel.app |
| API (Express + MongoDB) | `@smm/api` | http://localhost:4000 | https://api.smmpanel.vercel.app |

## Local development

```bash
npm install
cp .env.example .env.local   # fill in real values (see .env.example comments)
npm run dev                  # syncs env vars, then starts all four apps (turbo)
```

Individual apps:

```bash
npm run env:sync             # regenerate apps/*/.env.local from the root env
npm run dev:user             # user panel on :3000
npm run dev:admin            # admin panel on :3001
npm run dev:super-admin      # super admin panel on :3002
npm run dev:api              # API on :4000
```

The root `.env` / `.env.local` is the single source of configuration.
`scripts/sync-env.mjs` copies only non-secret `NEXT_PUBLIC_*`, `API_BASE_URL` and
`ROOT_DOMAIN` into each app — secrets never reach the apps or the browser.

## Checks

```bash
npm run typecheck   # tsc --noEmit across all workspaces
npm run lint        # eslint across all workspaces
npm run test        # vitest (API suite, incl. role separation)
npm run build       # production build of all four apps
```

## Architecture overview

- Every request from a panel to the API goes to `NEXT_PUBLIC_API_URL`
  (e.g. `https://api.smmpanel.vercel.app`) + `/api/v1/...`.
- Roles (user / admin / super-admin) are hard-separated with scoped session
  cookies (`smm_us_*`, `smm_ad_*`, `smm_sa_*`) enforced server-side.
- Admin panels are multi-tenant: each admin is served from its own subdomain
  (see `apps/admin/src/proxy.ts` and the API `/api/v1/tenant/resolve`).
- Google OAuth is available on the User panel only and runs entirely through the
  API so the client secret never reaches the browser.

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the per-project Vercel Root Directories,
environment variables, domain routing, cookies/CORS and the verification checklist.