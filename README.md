# Movie Recommender

## Repository Layout

```text
movie-recommender/
├── app/               # Nuxt 4 full-stack app (primary codebase)
│   ├── app/           # Client code (pages, components, composables)
│   └── server/        # Server code (API routes, utils)
└── docs/              # Docus documentation site (separate Nuxt app)
```

## Overview

Movie Recommender is a Nuxt 4 full-stack app backed by Supabase, TMDB, hCaptcha, and Upstash Redis.

The current recommendation flow is provider-agnostic:

- watched history and My List are stored in Supabase
- `GET /api/recommend` builds a taste profile from that data
- the server calls one or more configured AI providers through `app/server/utils/ai-client.ts`
- AI candidates are resolved back to TMDB IDs and filtered server-side before caching

The docs site lives in `docs/` and is a separate Nuxt app.

## Setup

### 1. Environment variables

```bash
cd app
cp .env.example .env
```

| Variable | Source | Required |
|---|---|---|
| `NUXT_TMDB_API_KEY` | [TMDB API](https://www.themoviedb.org/settings/api) | Yes |
| `NUXT_GOOGLE_API_KEY` | [Google AI Studio](https://ai.google.dev) | Yes, unless OpenRouter is configured |
| `NUXT_GOOGLE_MODELS` | App config | No |
| `NUXT_OPENROUTER_API_KEY` | [OpenRouter](https://openrouter.ai/) | Yes, unless Google AI Studio is configured |
| `NUXT_OPENROUTER_MODELS` | App config | No |
| `NUXT_PUBLIC_SUPABASE_URL` | [Supabase Project Settings](https://supabase.com) | Yes |
| `NUXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Project Settings | Yes |
| `NUXT_SUPABASE_SERVICE_ROLE_KEY` | Supabase Project Settings | Yes |
| `NUXT_PUBLIC_HCAPTCHA_SITE_KEY` | hCaptcha Dashboard | Yes |
| `NUXT_HCAPTCHA_SECRET` | hCaptcha Dashboard | Yes |
| `ADMIN_API_TOKEN` | `openssl rand -hex 32` | Yes |
| `UPSTASH_REDIS_REST_URL` | Upstash Console | Yes |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Console | Yes |

At least one AI provider must be configured for recommendations to work. If both are configured, the server tries Google models first and then OpenRouter models.

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

### 4. Verify

```bash
cd app
npm run typecheck
npm run test
npm run lint
```

## Key locations

| What | Where |
|---|---|
| Pages | `app/app/pages/` |
| Components | `app/app/components/` |
| Composables | `app/app/composables/` |
| API routes | `app/server/api/` |
| Server utilities | `app/server/utils/` |
| Tests | `app/test/` |
| Docs site | `docs/` |

## API endpoints

| Endpoint | Auth | Description |
|---|---|---|
| `GET /api/movies/search` | No | TMDB-backed search for the search page |
| `GET /api/movies/popular` | No | Cached TMDB popular feed |
| `GET /api/movies/[id]` | No | Movie details with Supabase-backed caching |
| `GET /api/recommend` | Yes | Cached AI recommendations resolved to TMDB IDs |
| `GET /api/recommend/quota` | Yes | Remaining daily recommendation quota |
| `POST /api/auth/signup` | No | Server-side signup with hCaptcha validation |
| `GET\|POST\|DELETE /api/watched` | Yes | Watched history |
| `GET\|POST\|DELETE /api/mylist` | Yes | Saved movie list |
| `POST /api/admin/tmdb-import` | Admin token | Trigger TMDB import |

## Recommendation Notes

- The recommendation cache lives in Supabase table `recommendations`
- Cache entries are keyed by user and watched-history hash, with a 7-day TTL
- `?refresh=true` forces regeneration
- `?getNew=true` excludes the previous cached set from the next generation round
- Successful `/api/recommend` responses return TMDB IDs only; the frontend hydrates details separately

## Docs

To run the docs site locally:

```bash
cd docs
npm install
npm run dev
```
