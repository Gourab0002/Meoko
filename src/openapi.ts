import { Constants } from "./constants.ts";

export const openApiSpec = {
  openapi: "3.1.0",
  info: {
    title: "Meoko — Unofficial Nyaa API",
    version: Constants.Version,
    description:
      "Read-only JSON API for public Nyaa listing, view, user, and RSS pages. List endpoints keep returning a torrent array by default; pass envelope=1 for pagination metadata.",
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
        },
      },
    },
    "/health": {
      get: {
        summary: "Mirror health",
        responses: { "200": { description: "At least one mirror is reachable" }, "503": { description: "All mirrors failed" } },
      },
    },
    "/categories": {
      get: {
        summary: "Category map",
        responses: { "200": { description: "Known categories and Nyaa c= ids" } },
      },
    },
    "/search": {
      get: {
        summary: "Search torrents",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "c", in: "query", description: "Nyaa id (1_2) or category path (anime/eng)", schema: { type: "string" } },
          { name: "s", in: "query", schema: { type: "string" } },
          { name: "o", in: "query", schema: { type: "string", enum: ["asc", "desc"] } },
          { name: "p", in: "query", schema: { type: "integer" } },
          { name: "f", in: "query", description: "0=all, 1=no remakes, 2=trusted only", schema: { type: "integer" } },
          { name: "envelope", in: "query", schema: { type: "string" } },
          { name: "flat", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Listing envelope by default" } },
      },
    },
    "/rss": {
      get: {
        summary: "Nyaa RSS parsed as JSON",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "c", in: "query", schema: { type: "string" } },
          { name: "f", in: "query", schema: { type: "integer" } },
          { name: "u", in: "query", schema: { type: "string" } },
          { name: "magnets", in: "query", description: "Present or 1 to prefer magnet links", schema: { type: "string" } },
        ],
        responses: { "200": { description: "JSON RSS payload" } },
      },
    },
    "/ids": {
      get: {
        summary: "Batch torrent details",
        parameters: [
          { name: "ids", in: "query", required: true, description: "Comma-separated numeric ids, max 10", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Per-id results" }, "400": { description: "Invalid id list" } },
      },
    },
    "/hash/{hash}": {
      get: {
        summary: "Torrent details by info hash",
        parameters: [{ name: "hash", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Torrent details" }, "404": { description: "Not found" } },
      },
    },
    "/id/{id}": {
      get: {
        summary: "Torrent details by id",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Torrent details" } },
      },
    },
    "/id/{id}/files": {
      get: {
        summary: "Torrent file list",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "File tree and flat list" } },
      },
    },
    "/id/{id}/comments": {
      get: {
        summary: "Torrent comments",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Comments" } },
      },
    },
    "/id/{id}/trackers": {
      get: {
        summary: "Trackers from the magnet URI",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Tracker list" } },
      },
    },
    "/user/{username}": {
      get: {
        summary: "User uploads",
        parameters: [
          { name: "username", in: "path", required: true, schema: { type: "string" } },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "c", in: "query", schema: { type: "string" } },
          { name: "s", in: "query", schema: { type: "string" } },
          { name: "o", in: "query", schema: { type: "string" } },
          { name: "p", in: "query", schema: { type: "integer" } },
          { name: "f", in: "query", schema: { type: "integer" } },
          { name: "envelope", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Torrent array by default" } },
      },
    },
    "/user/{username}/profile": {
      get: {
        summary: "Public user profile",
        parameters: [{ name: "username", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Profile fields scrapeable from the user page" } },
      },
    },
    "/{category}": {
      get: {
        summary: "Browse a category",
        parameters: [
          { name: "category", in: "path", required: true, schema: { type: "string" } },
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "s", in: "query", schema: { type: "string" } },
          { name: "o", in: "query", schema: { type: "string" } },
          { name: "p", in: "query", schema: { type: "integer" } },
          { name: "f", in: "query", schema: { type: "integer" } },
          { name: "envelope", in: "query", schema: { type: "string" } },
        ],
        responses: { "200": { description: "Torrent array by default" } },
      },
    },
    "/{category}/{subcategory}": {
      get: {
        summary: "Browse a subcategory",
        parameters: [
          { name: "category", in: "path", required: true, schema: { type: "string" } },
          { name: "subcategory", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: { "200": { description: "Torrent array by default" }, "400": { description: "Unknown subcategory" } },
      },
    },
  },
};
