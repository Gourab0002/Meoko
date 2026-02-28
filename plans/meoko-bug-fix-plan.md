# Meoko - Bug Fix Plan

## Project Overview

This is a **Nyaa.si torrent site scraper API** built with TypeScript, deployed on Cloudflare Workers using the `worktop` framework. It scrapes torrent listings and file details from Nyaa.si and exposes them via a REST API.

## Identified Issues

### 1. Identical Base and Alt URLs - [`constants.ts`](src/constants.ts:2)

`NyaaBaseUrl` and `NyaaAltUrl` are both set to `"https://nyaa.si"`. The [`checkNyaaUrl()`](src/utils.ts:5) function is designed to fall back to an alternative URL when the primary is down, but this is pointless when both URLs are the same.

**Fix:** Set `NyaaAltUrl` to an actual alternative mirror, e.g. `"https://nyaa.land"` or another known mirror.

---

### 2. `NyaaEndpoints` typed as `Object` - [`constants.ts`](src/constants.ts:7)

The `NyaaEndpoints` property is typed as `Object`, which prevents proper indexing with string keys. This causes TypeScript errors when accessed via `Constants.NyaaEndpoints[c][s]` in [`utils.ts`](src/utils.ts:24).

**Fix:** Type it as `Record<string, Record<string, string>>` so bracket-notation indexing works correctly.

---

### 3. No input validation in `getCategoryID` - [`utils.ts`](src/utils.ts:22)

If an invalid category or subcategory string is passed, `Constants.NyaaEndpoints[c]` returns `undefined`, and then accessing `["all"]` on it causes a runtime crash.

**Fix:** Add validation that `c` exists as a key in `NyaaEndpoints`, and that `s` exists as a sub-key. Return a sensible default like `"0_0"` or throw a descriptive error.

---

### 4. Unsafe `.attr()` access on potentially undefined values - [`scrapers.ts`](src/scrapers.ts:117)

In `scrapeNyaa`, `torrentPath` and `filePath` are assigned from `.attr("href")` which can return `undefined`. Line 121 then calls `torrentPath.split("/")` which would crash at runtime. Similarly, `category` and `magnet` fields can be `undefined` but the `Torrent` interface expects `string`.

**Fix:** Add null/undefined checks or provide fallback defaults using `?? ""`.

---

### 5. Missing semicolon - [`scrapers.ts`](src/scrapers.ts:14)

```typescript
const fileId = Number(url.split("/")[4])  // missing semicolon
```

**Fix:** Add the semicolon.

---

### 6. `checkNyaaUrl()` is never used - [`utils.ts`](src/utils.ts:5)

The function exists to determine which URL to use, but [`routes.ts`](src/routes.ts:6) hardcodes `Constants.NyaaAltUrl` directly instead of calling `checkNyaaUrl()`.

**Fix:** Either integrate `checkNyaaUrl()` into the route handlers or remove the dead code. The simplest approach is to call it once and cache the result, or use it at request time.

---

### 7. Optional fields accessed without null checks - [`routes.ts`](src/routes.ts:29)

`queryParams.query` is typed as optional in the [`QueryParams`](src/models.ts:35) interface, but `.trim()` is called on it directly at line 29 and line 47. If it were ever `undefined`, this would crash.

**Fix:** Either make `query` non-optional in the interface since `getSearchParameters` always provides a value, or add a fallback.

---

### 8. Missing `wrangler` dev dependency - [`package.json`](package.json)

The project uses a `wrangler.toml` config but `wrangler` is not listed in `devDependencies`. It needs to be installed for local dev and deployment.

**Fix:** Add `wrangler` to devDependencies.

---

### 9. Empty `scripts` section - [`package.json`](package.json:6)

No npm scripts are defined. A Cloudflare Workers project should at minimum have `dev` and `deploy` scripts.

**Fix:** Add scripts:
```json
"scripts": {
  "dev": "wrangler dev",
  "deploy": "wrangler deploy"
}
```

---

### 10. Incomplete `tsconfig.json` lib - [`tsconfig.json`](tsconfig.json:5)

The `lib` array only includes `ES2021.String`. This is too minimal for a Cloudflare Workers environment -- it lacks base ES types and web worker types.

**Fix:** Expand to include `ES2021` and `WebWorker`:
```json
"lib": ["ES2021", "WebWorker"]
```

---

### 11. Non-null assertion on magnet link - [`scrapers.ts`](src/scrapers.ts:23)

```typescript
magnet: container.find("div.panel-footer a:nth-child(2)").attr("href")!,
```

The `!` operator suppresses TypeScript's null check but doesn't prevent a runtime `undefined`.

**Fix:** Replace `!` with `?? ""` for safe fallback.

---

## Summary of Files to Modify

| File | Issues |
|------|--------|
| [`constants.ts`](src/constants.ts) | Identical URLs, `Object` type on endpoints |
| [`utils.ts`](src/utils.ts) | No category validation, unused function |
| [`scrapers.ts`](src/scrapers.ts) | Unsafe attr access, missing semicolon, non-null assertion |
| [`routes.ts`](src/routes.ts) | Unused checkNyaaUrl, optional field access |
| [`models.ts`](src/models.ts) | Optional query field inconsistency |
| [`package.json`](package.json) | Missing wrangler dep, empty scripts |
| [`tsconfig.json`](tsconfig.json) | Incomplete lib config |

## Execution Order

1. Fix [`tsconfig.json`](tsconfig.json) and [`package.json`](package.json) -- project config
2. Fix [`constants.ts`](src/constants.ts) -- type and value corrections
3. Fix [`models.ts`](src/models.ts) -- make `QueryParams` fields non-optional where always provided
4. Fix [`utils.ts`](src/utils.ts) -- add validation, remove or integrate dead code
5. Fix [`scrapers.ts`](src/scrapers.ts) -- null safety, semicolon, non-null assertion
6. Fix [`routes.ts`](src/routes.ts) -- integrate URL check or simplify
