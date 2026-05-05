# Movie Recommender

## Repository Layout

```text
movie-recommender/
├── app/               # Nuxt 4 full-stack app (primary codebase)
│   ├── app/           # Client code (pages, components, composables)
│   └── server/        # Server code (API routes, utils)
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
| `NUXT_PUBLIC_SUPABASE_URL` | [Supabase Project Settings](https://supabase.com) | Yes |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings | Yes |
| `NUXT_SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings | Yes |
| `NUXT_PUBLIC_HCAPTCHA_SITE_KEY` | hCaptcha Dashboard | Yes |
| `ADMIN_API_TOKEN` | `openssl rand -hex 32` | Yes |
| `UPSTASH_REDIS_REST_URL` | Upstash Console | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console | Yes |

### 2. Run

```bash
cd app
npm run dev      # http://localhost:3000
```

### 3. Import the TMDB movie corpus

The app uses Supabase for imported movie records, cached movie details, watched history, My List, and cached recommendations. Trigger a TMDB import manually when you need to populate or refresh the `movies` table:

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
| Docs site | `docs/` |

## API endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /api/movies/search` | No | TMDB-backed search for the search page |
| `GET /api/movies/[id]` | No | Movie details with Supabase-backed caching |
| `GET /api/recommend` | Yes | Cached AI recommendations via Gemini |
| `GET\|POST /api/watched` | Yes | Watched history |
| `GET\|POST\|DELETE /api/mylist` | Yes | Saved movie list |
| `POST /api/admin/tmdb-import` | Admin token | Trigger TMDB import |

## Typecheck & lint

```bash
cd app
npm run typecheck
npm run lint
```
