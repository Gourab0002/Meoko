import { Context } from "hono";
import { Constants } from "./constants.ts";
import type { File, ListingResponse, Torrent } from "./models.ts";
import { HttpError } from "./models.ts";
import {
  isViewPage,
  parseFileInfo,
  parseListing,
  parseRss,
  parseRssMeta,
} from "./parse.ts";
import {
  extractViewId,
  fetchNyaa,
  setCache,
  setListingHeaders,
  wantsEnvelope,
} from "./utils.ts";

export {
  flattenFileTree,
  parseFileInfo,
  parseListing,
  parsePagination,
  parseRss,
  parseTorrentList,
  parseUserProfile,
} from "./parse.ts";

function listingBody(
  torrents: Torrent[],
  listing: ReturnType<typeof parseListing>,
  origin: string
): ListingResponse {
  return {
    torrents,
    page: listing.pagination.page,
    perPage: listing.pagination.perPage,
    hasNext: listing.pagination.hasNext,
    total: listing.pagination.total,
    origin,
    ...(listing.user ? { user: listing.user } : {}),
  };
}

export async function scrapeNyaa(
  c: Context,
  path: string,
  options: { username?: string; envelope?: boolean } = {}
) {
  const result = await fetchNyaa(path);
  const requestedPage = Number(c.req.query("p") ?? "1") || 1;
  const listing = parseListing(
    result.html,
    result.origin,
    requestedPage,
    options.username
  );

  setListingHeaders(c, listing.pagination, result.origin);
  setCache(c, Constants.ListingCacheSeconds);

  if (wantsEnvelope(c, options.envelope === true)) {
    return c.json(listingBody(listing.torrents, listing, result.origin));
  }

  return c.json(listing.torrents);
}

export async function scrapeRss(c: Context, path: string) {
  const result = await fetchNyaa(path);
  const torrents = parseRss(result.html, result.origin);
  const meta = parseRssMeta(result.html);

  setCache(c, Constants.ListingCacheSeconds);
  c.header("X-Origin", result.origin);

  return c.json({
    title: meta.title,
    description: meta.description,
    origin: result.origin,
    torrents,
  });
}

function fileResponse(c: Context, file: File) {
  setCache(c, Constants.DetailCacheSeconds);
  c.header("X-Origin", file.origin);
  return c.json(file);
}

export async function loadFileInfo(path: string): Promise<File> {
  const result = await fetchNyaa(path);
  const fileId = extractViewId(result.url) || extractViewId(path);
  const file = parseFileInfo(result.html, result.origin, fileId);

  if (!file) {
    throw new HttpError(404, "Not Found");
  }

  return file;
}

export async function loadFileInfoFromSearch(query: string): Promise<File> {
  const result = await fetchNyaa(`/?q=${encodeURIComponent(query)}`);

  if (isViewPage(result.html, result.url)) {
    const fileId = extractViewId(result.url);
    const file = parseFileInfo(result.html, result.origin, fileId);
    if (file) {
      return file;
    }
  }

  throw new HttpError(404, "Not Found");
}

export async function fileInfoScraper(c: Context, path: string) {
  const file = await loadFileInfo(path);
  return fileResponse(c, file);
}

export async function fileSliceScraper(
  c: Context,
  path: string,
  slice: "files" | "comments" | "trackers"
) {
  const file = await loadFileInfo(path);

  setCache(c, Constants.DetailCacheSeconds);
  c.header("X-Origin", file.origin);

  if (slice === "files") {
    return c.json({
      status: file.fileListStatus,
      files: file.files,
      fileTree: file.fileTree,
    });
  }

  if (slice === "comments") {
    return c.json(file.commentInfo);
  }

  return c.json({ trackers: file.trackers, magnet: file.torrent.magnet });
}


