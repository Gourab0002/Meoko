import assert from "node:assert/strict";
import { test } from "node:test";
import { Constants } from "../src/constants.ts";
import { HttpError } from "../src/models.ts";
import { fetchNyaa, looksLikeNyaa, mirrorTimeoutMs } from "../src/utils.ts";

const LISTING = `<table class="torrent-list"><tbody><tr><td><a href="/view/1">One</a></td></tr></tbody></table>`;
const BLOCKED = "<html><title>Blocked</title></html>";
const CHALLENGE = "<html><title>Just a moment...</title></html>";

function page(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: { "content-type": "text/html" },
  });
}

async function withFetch(
  impl: (url: string, init?: RequestInit) => Response | Promise<Response>,
  run: () => Promise<void>
) {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    return impl(String(input), init);
  }) as typeof fetch;
  try {
    await run();
  } finally {
    globalThis.fetch = original;
  }
}

test("looksLikeNyaa accepts listings, views, rss, and empty searches", () => {
  assert.equal(looksLikeNyaa(LISTING), true);
  assert.equal(looksLikeNyaa(`<div id="torrent-description"></div>`), true);
  assert.equal(looksLikeNyaa(`<rss><channel></channel></rss>`), true);
  assert.equal(looksLikeNyaa("No results found"), true);
  assert.equal(looksLikeNyaa("<h3>Browsing alice's torrents</h3>"), true);
  assert.equal(looksLikeNyaa(CHALLENGE), false);
  assert.equal(looksLikeNyaa(BLOCKED), false);
  assert.equal(looksLikeNyaa(""), false);
});

test("mirror timeouts are short until the last mirror", () => {
  assert.equal(mirrorTimeoutMs(0, 2), Constants.HealthTimeoutMs);
  assert.equal(mirrorTimeoutMs(1, 2), Constants.FetchTimeoutMs);
  assert.equal(mirrorTimeoutMs(0, 1), Constants.FetchTimeoutMs);
});

test("fetchNyaa does not try the next mirror after a 404", async () => {
  let calls = 0;
  await withFetch(async () => {
    calls += 1;
    return page("missing", 404);
  }, async () => {
    await assert.rejects(
      () => fetchNyaa("/view/9"),
      (error: unknown) => error instanceof HttpError && error.status === 404
    );
  });
  assert.equal(calls, 1);
});

test("fetchNyaa skips a challenge page and an unrecognized page", async () => {
  const challengeCalls: string[] = [];
  await withFetch(async (url) => {
    challengeCalls.push(url);
    if (url.startsWith("https://nyaa.si")) {
      return page(CHALLENGE);
    }
    return page(LISTING);
  }, async () => {
    const result = await fetchNyaa("/?q=one");
    assert.equal(result.origin, "https://nyaa.land");
  });
  assert.equal(challengeCalls.length, 2);

  const blockedCalls: string[] = [];
  await withFetch(async (url) => {
    blockedCalls.push(url);
    if (url.startsWith("https://nyaa.si")) {
      return page(BLOCKED);
    }
    return page(LISTING);
  }, async () => {
    const result = await fetchNyaa("/?q=two");
    assert.equal(result.origin, "https://nyaa.land");
  });
  assert.equal(blockedCalls.length, 2);

  await withFetch(async () => page(BLOCKED), async () => {
    await assert.rejects(
      () => fetchNyaa("/?q=three"),
      (error: unknown) =>
        error instanceof HttpError &&
        error.status === 502 &&
        error.message.includes("nyaa.land")
    );
  });
});

test("fetchNyaa fails over when the first mirror times out", async () => {
  const calls: string[] = [];
  await withFetch(async (url, init) => {
    calls.push(url);
    if (url.startsWith("https://nyaa.si")) {
      await new Promise((_, reject) => {
        const abort = () => {
          const error = new Error("aborted");
          error.name = "AbortError";
          reject(error);
        };
        if (init?.signal?.aborted) {
          abort();
          return;
        }
        init?.signal?.addEventListener("abort", abort, { once: true });
      });
    }
    return page(LISTING);
  }, async () => {
    const started = Date.now();
    const result = await fetchNyaa("/?q=slow", { timeoutsMs: [30, 80] });
    assert.ok(Date.now() - started < 1000);
    assert.equal(result.origin, "https://nyaa.land");
  });
  assert.equal(calls.length, 2);
  assert.equal(calls[0]?.startsWith("https://nyaa.si"), true);
  assert.equal(calls[1]?.startsWith("https://nyaa.land"), true);
});

test("fetchNyaa serves a second request from the edge cache", async () => {
  const store = new Map<string, Response>();
  const cache = {
    async match(request: Request) {
      const hit = store.get(request.url);
      return hit ? hit.clone() : undefined;
    },
    async put(request: Request, response: Response) {
      store.set(request.url, response.clone());
    },
  };
  const globalAny = globalThis as { caches?: unknown };
  const previous = globalAny.caches;
  globalAny.caches = { default: cache };
  let calls = 0;
  try {
    await withFetch(async () => {
      calls += 1;
      return page(LISTING);
    }, async () => {
      const first = await fetchNyaa("/?c=1_2");
      const second = await fetchNyaa("/?c=1_2");
      assert.equal(first.origin, "https://nyaa.si");
      assert.equal(second.html, first.html);
      assert.equal(second.url, first.url);
      assert.equal(calls, 1);
    });
  } finally {
    if (previous === undefined) {
      delete globalAny.caches;
    } else {
      globalAny.caches = previous;
    }
  }
});
