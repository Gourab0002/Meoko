# Nyaa-Api-Ts

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/Yash-Garg/Nyaa-Api-Ts)

This API is an **Unofficial Nyaa API** rewritten in Typescript.

Previous Go API - [Yash-Garg/Nyaa-Api-Go](https://github.com/Yash-Garg/Nyaa-Api-Go)

## Usage

- `username` and `id` are required parameters if using `/user/{username}` and `/id/{id}` endpoints.

- If no parameters are specified in other endpoints like `/anime`, `/manga`, etc. It will return the latest uploaded torrents in the respective category.

- For Filters, input `filter=1` for _No Remakes_ and `filter=2` for _Trusted Only_.

- #### Available Endpoints

  | **Arguments**      | **Description**                                       |
  | ------------------ | ----------------------------------------------------- |
  | `q` **(Optional)** | Search query.                                         |
  | `s` **(Optional)** | Sorting parameter                                     |
  | `p` **(Optional)** | Page number                                           |
  | `f` **(Optional)** | Filter option                                         |
  | `o` **(Optional)** | Order of sorting. Defaults to **_Descending order_**. |

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
    | ID | `/id` |
    | User | `/user` |

  - **Sub-Categories** (Not applicable for `/user` and `/id`)
    | **Category** | **Sub-Category** |
    |------|------|
    | Anime | `/amv`, `/eng`, `/non-eng`, `/raw` |
    | Manga | `/eng`, `/non-eng`, `/raw` |
    | Audio | `/lossy`, `/lossless` |
    | Pictures | `/photos`, `/graphics` |
    | Live Action | `/promo`, `/eng`, `/non-eng`, `/raw` |
    | Software | `/application`, `/games` |

  - **Sorting Parameters**
    | **Arguments** | **Methods** |
    | ---- | ---- |
    | Sort | `size`, `seeders`, `leechers`, `date`, `downloads` |
    | Order | `asc`, `desc` |

- #### Search using ID

  - `https://nyaa-api-ts.yashg.workers.dev/id/{id}`

- #### Search using category

  - `https://nyaa-api-ts.yashg.workers.dev/{category}?q={search_query}`
  - `https://nyaa-api-ts.yashg.workers.dev/{category}?q={search_query}&s={sorting_parameter}`
  - `https://nyaa-api-ts.yashg.workers.dev/{category}?q={search_query}&s={sorting_parameter}&p={page_number}`
  - `https://nyaa-api-ts.yashg.workers.dev/{category}?q={search_query}&s={sorting_parameter}&p={page_number}&o={order}`
  - `https://nyaa-api-ts.yashg.workers.dev/{category}?q={search_query}&s={sorting_parameter}&p={page_number}&o={order}&f={filter}`

- #### Search using sub category

  - `https://nyaa-api-ts.yashg.workers.dev/{category}/{sub_category}?q={search_query}`
  - `https://nyaa-api-ts.yashg.workers.dev/{category}/{sub_category}?q={search_query}&s={sorting_parameter}`
  - `https://nyaa-api-ts.yashg.workers.dev/{category}/{sub_category}?q={search_query}&s={sorting_parameter}&p={page_number}`
  - `https://nyaa-api-ts.yashg.workers.dev/{category}/{sub_category}?q={search_query}&s={sorting_parameter}&p={page_number}&o={order}`
  - `https://nyaa-api-ts.yashg.workers.dev/{category}/{sub_category}?q={search_query}&s={sorting_parameter}&p={page_number}&o={order}&f={filter}`

- #### Search using username
  - `https://nyaa-api-ts.yashg.workers.dev/user/{username}`
  - `https://nyaa-api-ts.yashg.workers.dev/user/{username}?q={search_query}`
  - `https://nyaa-api-ts.yashg.workers.dev/user/{username}?q={search_query}&s={sorting_parameter}`
  - `https://nyaa-api-ts.yashg.workers.dev/user/{username}?q={search_query}&s={sorting_parameter}&p={page_number}`
  - `https://nyaa-api-ts.yashg.workers.dev/user/{username}?q={search_query}&s={sorting_parameter}&p={page_number}&o={order}`
  - `https://nyaa-api-ts.yashg.workers.dev/user/{username}?q={search_query}&s={sorting_parameter}&p={page_number}&o={order}&f={filter}`

## Changelog

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

#### Minor
- **Missing semicolon in `scrapers.ts`** -- Added missing semicolon after `const fileId = Number(url.split("/")[4])`.
