import { Context } from "hono";
import { Constants } from "./constants.ts";
import { QueryParams } from "./models.ts";

export function getCategoryID(c: string, s: string | undefined): string {
  const endpoints = Constants.NyaaEndpoints;
  const category = endpoints[c];

  if (!category) {
    return "0_0";
  }

  if (s === undefined) {
    return category["all"] ?? "0_0";
  }

  return category[s] ?? category["all"] ?? "0_0";
}

export function getSearchParameters(c: Context): QueryParams {
  const q: string = (c.req.query("q") ?? "").replaceAll(" ", "+");
  const p: number = Number(c.req.query("p"));
  const o: string = c.req.query("o") ?? "";
  const f: number = Number(c.req.query("f"));
  let s: string = c.req.query("s") ?? "";

  if (s == "date") {
    s = "id";
  }

  return <QueryParams>{ query: q, page: p, order: o, sort: s, filter: f };
}
