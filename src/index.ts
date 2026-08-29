import { Hono } from "hono";
import { cors } from "hono/cors";
import { Constants } from "./constants.ts";
import { Handlers } from "./routes.ts";
import { jsonError } from "./utils.ts";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Cache-Control", "Content-Type"],
    allowMethods: ["GET", "HEAD"],
    exposeHeaders: [
      "X-Page",
      "X-Per-Page",
      "X-Has-Next",
      "X-Total",
      "X-Origin",
      "X-Meoko-Version",
    ],
  })
);

app.use("*", async (c, next) => {
  await next();
  c.header("X-Meoko-Version", Constants.Version);
});

app.get("/", Handlers.Ping);
app.get("/health", Handlers.Health);
app.get("/docs", Handlers.Docs);
app.get("/openapi.json", Handlers.OpenApi);
app.get("/openapi", Handlers.OpenApi);
app.get("/categories", Handlers.Categories);
app.get("/search", Handlers.Search);
app.get("/rss", Handlers.Rss);
app.get("/ids", Handlers.GetBatchInfo);
app.get("/hash/:hash", Handlers.GetInfoFromHash);
app.get("/id/:id/files", Handlers.GetInfoSlice);
app.get("/id/:id/comments", Handlers.GetInfoSlice);
app.get("/id/:id/trackers", Handlers.GetInfoSlice);
app.get("/id/:id", Handlers.GetInfoFromID);
app.get("/user/:username/profile", Handlers.GetUserProfile);
app.get("/user/:username", Handlers.GetUserUploads);
app.get("/:category", Handlers.GetCategoryTorrents);
app.get("/:category/:subcategory", Handlers.GetCategoryTorrents);

app.notFound((c) => jsonError(c, 404, "Not Found"));

export default app;

const deno = (
  globalThis as {
    Deno?: { serve: (options: { port: number }, handler: typeof app.fetch) => void };
  }
).Deno;

if (deno?.serve) {
  deno.serve({ port: 3000 }, app.fetch);
}
