# Movie Recommender

## Repository Layout

```text
movie-recommender/
├── app/               # Nuxt 4 full-stack app (primary codebase)
│   ├── app/           # Client code (pages, components, composables)
│   └── server/        # Server code (API routes, utils)
├── database/          # local.db (LibSQL/SQLite) + schema.sql
└── docs/              # Docus documentation site (separate Nuxt app)
```

## Setup

### 1. Environment variables

```bash
cd app
cp .env.example .env
```

| Variable | Source | Required |
|---|---|---|
| `NUXT_TMDB_API_KEY` | [TMDB API](https://www.themoviedb.org/settings/api) | Yes |
| `NUXT_GEMINI_API_KEY` | [Google AI Studio](https://ai.google.dev) | Yes |
| `NUXT_LIBSQL_URL` | Local: `file:../database/local.db` or Turso | Yes |
| `NUXT_LIBSQL_AUTH_TOKEN` | Turso (if using remote) | No |
| `NUXT_PUBLIC_SUPABASE_URL` | [Supabase Project Settings](https://supabase.com) | Yes |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings | Yes |
| `ADMIN_API_TOKEN` | `openssl rand -hex 32` | Yes |
| `UPSTASH_REDIS_REST_URL` | Upstash Console | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console | Yes |

### 2. Run

```bash
cd app
npm run dev      # http://localhost:3000
```

### 3. Seed the local movie database

On first run the SQLite database is empty. Trigger a TMDB import manually:

```bash
curl -X POST http://localhost:3000/api/admin/tmdb-import \
  -H "x-admin-token: <ADMIN_API_TOKEN>"
```

In production, scheduled imports should be triggered from GitHub Actions by calling the same admin API endpoint.

## Key locations

| What | Where |
|---|---|
| Pages | `app/app/pages/` |
| Components | `app/app/components/` |
| Composables | `app/app/composables/` |
| API routes | `app/server/api/` |
| Server utilities | `app/server/utils/` |
| DB schema | `database/schema.sql` |
| Docs site | `docs/` |

## API endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /api/movies/search` | No | Full-text search over local TMDB index |
| `GET /api/tmdb/[...path]` | No | TMDB API proxy |
| `GET /api/movies/[id]` | No | Movie details from TMDB |
| `GET\|POST /api/watched` | Yes | Watched history |
| `POST /api/gemini/recommend` | Yes | AI recommendations via Gemini |
| `POST /api/admin/tmdb-import` | Admin token | Trigger TMDB import |

## Typecheck & lint

```bash
cd app
npx nuxt typecheck
npx eslint .
```
