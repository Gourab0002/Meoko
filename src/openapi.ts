import { Constants } from "./constants.ts";

const torrentRef = { $ref: "#/components/schemas/Torrent" };
const fileRef = { $ref: "#/components/schemas/File" };
const listingRef = { $ref: "#/components/schemas/ListingEnvelope" };
const errorRef = { $ref: "#/components/schemas/ErrorBody" };
const tooMany = { $ref: "#/components/responses/TooManyRequests" };

function jsonBody(description: string, schema: object) {
  return {
    description,
    content: { "application/json": { schema } },
  };
}

function errorBody(description: string) {
  return jsonBody(description, errorRef);
}

const pagingParams = [
  {
    name: "q",
    in: "query",
    schema: { type: "string", maxLength: Constants.MaxQueryLength },
  },
  {
    name: "s",
    in: "query",
    description: "size, seeders, leechers, date, downloads, or comments. date is sent upstream as id.",
    schema: {
      type: "string",
      enum: ["size", "seeders", "leechers", "date", "downloads", "comments"],
    },
  },
  {
    name: "o",
    in: "query",
    schema: { type: "string", enum: ["asc", "desc"] },
  },
  {
    name: "p",
    in: "query",
    schema: { type: "integer", minimum: 1, maximum: Constants.MaxPage },
  },
  {
    name: "f",
    in: "query",
    description: "0 = no filter, 1 = no remakes, 2 = trusted only. filter is an alias.",
    schema: { type: "integer", enum: [0, 1, 2] },
  },
  { name: "envelope", in: "query", schema: { type: "string" } },
];

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Meoko — Unofficial Nyaa API",
    version: Constants.Version,
    description:
      "Read-only JSON API for public Nyaa listing, view, user, and RSS pages. List endpoints return a torrent array unless envelope=1. /search uses the envelope by default (flat=1 returns the array). " +
      `Queries longer than ${Constants.MaxQueryLength} characters, pages above ${Constants.MaxPage}, and unknown sort, order, or filter values return 400. ` +
      "The deployed worker allows 120 requests per minute per IP per Cloudflare location and answers 429 when that budget is spent. " +
      "/hash/{hash} returns torrent details for one match, and a listing envelope when the search has several rows.",
  },
  components: {
    schemas: {
      ErrorBody: {
        type: "object",
        required: ["error", "status"],
        properties: {
          error: { type: "string" },
          status: { type: "integer" },
        },
      },
      Torrent: {
        type: "object",
        required: [
          "id",
          "title",
          "category",
          "categoryId",
          "uploaded",
          "uploadedTimestamp",
          "seeders",
          "leechers",
          "completed",
          "commentCount",
          "size",
          "sizeBytes",
          "file",
          "link",
          "magnet",
          "infoHash",
          "trusted",
          "remake",
          "hidden",
          "deleted",
          "canonicalLink",
          "canonicalFile",
        ],
        properties: {
          id: { type: "integer" },
          title: { type: "string" },
          category: { type: "string" },
          categoryId: { type: "string", description: "Nyaa c= id such as 1_2" },
          uploaded: { type: "string" },
          uploadedTimestamp: { type: "integer" },
          seeders: { type: "integer" },
          leechers: { type: "integer" },
          completed: { type: "integer" },
          commentCount: { type: "integer" },
          size: { type: "string" },
          sizeBytes: { type: "integer" },
          file: { type: "string", description: "Torrent file URL on the mirror that answered" },
          link: { type: "string", description: "View URL on the mirror that answered" },
          canonicalFile: { type: "string", description: "Torrent file URL on https://nyaa.si" },
          canonicalLink: { type: "string", description: "View URL on https://nyaa.si" },
          magnet: { type: "string" },
          infoHash: { type: "string", description: "Hex hashes are lowercase" },
          trusted: { type: "boolean" },
          remake: { type: "boolean" },
          hidden: { type: "boolean" },
          deleted: { type: "boolean" },
        },
      },
      Submitter: {
        type: "object",
        required: ["name", "url", "trusted", "anonymous"],
        properties: {
          name: { type: "string" },
          url: { type: "string" },
          trusted: { type: "boolean" },
          anonymous: { type: "boolean" },
        },
      },
      TorrentFile: {
        type: "object",
        required: ["name", "size", "sizeBytes", "path"],
        properties: {
          name: { type: "string" },
          size: { type: "string" },
          sizeBytes: { type: "integer" },
          path: { type: "string" },
        },
      },
      FileTreeNode: {
        oneOf: [
          {
            type: "object",
            required: ["type", "name", "size", "sizeBytes"],
            properties: {
              type: { const: "file" },
              name: { type: "string" },
              size: { type: "string" },
              sizeBytes: { type: "integer" },
            },
          },
          {
            type: "object",
            required: ["type", "name", "children"],
            properties: {
              type: { const: "folder" },
              name: { type: "string" },
              children: {
                type: "array",
                items: { $ref: "#/components/schemas/FileTreeNode" },
              },
            },
          },
        ],
      },
      Comment: {
        type: "object",
        required: [
          "id",
          "name",
          "content",
          "image",
          "timestamp",
          "timestampUnix",
          "edited",
          "uploader",
          "profile",
        ],
        properties: {
          id: { type: "integer" },
          name: { type: "string" },
          content: { type: "string" },
          image: { type: "string" },
          timestamp: { type: "string" },
          timestampUnix: { type: "integer" },
          edited: { type: "boolean" },
          uploader: { type: "boolean" },
          profile: { type: "string" },
        },
      },
      Comments: {
        type: "object",
        required: ["count", "comments"],
        properties: {
          count: { type: "integer" },
          comments: { type: "array", items: { $ref: "#/components/schemas/Comment" } },
        },
      },
      File: {
        type: "object",
        required: [
          "torrent",
          "description",
          "descriptionLinks",
          "submittedBy",
          "submitter",
          "information",
          "infoHash",
          "trackers",
          "files",
          "fileTree",
          "fileListStatus",
          "commentInfo",
          "origin",
        ],
        properties: {
          torrent: torrentRef,
          description: { type: "string" },
          descriptionLinks: {
            type: "array",
            items: { type: "string" },
            description: "Absolute URLs from the description, excluding javascript: links",
          },
          submittedBy: { type: "string" },
          submitter: { $ref: "#/components/schemas/Submitter" },
          information: { type: "string" },
          infoHash: { type: "string" },
          trackers: { type: "array", items: { type: "string" } },
          files: { type: "array", items: { $ref: "#/components/schemas/TorrentFile" } },
          fileTree: { type: "array", items: { $ref: "#/components/schemas/FileTreeNode" } },
          fileListStatus: { type: "string", enum: ["ok", "unavailable", "too_many"] },
          commentInfo: { $ref: "#/components/schemas/Comments" },
          origin: { type: "string" },
        },
      },
      UserProfile: {
        type: "object",
        required: ["username", "url", "level", "trusted", "uploadCount"],
        properties: {
          username: { type: "string" },
          url: { type: "string" },
          level: { type: "string" },
          trusted: { type: "boolean" },
          uploadCount: { type: ["integer", "null"] },
        },
      },
      ListingEnvelope: {
        type: "object",
        required: ["torrents", "page", "perPage", "hasNext", "total", "origin"],
        properties: {
          torrents: { type: "array", items: torrentRef },
          page: { type: "integer" },
          perPage: { type: "integer" },
          hasNext: { type: "boolean" },
          total: { type: ["integer", "null"] },
          origin: { type: "string" },
          user: { $ref: "#/components/schemas/UserProfile" },
        },
      },
      RssFeed: {
        type: "object",
        required: ["title", "description", "origin", "torrents"],
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          origin: { type: "string" },
          torrents: { type: "array", items: torrentRef },
        },
      },
      BatchResult: {
        type: "object",
        required: ["id", "ok"],
        properties: {
          id: { type: "integer" },
          ok: { type: "boolean" },
          data: fileRef,
          error: { type: "string" },
          status: { type: "integer" },
        },
      },
      MirrorStatus: {
        type: "object",
        required: ["origin", "ok", "status", "error", "ms"],
        properties: {
          origin: { type: "string" },
          ok: { type: "boolean" },
          status: { type: ["integer", "null"] },
          error: { type: ["string", "null"] },
          ms: { type: "integer" },
        },
      },
      Health: {
        type: "object",
        required: ["name", "version", "ok", "mirrors"],
        properties: {
          name: { type: "string" },
          version: { type: "string" },
          ok: { type: "boolean" },
          mirrors: { type: "array", items: { $ref: "#/components/schemas/MirrorStatus" } },
        },
      },
    },
    responses: {
      TooManyRequests: errorBody("Rate limit exceeded"),
    },
  },
  paths: {
    "/": {
      get: {
        summary: "Liveness ping",
        responses: {
          "200": {
            description: "Plain-text liveness string",
            content: { "text/plain": { schema: { type: "string" } } },
          },
          "429": tooMany,
        },
      },
    },
    "/health": {
      get: {
        summary: "Mirror health",
        responses: {
          "200": jsonBody("At least one mirror is reachable", { $ref: "#/components/schemas/Health" }),
          "503": jsonBody("All mirrors failed", { $ref: "#/components/schemas/Health" }),
          "429": tooMany,
        },
      },
    },
    "/categories": {
      get: {
        summary: "Category map",
        responses: {
          "200": jsonBody("Known categories and Nyaa c= ids", {
            type: "object",
            required: ["categories"],
            properties: { categories: { type: "object", additionalProperties: true } },
          }),
          "429": tooMany,
        },
      },
    },
    "/search": {
      get: {
        summary: "Search torrents",
        parameters: [
          ...pagingParams,
          {
            name: "c",
            in: "query",
            description: "Nyaa id (1_2) or category path (anime/eng)",
            schema: { type: "string" },
          },
          { name: "flat", in: "query", schema: { type: "string" } },
        ],
        responses: {
          "200": jsonBody("Listing envelope by default", listingRef),
          "400": errorBody("Invalid category, sort, order, filter, page, or query"),
          "429": tooMany,
          "502": errorBody("All mirrors failed"),
        },
      },
    },
    "/rss": {
      get: {
        summary: "Nyaa RSS parsed as JSON",
        parameters: [
          { name: "q", in: "query", schema: { type: "string", maxLength: Constants.MaxQueryLength } },
          { name: "c", in: "query", schema: { type: "string" } },
          { name: "f", in: "query", schema: { type: "integer", enum: [0, 1, 2] } },
          { name: "u", in: "query", schema: { type: "string" } },
          {
            name: "magnets",
            in: "query",
            description: "Present or 1 to prefer Nyaa's magnet links, including trackers. m is an alias.",
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": jsonBody("JSON RSS payload", { $ref: "#/components/schemas/RssFeed" }),
          "400": errorBody("Invalid query"),
          "429": tooMany,
        },
      },
    },
    "/ids": {
      get: {
        summary: "Batch torrent details",
        parameters: [
          {
            name: "ids",
            in: "query",
            required: true,
            description: `Comma-separated numeric ids, max ${Constants.MaxBatchIds}. Duplicates are fetched once.`,
            schema: { type: "string" },
          },
        ],
        responses: {
          "200": jsonBody("Per-id results", {
            type: "object",
            required: ["results"],
            properties: {
              results: { type: "array", items: { $ref: "#/components/schemas/BatchResult" } },
            },
          }),
          "400": errorBody("Invalid id list"),
          "429": tooMany,
        },
      },
    },
    "/hash/{hash}": {
      get: {
        summary: "Torrent details by info hash",
        description:
          "One matching torrent returns the detail object. Several search rows return a listing envelope. No rows returns 404.",
        parameters: [{ name: "hash", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": jsonBody("Detail object, or a listing envelope when several rows match", {
            oneOf: [fileRef, listingRef],
          }),
          "400": errorBody("Invalid info hash"),
          "404": errorBody("Not found"),
          "429": tooMany,
        },
      },
    },
    "/id/{id}": {
      get: {
        summary: "Torrent details by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": jsonBody("Torrent details", fileRef),
          "400": errorBody("Invalid ID"),
          "404": errorBody("Not found"),
          "429": tooMany,
        },
      },
    },
    "/id/{id}/files": {
      get: {
        summary: "Torrent file list",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": jsonBody("File tree and flat list", {
            type: "object",
            required: ["status", "files", "fileTree"],
            properties: {
              status: { type: "string", enum: ["ok", "unavailable", "too_many"] },
              files: { type: "array", items: { $ref: "#/components/schemas/TorrentFile" } },
              fileTree: { type: "array", items: { $ref: "#/components/schemas/FileTreeNode" } },
            },
          }),
          "429": tooMany,
        },
      },
    },
    "/id/{id}/comments": {
      get: {
        summary: "Torrent comments",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": jsonBody("Comments", { $ref: "#/components/schemas/Comments" }),
          "429": tooMany,
        },
      },
    },
    "/id/{id}/trackers": {
      get: {
        summary: "Trackers from the magnet URI",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": jsonBody("Tracker list", {
            type: "object",
            required: ["trackers", "magnet"],
            properties: {
              trackers: { type: "array", items: { type: "string" } },
              magnet: { type: "string" },
            },
          }),
          "429": tooMany,
        },
      },
    },
    "/user/{username}": {
      get: {
        summary: "User uploads",
        parameters: [
          { name: "username", in: "path", required: true, schema: { type: "string" } },
          {
            name: "c",
            in: "query",
            schema: { type: "string" },
          },
          ...pagingParams,
        ],
        responses: {
          "200": jsonBody("Torrent array by default", {
            oneOf: [{ type: "array", items: torrentRef }, listingRef],
          }),
          "400": errorBody("Invalid username or query"),
          "429": tooMany,
        },
      },
    },
    "/user/{username}/profile": {
      get: {
        summary: "Public user profile",
        parameters: [{ name: "username", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": jsonBody("Profile fields from the user page", { $ref: "#/components/schemas/UserProfile" }),
          "400": errorBody("Invalid username"),
          "404": errorBody("Not found"),
          "429": tooMany,
        },
      },
    },
    "/{category}": {
      get: {
        summary: "Browse a category",
        parameters: [
          { name: "category", in: "path", required: true, schema: { type: "string" } },
          ...pagingParams,
        ],
        responses: {
          "200": jsonBody("Torrent array by default", {
            oneOf: [{ type: "array", items: torrentRef }, listingRef],
          }),
          "400": errorBody("Invalid category or query"),
          "429": tooMany,
        },
      },
    },
    "/{category}/{subcategory}": {
      get: {
        summary: "Browse a subcategory",
        parameters: [
          { name: "category", in: "path", required: true, schema: { type: "string" } },
          { name: "subcategory", in: "path", required: true, schema: { type: "string" } },
          ...pagingParams,
        ],
        responses: {
          "200": jsonBody("Torrent array by default", {
            oneOf: [{ type: "array", items: torrentRef }, listingRef],
          }),
          "400": errorBody("Unknown subcategory or invalid query"),
          "429": tooMany,
        },
      },
    },
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderDocsHtml(): string {
  const paths = openApiSpec.paths as Record<string, { get?: { summary?: string; description?: string } }>;
  const rows = Object.entries(paths)
    .map(([path, item]) => {
      const summary = item.get?.summary ?? "";
      return `<tr><td><code>GET ${escapeHtml(path)}</code></td><td>${escapeHtml(summary)}</td></tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Meoko API</title>
  <style>
    body { font: 16px/1.5 system-ui, sans-serif; margin: 2rem auto; max-width: 52rem; padding: 0 1rem; color: #1c1917; }
    code { font-family: ui-monospace, monospace; }
    table { border-collapse: collapse; width: 100%; }
    th, td { text-align: left; padding: 0.4rem 0.6rem; border-bottom: 1px solid #e7e5e4; vertical-align: top; }
    a { color: #9a3412; }
  </style>
</head>
<body>
  <h1>Meoko API <small>${escapeHtml(Constants.Version)}</small></h1>
  <p>${escapeHtml(openApiSpec.info.description)}</p>
  <p>Machine-readable spec: <a href="/openapi.json"><code>/openapi.json</code></a>.</p>
  <table>
    <thead><tr><th>Route</th><th>Summary</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`;
}
