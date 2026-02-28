import { Hono } from "hono";
import { cors } from "hono/cors";
import { Handlers } from "./routes.ts";

const app = new Hono();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Cache-Control", "Content-Type"],
    allowMethods: ["GET"],
  })
);

app.get("/", Handlers.Ping);
app.get("/id/:id", Handlers.GetInfoFromID);
app.get("/user/:username", Handlers.GetUserUploads);
app.get("/:category", Handlers.GetCategoryTorrents);
app.get("/:category/:subcategory", Handlers.GetCategoryTorrents);

Deno.serve({ port: 3000 }, app.fetch);
