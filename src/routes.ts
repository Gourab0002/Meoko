import { Context } from "hono";
import { Constants } from "./constants.ts";
import { openApiSpec, renderDocsHtml } from "./openapi.ts";
import * as Scrapers from "./scrapers.ts";
import * as Utils from "./utils.ts";

function listingQuery(
  c: Context,
  extras: Record<string, string> = {},
  options: { readCategory?: boolean } = {}
) {
  const queryParams = Utils.getSearchParameters(c, options);
  if (queryParams.category && !extras.c) {
    extras = { ...extras, c: queryParams.category };
  }
  return Utils.buildSearchQuery(queryParams, extras);
}

export class Handlers {
  static Ping = function (c: Context) {
    c.header("X-Meoko-Version", Constants.Version);
    return c.text("Nyaa API v2 // Alive");
  };

  static Health = async function (c: Context) {
    const mirrors = await Utils.probeMirrors();
    const ok = mirrors.some((mirror) => mirror.ok);
    const body = {
      name: "Meoko",
      version: Constants.Version,
      ok,
      mirrors,
    };
    c.header("Cache-Control", "no-store");
    return c.json(body, ok ? 200 : 503);
  };

  static Docs = function (c: Context) {
    return c.html(renderDocsHtml());
  };

  static OpenApi = function (c: Context) {
    Utils.setCache(c, 3600);
    return c.json(openApiSpec);
  };

  static Categories = function (c: Context) {
    Utils.setCache(c, 3600);
    return c.json({ categories: Constants.NyaaEndpoints });
  };

  static Search = async function (c: Context) {
    try {
      const path = `/?${listingQuery(c)}`;
      return await Scrapers.scrapeNyaa(c, path, { envelope: true });
    } catch (error) {
      return Utils.jsonErrorFrom(c, error);
    }
  };

  static Rss = async function (c: Context) {
    try {
      const queryParams = Utils.getSearchParameters(c);
      const extras: Record<string, string> = {};
      if (queryParams.category) {
        extras.c = queryParams.category;
      }
      if (queryParams.user) {
        extras.u = queryParams.user;
      }
      if (queryParams.magnets) {
        extras.magnets = "";
      }
      const path = `/rss?${Utils.buildSearchQuery(queryParams, extras, { includePage: false })}`;
      return await Scrapers.scrapeRss(c, path);
    } catch (error) {
      return Utils.jsonErrorFrom(c, error);
    }
  };

  static GetInfoFromID = async function (c: Context) {
    try {
      const id = c.req.param("id") ?? "";
      if (!Utils.isValidId(id)) {
        return Utils.jsonError(c, 400, "Invalid ID");
      }

      return await Scrapers.fileInfoScraper(c, `/view/${id}`);
    } catch (error) {
      return Utils.jsonErrorFrom(c, error);
    }
  };

  static GetInfoSlice = async function (c: Context) {
    try {
      const id = c.req.param("id") ?? "";
      if (!Utils.isValidId(id)) {
        return Utils.jsonError(c, 400, "Invalid ID");
      }

      const segment = c.req.path.split("/").filter(Boolean).pop();
      const slice =
        segment === "files" || segment === "comments" || segment === "trackers"
          ? segment
          : "trackers";

      return await Scrapers.fileSliceScraper(c, `/view/${id}`, slice);
    } catch (error) {
      return Utils.jsonErrorFrom(c, error);
    }
  };

  static GetInfoFromHash = async function (c: Context) {
    try {
      const hash = c.req.param("hash") ?? "";
      if (!Utils.isValidInfoHash(hash)) {
        return Utils.jsonError(c, 400, "Invalid info hash");
      }

      const lookup = await Scrapers.loadFileInfoFromSearch(hash);
      if (lookup.kind === "listing") {
        Utils.setListingHeaders(c, lookup.pagination, lookup.origin);
        Utils.setCache(c, Constants.ListingCacheSeconds);
        return c.json({
          torrents: lookup.torrents,
          page: lookup.pagination.page,
          perPage: lookup.pagination.perPage,
          hasNext: lookup.pagination.hasNext,
          total: lookup.pagination.total,
          origin: lookup.origin,
        });
      }

      Utils.setCache(c, Constants.DetailCacheSeconds);
      c.header("X-Origin", lookup.file.origin);
      return c.json(lookup.file);
    } catch (error) {
      return Utils.jsonErrorFrom(c, error);
    }
  };

  static GetBatchInfo = async function (c: Context) {
    try {
      const ids = Utils.parseIdList(c.req.query("ids"));
      if (ids.length === 0) {
        return Utils.jsonError(c, 400, "Missing ids");
      }
      if (ids.length > Constants.MaxBatchIds) {
        return Utils.jsonError(c, 400, `Too many ids (max ${Constants.MaxBatchIds})`);
      }
      if (!ids.every(Utils.isValidId)) {
        return Utils.jsonError(c, 400, "Invalid ID");
      }

      const results = await Promise.all(
        ids.map(async (id) => {
          try {
            const data = await Scrapers.loadFileInfo(`/view/${id}`);
            return { id: Number(id), ok: true as const, data };
          } catch (error) {
            return {
              id: Number(id),
              ok: false as const,
              error: Utils.errorMessage(error),
              status: Utils.errorStatus(error),
            };
          }
        })
      );

      Utils.setCache(c, Constants.DetailCacheSeconds);
      return c.json({ results });
    } catch (error) {
      return Utils.jsonErrorFrom(c, error);
    }
  };

  static GetUserUploads = async function (c: Context) {
    try {
      const username = c.req.param("username") ?? "";
      if (!Utils.isValidUsername(username)) {
        return Utils.jsonError(c, 400, "Invalid username");
      }

      const path = `/user/${encodeURIComponent(username)}?${listingQuery(c)}`;
      return await Scrapers.scrapeNyaa(c, path, { username });
    } catch (error) {
      return Utils.jsonErrorFrom(c, error);
    }
  };

  static GetUserProfile = async function (c: Context) {
    try {
      const username = c.req.param("username") ?? "";
      if (!Utils.isValidUsername(username)) {
        return Utils.jsonError(c, 400, "Invalid username");
      }

      const result = await Utils.fetchNyaa(`/user/${encodeURIComponent(username)}`);
      const user = Scrapers.parseUserProfile(result.html, result.origin, username);
      if (!user) {
        return Utils.jsonError(c, 404, "Not Found");
      }

      Utils.setCache(c, Constants.ListingCacheSeconds);
      c.header("X-Origin", result.origin);
      return c.json(user);
    } catch (error) {
      return Utils.jsonErrorFrom(c, error);
    }
  };

  static GetCategoryTorrents = async function (c: Context) {
    try {
      const cat = c.req.param("category") ?? "";
      const subCat = c.req.param("subcategory");

      if (!Utils.isKnownCategory(cat)) {
        return Utils.jsonError(c, 400, "Invalid category");
      }

      if (!Utils.isKnownSubcategory(cat, subCat)) {
        return Utils.jsonError(c, 400, "Invalid subcategory");
      }

      const category = Utils.getCategoryID(cat, subCat);
      const path = `/?${listingQuery(c, { c: category }, { readCategory: false })}`;
      return await Scrapers.scrapeNyaa(c, path);
    } catch (error) {
      return Utils.jsonErrorFrom(c, error);
    }
  };
}


