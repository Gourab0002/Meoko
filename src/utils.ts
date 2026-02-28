import { ServerRequest } from "worktop/request";
import { Constants } from "./constants.ts";
import { QueryParams } from "./models.ts";

export function getCategoryID(c: string, s: string): string {
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

export function getSearchParameters(req: ServerRequest): QueryParams {
  const q: string | null = (req.query.get("q") ?? "").replaceAll(" ", "+");
  const p: number | null = Number(req.query.get("p"));
  const o: string | null = req.query.get("o") ?? "";
  const f: number | null = Number(req.query.get("f"));
  let s: string | null = req.query.get("s") ?? "";

  if (s == "date") {
    s = "id";
  }

  return <QueryParams>{ query: q, page: p, order: o, sort: s, filter: f };
}
