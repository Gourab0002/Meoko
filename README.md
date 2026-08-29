# Meoko — Unofficial Nyaa API

A fast, type-safe **Unofficial Nyaa torrent API** built with TypeScript, [Hono](https://hono.dev/), and deployed on **Cloudflare Workers** or **Deno Deploy**.

> Inspired by [Yash-Garg/Nyaa-Api-Go](https://github.com/Yash-Garg/Nyaa-Api-Go) — this is a full TypeScript rewrite with extended capabilities and bug fixes.

## Capabilities

- 🔍 **Full-text search** across all Nyaa categories using flexible query parameters
- 📂 **Category & sub-category browsing** — Anime, Manga, Audio, Pictures, Live Action, Software
- 🧑 **User uploads** — fetch torrents uploaded by a specific Nyaa user, optionally filtered by category
- 🆔 **Lookup by ID or info hash** — detailed torrent info, file list, comments, and trackers
- 🔃 **Sorting & filtering** — sort by size, seeders, leechers, date, downloads, or comments; filter out remakes or show trusted-only
- 🏷️ **Trusted / remake / hidden flags**, comment counts, category IDs, Unix timestamps, and size in bytes on every listing row
- 📄 **Pagination** — `p` query, `X-Page` / `X-Has-Next` headers, and an optional JSON envelope
- 📡 **RSS as JSON** — Nyaa’s native RSS feed, including trusted/remake and info hash
- 🌐 **CORS-enabled** — ready for use from any browser or frontend application
- ⚡ **Edge-deployed** — runs on Cloudflare Workers or Deno Deploy for low-latency responses worldwide
- 🛡️ **Null-safe scraping** — hardened against missing DOM elements, magnet-only rows, and unexpected Nyaa markup changes
- 🔁 **Mirror fallback** — tries `nyaa.si` first, then `nyaa.land` if the primary host is down or blocked
- 🩺 **Health, categories, and OpenAPI** — `/health`, `/categories`, `/openapi.json`, `/docs`

## Usage

- `username` and `id` are required parameters if using `/user/{username}` and `/id/{id}` endpoints.

- If no parameters are specified in other endpoints like `/anime`, `/manga`, etc. it will return the latest uploaded torrents in the respective category.

- For filters, use `f=1` (or `filter=1`) for _No Remakes_ and `f=2` (or `filter=2`) for _Trusted Only_.

- #### Available Endpoints

  | **Arguments**      | **Description**                                       |
  | ------------------ | ----------------------------------------------------- |
  | `q` **(Optional)** | Search query.                                         |
  | `s` **(Optional)** | Sorting parameter                                     |
  | `p` **(Optional)** | Page number                                           |
  | `f` **(Optional)** | Filter option (`filter` is accepted as an alias)      |
  | `o` **(Optional)** | Order of sorting. Defaults to **_Descending order_**. |
  | `c` **(Optional)** | Category id (`1_2`) or path (`anime/eng`). Used on `/search`, `/rss`, and `/user/{username}`. |
  | `u` **(Optional)** | Uploader filter on `/rss`. |
  | `magnets` **(Optional)** | On `/rss`, prefer magnet links (`m` is accepted as an alias). |
  | `envelope` **(Optional)** | `1` wraps list results as `{ torrents, page, perPage, hasNext, total, origin }`. |
  | `flat` **(Optional)** | `1` forces `/search` to return a raw array. |

  - **Endpoints**
    | **Category** | **Endpoint** |
    |---------|---------|
    | All | `/all` |
    | Anime | `/anime` |
    | Manga | `/manga` |
    | Audio | `/audio` |
    | Pictures | `/pictures` |
    | Live Action | `/live_action` |
    | Software | `/software` |
    | ID | `/id/{id}` |
    | ID files | `/id/{id}/files` |
    | ID comments | `/id/{id}/comments` |
    | ID trackers | `/id/{id}/trackers` |
    | Info hash | `/hash/{hash}` |
    | Batch IDs | `/ids?ids=1,2,3` |
    | User | `/user/{username}` |
    | User profile | `/user/{username}/profile` |
    | Search | `/search` |
    | RSS JSON | `/rss` |
    | Categories | `/categories` |
    | Health | `/health` |
    | OpenAPI | `/openapi.json`, `/docs` |

  - **Sub-Categories** (Not applicable for `/user` and `/id`)
    | **Category** | **Sub-Category** |
    |------|------|
    | Anime | `/amv`, `/eng`, `/non-eng`, `/raw` |
    | Manga | `/eng`, `/non-eng`, `/raw` |
    | Audio | `/lossy`, `/lossless` |
    | Pictures | `/photos`, `/graphics` |
    | Live Action | `/promo`, `/eng`, `/non-eng`, `/raw` |
    | Software | `/application`, `/applications`, `/games` |

  - **Sorting Parameters**
    | **Arguments** | **Methods** |
    | ---- | ---- |
    | Sort | `size`, `seeders`, `leechers`, `date`, `downloads`, `comments` |
    | Order | `asc`, `desc` |

- List endpoints (`/anime`, `/user/{username}`, …) still return a **JSON array** of torrents so existing clients keep working. Pagination is also sent as `X-Page`, `X-Per-Page`, `X-Has-Next`, `X-Total`, and `X-Origin`. Pass `envelope=1` for a wrapped object. `/search` uses the envelope by default.

- Error responses are JSON: `{ "error": "Invalid ID", "status": 400 }`. Unknown subcategories now return **400** instead of silently falling back to the parent category.

- #### Search using ID

  - `/id/{id}`
  - `/id/{id}/files`
  - `/id/{id}/comments`
  - `/id/{id}/trackers`
  - `/hash/{infoHash}`
  - `/ids?ids=1,2,3` (max 10)

- #### Search

  - `/search?q={search_query}`
  - `/search?q={search_query}&c=anime/eng&s=seeders&o=desc&p=2&f=2`
  - `/rss?q={search_query}&c=1_2&f=2&magnets=1`
  - `/rss?u={username}`

- #### Search using category

  - `/{category}?q={search_query}`
  - `/{category}?q={search_query}&s={sorting_parameter}`
  - `/{category}?q={search_query}&s={sorting_parameter}&p={page_number}`
  - `/{category}?q={search_query}&s={sorting_parameter}&p={page_number}&o={order}`
  - `/{category}?q={search_query}&s={sorting_parameter}&p={page_number}&o={order}&f={filter}`

- #### Search using sub category

  - `/{category}/{sub_category}?q={search_query}`
  - `/{category}/{sub_category}?q={search_query}&s={sorting_parameter}`
  - `/{category}/{sub_category}?q={search_query}&s={sorting_parameter}&p={page_number}`
  - `/{category}/{sub_category}?q={search_query}&s={sorting_parameter}&p={page_number}&o={order}`
  - `/{category}/{sub_category}?q={search_query}&s={sorting_parameter}&p={page_number}&o={order}&f={filter}`

- #### Search using username
  - `/user/{username}`
  - `/user/{username}/profile`
  - `/user/{username}?q={search_query}`
  - `/user/{username}?c=anime/eng`
  - `/user/{username}?q={search_query}&s={sorting_parameter}`
  - `/user/{username}?q={search_query}&s={sorting_parameter}&p={page_number}`
  - `/user/{username}?q={search_query}&s={sorting_parameter}&p={page_number}&o={order}`
  - `/user/{username}?q={search_query}&s={sorting_parameter}&p={page_number}&o={order}&f={filter}`

### Listing fields

Each torrent object includes the original fields plus:

| Field | Meaning |
| --- | --- |
| `categoryId` | Nyaa `c=` id (`1_2`) |
| `uploadedTimestamp` | Unix seconds when present on the page |
| `commentCount` | Comment badge on listing rows |
| `sizeBytes` | Parsed size using binary units (`GiB` = 1024³) |
| `infoHash` | From the magnet `xt=urn:btih:` value, or RSS |
| `trusted` | Green / trusted row |
| `remake` | Red / remake row |
| `hidden` | Hidden row |
| `deleted` | Deleted row |

`/id/{id}` also returns `information`, `submitter`, `trackers`, `files`, `fileTree`, `fileListStatus`, comment ids/timestamps/edited/uploader flags, and `origin`.

## Run locally

```bash
# Cloudflare Workers
npm install
npm run dev

# Deno
deno task start
```

```bash
npm test
npm run typecheck
```

## Changelog

### 1.2.0 — Nyaa feature coverage

- **Listing flags and extra fields** — trusted/remake/hidden/deleted, comment count, category id, Unix timestamp, size in bytes, and info hash.
- **Detail pages** — file list (tree + flat), information URL, submitter profile/trusted/anonymous, magnet trackers, richer comments.
- **Pagination** — `X-Page` / `X-Has-Next` headers on every list; `envelope=1` wraps `{ torrents, page, perPage, hasNext, total, origin }`.
- **`/search`** — category-agnostic search; envelope by default (`flat=1` for a raw array). `c` accepts `1_2` or `anime/eng`.
- **`/rss`** — Nyaa RSS parsed to JSON; `magnets=1` (or `m`) prefers magnet links; `u` filters by uploader.
- **`/hash/{hash}`** — 40-char hex or 32-char base32 info-hash lookup.
- **`/ids?ids=`** — batch detail fetch, max 10 ids, per-id success/error.
- **`/id/{id}/files|comments|trackers`** — sub-resources of the view page.
- **User pages** — `c=` category filter; `/user/{username}/profile` for public username/level/upload count.
- **Invalid subcategory** — `/anime/nope` is **400**, not silent fallback to all anime.
- **JSON errors** — `{ "error", "status" }` instead of plain text.
- **`/health`**, **`/categories`**, **`/openapi.json`**, **`/docs`**.
- List endpoints still return a torrent **array** unless `envelope=1` is set.

### Reliability & scrape fixes

- **Cloudflare Workers no longer crash on boot** -- `src/index.ts` now exports the Hono app for Workers and only calls `Deno.serve()` when the Deno runtime is present.
- **Mirror fallback restored** -- requests try `nyaa.si`, then `nyaa.land`, and skip Cloudflare challenge pages instead of returning empty results.
- **Listing scrape no longer depends on brittle column indexes** -- download/magnet links are selected by `href`, and size/date/seeders are read from the last cells so comment columns cannot shift fields.
- **Magnet-only torrents** -- rows without a `.torrent` file now keep the magnet link instead of stuffing it into `file`.
- **Comment timestamps and avatars** -- timestamps come from `small[data-timestamp]`; relative avatar URLs are resolved against the active mirror.
- **Detail pages ignore injected ads** -- info hash is read from `<kbd>`, and Category/Date/Submitter/stats are read by label instead of `nth-child`.
- **Query parameters are encoded** -- `URLSearchParams` is used so searches containing `&` or spaces cannot corrupt the upstream Nyaa URL. Missing `p`/`f` no longer become `NaN`.
- **`filter` is accepted as an alias for `f`**, matching the documented filter names.
- **`/software/application` works** -- the README path is now a real subcategory alias for `applications` (`6_1`).
- **Invalid IDs, usernames, and categories return 400**; upstream failures return 502 instead of a blanket 404.
- **`package-lock.json` matches `package.json`** -- the lockfile still listed `worktop` after the Hono rewrite.
- **CI** -- `npm test` and `tsc --noEmit` run on push/PR.

### Bug Fixes (fix/all-issues)

The following issues were identified and resolved across the codebase:

#### Runtime Crash Prevention
- **Null-safe `.attr()` access in `scrapers.ts`** -- Cheerio's `.attr()` can return `undefined`. All calls now use `?? ""` fallbacks to prevent crashes when DOM elements are missing.
- **Category validation in `utils.ts`** -- `getCategoryID()` now validates that the category and subcategory exist in `NyaaEndpoints` before indexing. Invalid values fall back to `"0_0"` (all categories) instead of crashing.
- **Non-null assertion removed in `scrapers.ts`** -- Replaced the `!` operator on the magnet link `.attr()` call with a safe `?? ""` fallback.

#### Type Safety
- **`NyaaEndpoints` properly typed in `constants.ts`** -- Changed from `Object` (which blocks bracket-notation indexing) to `Record<string, Record<string, string>>`.
- **`QueryParams` fields made required in `models.ts`** -- All fields were marked optional (`?`) but `getSearchParameters()` always provides values. Removed the optional markers to match actual usage and prevent false null-check warnings.

#### Configuration & Project Setup
- **`tsconfig.json` lib expanded** -- Changed from only `ES2021.String` to `ES2021` + `WebWorker`, providing the full set of type definitions needed for a Cloudflare Workers environment.
- **Added `wrangler` to devDependencies in `package.json`** -- The project uses `wrangler.toml` but was missing the `wrangler` CLI as a dependency.
- **Added npm scripts in `package.json`** -- Added `dev` (`wrangler dev`) and `deploy` (`wrangler deploy`) scripts so the project can be run and deployed with standard npm commands.

#### Logic Fixes
- **Fixed identical base/alt URLs in `constants.ts`** -- `NyaaBaseUrl` and `NyaaAltUrl` were both `"https://nyaa.si"`, making the fallback mechanism useless. `NyaaAltUrl` now points to `"https://nyaa.land"`.
- **Removed dead code in `utils.ts`** -- `checkNyaaUrl()` was defined but never called anywhere. Removed to reduce maintenance burden.
- **Fixed URL usage in `routes.ts`** -- Changed from hardcoded `NyaaAltUrl` to `NyaaBaseUrl` so the primary URL is used by default.

#### Deno Deploy Compatibility
- **Added `.ts` extensions to all local imports** -- Deno requires explicit file extensions on relative imports. Updated all `import` statements across `index.ts`, `routes.ts`, `scrapers.ts`, and `utils.ts`.
- **Added `deno.json` configuration** -- Created import map to resolve bare npm specifiers (`worktop`, `cheerio`) to `npm:` prefixed specifiers that Deno understands.
- **Enabled `allowImportingTsExtensions` in `tsconfig.json`** -- Required so TypeScript accepts `.ts` extensions in import paths.

#### Minor
- **Missing semicolon in `scrapers.ts`** -- Added missing semicolon after `const fileId = Number(url.split("/")[4])`.
