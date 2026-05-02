# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # dev server at localhost:3000
npm run build        # production build
npm run preview      # preview production build

npm run db:push      # sync schema to DB (dev, no migration files)
npm run db:migrate   # apply migration files (prod)
npm run db:generate  # generate migration files from schema changes
npm run db:seed      # populate DB with initial data
npm run db:studio    # Drizzle Studio GUI at localhost:4983
```

First-time setup: copy `.env.example` → `.env`, set `DATABASE_URL`, then `db:push` → `db:seed`.

## Architecture

**Nuxt 3** with server-side rendering. Pages fetch data from Nuxt server API routes (`/api/*`) which query PostgreSQL via Drizzle ORM. No Pinia or other state library — `useFetch` directly in pages.

### Data flow

```
Page (useFetch) → /api/<resource>/index.get.ts → useDb() → PostgreSQL
```

`useDb()` in `server/db/index.ts` is a singleton that reads `DATABASE_URL` from `useRuntimeConfig().databaseUrl` (set via env). All schema is in `server/db/schema/`, re-exported from `index.ts`.

### Pages and their data sources

| Page | API | Notes |
|------|-----|-------|
| `/` | `/api/workers` | Rest of content is static in the page |
| `/services` | `/api/services` | Returns `{ categories, notes }` |
| `/gallery` | `/api/gallery` | Sections with nested images |
| `/about` | — | Fully static |
| `/shop` | — | Stub, not yet built |

### Styling

Tailwind CSS with two custom tokens: `brand` (`rgb(0,186,250)`) and `brand-dark`. Global component classes defined in `assets/css/main.css`: `.btn-primary`, `.section-title`, `.section-header`. Font: Inter (Google Fonts, loaded in `nuxt.config.ts`).

### DB schema

- `service_categories` → `service_items` (cascade delete) + `service_notes` — price list
- `workers` — team members with photo paths (served from `public/images/`)
- `gallery_sections` → `gallery_images` (cascade delete) — gallery; images are added manually, no upload UI
- `site_settings` — key-value pairs: `phone`, `phone_href`, `email`, `address`, `map_embed_url`, `legal_name`, `inn`, `working_hours` (JSON string)

The `site_settings` table stores `working_hours` as a JSON string; parse it with `JSON.parse()` when using.
