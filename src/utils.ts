import { Context } from "hono";
import { Constants } from "./constants.ts";
import { HttpError } from "./models.ts";
import type {
  ErrorStatus,
  FetchResult,
  MirrorStatus,
  Pagination,
  QueryParams,
} from "./models.ts";

const SIZE_UNITS: Record<string, number> = {
  b: 1,
  byte: 1,
  bytes: 1,
  kib: 1024,
  mib: 1024 ** 2,
  gib: 1024 ** 3,
  tib: 1024 ** 4,
  pib: 1024 ** 5,
  kb: 1000,
  mb: 1000 ** 2,
  gb: 1000 ** 3,
  tb: 1000 ** 4,
  pb: 1000 ** 5,
};

export function isValidId(id: string): boolean {
  return /^\d+$/.test(id);
}

export function isValidUsername(username: string): boolean {
  return /^[A-Za-z0-9_\-]{1,32}$/.test(username);
}

export function isValidInfoHash(value: string): boolean {
  return /^[a-fA-F0-9]{40}$/.test(value) || /^[A-Za-z2-7]{32}$/.test(value);
}

export function isKnownCategory(category: string): boolean {
  return Object.prototype.hasOwnProperty.call(Constants.NyaaEndpoints, category);
}

export function isKnownSubcategory(
  category: string,
  subcategory: string | undefined
): boolean {
  if (subcategory === undefined || subcategory === "") {
    return true;
  }

  const entry = Constants.NyaaEndpoints[category];
  return Boolean(entry && Object.prototype.hasOwnProperty.call(entry, subcategory));
}

export function getCategoryID(c: string, s: string | undefined): string {
  const endpoints = Constants.NyaaEndpoints;
  const category = endpoints[c];

  if (!category) {
    return "0_0";
  }

  if (s === undefined || s === "") {
    return category["all"] ?? "0_0";
  }

  return category[s] ?? category["all"] ?? "0_0";
}

export function resolveCategoryParam(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const value = raw.trim();
  if (!value) {
    return undefined;
  }

  if (/^\d+_\d+$/.test(value)) {
    return value;
  }

  const parts = value.split(/[/.]/);
  const category = parts[0] ?? "";
  const subcategory = parts[1];

  if (!isKnownCategory(category)) {
    return undefined;
  }

  if (subcategory && !isKnownSubcategory(category, subcategory)) {
    return undefined;
  }

  return getCategoryID(category, subcategory);
}

function isTruthyQuery(value: string | undefined): boolean {
  if (value === undefined) {
    return false;
  }
  const normalized = value.toLowerCase();
  return normalized === "" || normalized === "1" || normalized === "true" || normalized === "yes";
}

export function getSearchParameters(
  c: Context,
  options: { readCategory?: boolean } = {}
): QueryParams {
  const q = c.req.query("q") ?? "";
  if (q.length > Constants.MaxQueryLength) {
    throw new HttpError(400, `Query too long (max ${Constants.MaxQueryLength} characters)`);
  }

  const rawPage = c.req.query("p");
  let page = 1;
  if (rawPage !== undefined && rawPage !== "" && /^\d+$/.test(rawPage)) {
    page = Number(rawPage);
    if (page > Constants.MaxPage) {
      throw new HttpError(400, `Page out of range (max ${Constants.MaxPage})`);
    }
    if (page < 1) {
      page = 1;
    }
  }

  const rawFilter = c.req.query("f") ?? c.req.query("filter");
  let filter = 0;
  if (rawFilter !== undefined && rawFilter !== "") {
    if (!/^\d+$/.test(rawFilter)) {
      throw new HttpError(400, "Invalid filter");
    }
    filter = Number(rawFilter);
    if (!Constants.ValidFilters.has(filter)) {
      throw new HttpError(400, "Invalid filter");
    }
  }

  const oRaw = (c.req.query("o") ?? "").toLowerCase();
  if (!Constants.ValidOrders.has(oRaw)) {
    throw new HttpError(400, "Invalid order");
  }

  let s = c.req.query("s") ?? "";
  if (s === "date") {
    s = "id";
  }
  if (!Constants.ValidSorts.has(s)) {
    throw new HttpError(400, "Invalid sort");
  }

  const rawCategory = options.readCategory === false ? undefined : c.req.query("c");
  let category = "";

  if (rawCategory !== undefined && rawCategory !== "") {
    const resolved = resolveCategoryParam(rawCategory);
    if (!resolved) {
      throw new HttpError(400, "Invalid category");
    }
    category = resolved;
  }

  return {
    query: q,
    page,
    order: oRaw,
    sort: s,
    filter,
    category,
    envelope: wantsEnvelope(c, false),
    magnets: isTruthyQuery(c.req.query("magnets")) || c.req.query("m") !== undefined,
    user: c.req.query("u") ?? c.req.query("user") ?? "",
  };
}

export function wantsEnvelope(c: Context, defaultEnvelope = false): boolean {
  const envelope = (c.req.query("envelope") ?? "").toLowerCase();
  if (envelope === "1" || envelope === "true" || envelope === "yes") {
    return true;
  }
  if (envelope === "0" || envelope === "false" || envelope === "no") {
    return false;
  }

  const flat = (c.req.query("flat") ?? "").toLowerCase();
  if (flat === "1" || flat === "true" || flat === "yes") {
    return false;
  }

  return defaultEnvelope;
}

export function buildSearchQuery(
  queryParams: QueryParams,
  extras: Record<string, string> = {},
  options: { includePage?: boolean } = {}
): string {
  const params = new URLSearchParams();
  const includePage = options.includePage !== false;

  if (queryParams.query) {
    params.set("q", queryParams.query);
  }

  const category = extras.c || queryParams.category;
  if (category) {
    params.set("c", category);
  }

  if (includePage && queryParams.page > 0) {
    params.set("p", String(queryParams.page));
  }

  if (queryParams.sort) {
    params.set("s", queryParams.sort);
  }

  if (queryParams.order) {
    params.set("o", queryParams.order);
  }

  params.set("f", String(queryParams.filter));

  const user = extras.u || queryParams.user;
  if (user) {
    params.set("u", user);
  }

  for (const [key, value] of Object.entries(extras)) {
    if (key === "c" || key === "u") {
      continue;
    }
    params.set(key, value);
  }

  return params.toString();
}

export function normalizeInfoHash(value: string): string {
  const trimmed = value.trim();
  if (/^[a-fA-F0-9]{40}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }
  return trimmed;
}

export function canonicalNyaaUrl(href: string | undefined): string {
  if (!href) {
    return "";
  }

  if (href.startsWith("magnet:") || href.startsWith("data:")) {
    return href;
  }

  try {
    const url = new URL(href, Constants.NyaaBaseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return href;
    }
    const base = new URL(Constants.NyaaBaseUrl);
    url.protocol = base.protocol;
    url.host = base.host;
    return url.toString();
  } catch {
    return href;
  }
}

export function resolveUrl(origin: string, href: string | undefined): string {
  if (!href) {
    return "";
  }

  if (
    href.startsWith("magnet:") ||
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("data:")
  ) {
    return href;
  }

  try {
    return new URL(href, origin).toString();
  } catch {
    return href;
  }
}

export function toCount(value: string): number {
  const parsed = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function extractViewId(href: string | undefined): number {
  if (!href) {
    return 0;
  }

  const match = href.match(/\/view\/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export function extractCategoryId(href: string | undefined): string {
  if (!href) {
    return "";
  }

  try {
    return new URL(href, "https://nyaa.si").searchParams.get("c") ?? "";
  } catch {
    const match = href.match(/[?&]c=([^&]+)/);
    return match ? decodeURIComponent(match[1]) : "";
  }
}

export function extractInfoHash(magnet: string | undefined): string {
  if (!magnet) {
    return "";
  }

  const match = magnet.match(/xt=urn:btih:([a-zA-Z0-9]+)/i);
  return match ? normalizeInfoHash(match[1]) : "";
}

export function parseMagnet(magnet: string | undefined): {
  infoHash: string;
  name: string;
  trackers: string[];
} {
  if (!magnet || !magnet.startsWith("magnet:")) {
    return { infoHash: "", name: "", trackers: [] };
  }

  const query = magnet.startsWith("magnet:?") ? magnet.slice("magnet:?".length) : magnet;
  const params = new URLSearchParams(query);
  const xt = params.get("xt") ?? "";

  return {
    infoHash: normalizeInfoHash(xt.replace(/^urn:btih:/i, "")),
    name: params.get("dn") ?? "",
    trackers: params.getAll("tr"),
  };
}

export function parseSizeBytes(value: string | undefined): number {
  if (!value) {
    return 0;
  }

  const match = value.trim().match(/^([\d.,]+)\s*([A-Za-z]+)$/);
  if (!match) {
    return 0;
  }

  const amount = Number(match[1].replace(/,/g, ""));
  const multiplier = SIZE_UNITS[match[2].toLowerCase()];
  if (!Number.isFinite(amount) || multiplier === undefined) {
    return 0;
  }

  return Math.round(amount * multiplier);
}

function isChallengePage(html: string): boolean {
  return html.includes("<title>Just a moment...</title>");
}

export function looksLikeNyaa(html: string): boolean {
  if (/<(?:rss|channel)\b/i.test(html)) {
    return true;
  }
  if (/torrent-list|torrent-description/i.test(html)) {
    return true;
  }
  if (/no (?:results|torrents) found/i.test(html)) {
    return true;
  }
  if (/\bBrowsing\b/.test(html)) {
    return true;
  }
  return /info hash:/i.test(html) && /panel-title/i.test(html);
}

export function mirrorTimeoutMs(index: number, count: number): number {
  if (count <= 1 || index >= count - 1) {
    return Constants.FetchTimeoutMs;
  }
  return Constants.HealthTimeoutMs;
}

function cacheTtl(path: string): number {
  const pathname = path.split("?")[0] ?? path;
  if (pathname.startsWith("/view/")) {
    return Constants.DetailCacheSeconds;
  }
  return Constants.ListingCacheSeconds;
}

interface EdgeCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}

function edgeCache(): EdgeCache | null {
  const storage = (globalThis as { caches?: { default?: EdgeCache } }).caches;
  const cache = storage?.default;
  if (!cache || typeof cache.match !== "function" || typeof cache.put !== "function") {
    return null;
  }
  return cache;
}

function cacheRequest(origin: string, path: string): Request {
  const url = new URL("https://cache.meoko.internal/");
  url.searchParams.set("origin", origin);
  url.searchParams.set("path", path);
  return new Request(url);
}

async function readCached(origin: string, path: string): Promise<FetchResult | null> {
  const cache = edgeCache();
  if (!cache) {
    return null;
  }

  try {
    const cached = await cache.match(cacheRequest(origin, path));
    if (!cached) {
      return null;
    }
    return {
      origin,
      html: await cached.text(),
      status: cached.status,
      url: cached.headers.get("X-Meoko-Upstream-Url") || `${origin}${path}`,
    };
  } catch {
    return null;
  }
}

async function writeCached(result: FetchResult, path: string): Promise<void> {
  const cache = edgeCache();
  if (!cache) {
    return;
  }

  const ttl = cacheTtl(path);
  const headers = new Headers();
  headers.set("Cache-Control", `public, max-age=${ttl}`);
  headers.set("X-Meoko-Upstream-Url", result.url);
  try {
    await cache.put(
      cacheRequest(result.origin, path),
      new Response(result.html, { status: 200, headers })
    );
  } catch {
    // A cache write must not fail the request that already has a good page.
  }
}

export function mirrors(): string[] {
  const urls = Constants.NyaaMirrors.length
    ? Constants.NyaaMirrors
    : [Constants.NyaaBaseUrl, Constants.NyaaAltUrl];
  return [...new Set(urls.filter(Boolean))];
}

async function fetchOrigin(
  origin: string,
  path: string,
  timeoutMs: number
): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${origin}${path}`, {
      headers: {
        "User-Agent": Constants.UserAgent,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (response.status === 404) {
      throw new HttpError(404, "Not Found");
    }

    if (!response.ok) {
      throw new HttpError(502, `Upstream returned ${response.status} from ${origin}`);
    }

    const html = await response.text();
    if (isChallengePage(html)) {
      throw new HttpError(502, `Upstream challenge page from ${origin}`);
    }
    if (!looksLikeNyaa(html)) {
      throw new HttpError(502, `Upstream did not return a Nyaa page from ${origin}`);
    }

    return {
      origin,
      html,
      status: response.status,
      url: response.url || `${origin}${path}`,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchNyaa(
  path: string,
  options: { timeoutsMs?: readonly number[] } = {}
): Promise<FetchResult> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const origins = mirrors();
  let lastError: unknown;

  for (let index = 0; index < origins.length; index++) {
    const origin = origins[index] ?? "";
    const timeoutMs = options.timeoutsMs?.[index] ?? mirrorTimeoutMs(index, origins.length);
    try {
      const cached = await readCached(origin, normalizedPath);
      if (cached) {
        return cached;
      }
      const result = await fetchOrigin(origin, normalizedPath, timeoutMs);
      await writeCached(result, normalizedPath);
      return result;
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) {
        throw error;
      }
      lastError = error;
    }
  }

  if (lastError instanceof HttpError) {
    throw lastError;
  }

  throw new HttpError(502, "All Nyaa mirrors failed");
}

export async function probeMirrors(): Promise<MirrorStatus[]> {
  return Promise.all(
    mirrors().map(async (origin) => {
      const started = Date.now();
      try {
        await fetchOrigin(origin, "/", Constants.HealthTimeoutMs);
        return {
          origin,
          ok: true,
          status: 200,
          error: null,
          ms: Date.now() - started,
        };
      } catch (error) {
        const status = error instanceof HttpError ? error.status : null;
        return {
          origin,
          ok: false,
          status: status === 502 || status === 404 ? status : null,
          error: errorMessage(error),
          ms: Date.now() - started,
        };
      }
    })
  );
}

export function errorStatus(error: unknown): ErrorStatus {
  if (error instanceof HttpError) {
    return error.status;
  }
  return 502;
}

export function errorMessage(error: unknown): string {
  if (error instanceof HttpError) {
    return error.message;
  }
  if (error instanceof Error && error.name === "AbortError") {
    return "Upstream timeout";
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return "Upstream error";
}

export function jsonError(c: Context, status: ErrorStatus, message: string) {
  c.header("Cache-Control", "no-store");
  return c.json({ error: message, status }, status);
}

export function jsonErrorFrom(c: Context, error: unknown) {
  return jsonError(c, errorStatus(error), errorMessage(error));
}

export function setCache(c: Context, maxAge: number): void {
  c.header("Cache-Control", `public, max-age=${maxAge}`);
}

export function setListingHeaders(
  c: Context,
  pagination: Pagination,
  origin: string
): void {
  c.header("X-Page", String(pagination.page));
  c.header("X-Per-Page", String(pagination.perPage));
  c.header("X-Has-Next", pagination.hasNext ? "1" : "0");
  c.header("X-Origin", origin);
  if (pagination.total !== null) {
    c.header("X-Total", String(pagination.total));
  }
}

export function parseIdList(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  const ids: string[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(/[,\s]+/)) {
    const id = part.trim();
    if (!id || seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}
