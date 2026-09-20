# LessonMart Marketplace

LessonMart is a responsive Nigerian marketplace for buying and selling lesson notes, exam preparation, and classroom resources.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/lessonmart/src/App.tsx` — storefront, product detail, cart, checkout handoff, seller workspace, and admin workspace
- `artifacts/lessonmart/src/index.css` — LessonMart visual tokens and responsive styling
- `artifacts/api-server/src/routes/marketplace.ts` — typed marketplace endpoints and demo catalog data
- `lib/api-spec/openapi.yaml` — source of truth for marketplace API contracts
- `lib/api-client-react/src/generated/` — generated React Query hooks and types

## Architecture decisions

- Marketplace contracts are defined OpenAPI-first and generated into the shared React client and Zod schemas.
- The first build uses a typed in-memory API catalog so browsing, seller uploads, orders, and dashboards work without requiring third-party keys.
- The frontend keeps demo fallbacks so the marketplace remains usable while external services are not configured.
- Completed demo orders generate a watermarked PDF locally with `pdf-lib`; production checkout can replace the demo handoff.

## Product

- Browse, search, and filter 18 Nigerian education resources.
- Open accessible product details, add a resource to the bag, and complete a demo checkout handoff.
- Generate a buyer-specific watermarked PDF download after checkout.
- Review seller earnings, available payouts, product uploads, marketing actions, and admin marketplace KPIs.

## User preferences

- Use Nigerian naira, Nigerian education terminology, and realistic local seller names.

## Gotchas

- The frontend Vite build requires workflow-provided `PORT` and `BASE_PATH`; use the managed web workflow or set both explicitly for a shell build.
- Supabase and Paystack keys were not provided, so the current app makes the production integration points explicit and runs safely in demo mode.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
