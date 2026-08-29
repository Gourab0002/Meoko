import assert from "node:assert/strict";
import { test } from "node:test";
import {
  flattenFileTree,
  parseFileInfo,
  parseListing,
  parsePagination,
  parseRss,
  parseTorrentList,
  parseUserProfile,
} from "../src/scrapers.ts";
import {
  buildSearchQuery,
  extractCategoryId,
  extractInfoHash,
  extractViewId,
  getCategoryID,
  getSearchParameters,
  isKnownCategory,
  isKnownSubcategory,
  isValidId,
  isValidInfoHash,
  isValidUsername,
  parseIdList,
  parseMagnet,
  parseSizeBytes,
  resolveCategoryParam,
  resolveUrl,
  toCount,
  wantsEnvelope,
} from "../src/utils.ts";

const LISTING_HTML = `
<table class="table torrent-list">
  <tbody>
    <tr class="default">
      <td><a href="/?c=1_4" title="Anime - Raw"><img alt="Anime - Raw"></a></td>
      <td colspan="2">
        <a href="/view/2148068" title="Sample Torrent">Sample Torrent</a>
      </td>
      <td class="text-center">
        <a href="/download/2148068.torrent"></a>
        <a href="magnet:?xt=urn:btih:abc123&amp;dn=Sample"></a>
      </td>
      <td class="text-center">146.6 GiB</td>
      <td class="text-center" data-timestamp="1787059960">2026-08-18 13:54</td>
      <td class="text-center">1</td>
      <td class="text-center">2</td>
      <td class="text-center">3</td>
    </tr>
    <tr class="success">
      <td><a href="/?c=1_2" title="Anime - English-translated"><img></a></td>
      <td colspan="2">
        <a href="/view/2148063#comments" class="comments" title="2 comments">
          <i class="fa fa-comments-o"></i>2
        </a>
        <a href="/view/2148063" title="Commented Torrent">Commented Torrent</a>
      </td>
      <td class="text-center">
        <a href="magnet:?xt=urn:btih:def456"></a>
      </td>
      <td class="text-center">1.3 GiB</td>
      <td class="text-center" data-timestamp="1787059921">2026-08-18 13:32</td>
      <td class="text-center">70</td>
      <td class="text-center">2</td>
      <td class="text-center">1109</td>
    </tr>
    <tr class="danger">
      <td><a href="/?c=1_2" title="Anime - English-translated"><img></a></td>
      <td colspan="2">
        <a href="/view/2148001">Remake Torrent</a>
      </td>
      <td class="text-center">
        <a href="magnet:?xt=urn:btih:aaa111"></a>
      </td>
      <td class="text-center">12.0 MiB</td>
      <td class="text-center" data-timestamp="1787000000">2026-08-17 00:00</td>
      <td class="text-center">0</td>
      <td class="text-center">1</td>
      <td class="text-center">4</td>
    </tr>
  </tbody>
</table>
<div class="center">
  <ul class="pagination">
    <li class="previous disabled"><a href="#">Previous</a></li>
    <li class="active"><a href="#">1</a></li>
    <li><a href="?p=2">2</a></li>
    <li class="next"><a href="?p=2">Next</a></li>
  </ul>
  <p>Displaying <b>1</b> - <b>75</b> of <b>1,234</b> items</p>
</div>
`;

const USER_HTML = `
<div class="row">
  <h3>
    Browsing <span class="text-success" data-toggle="tooltip" title="Trusted">subsplease</span>'s torrents
    (1,109)
  </h3>
</div>
${LISTING_HTML}
`;

const VIEW_HTML = `
<body>
  <div class="container">ad</div>
  <div class="container">
    <div class="panel panel-success">
      <div class="panel-heading">
        <h3 class="panel-title">[SubsPlease] Example - 08 (1080p).mkv</h3>
      </div>
      <div class="panel-body">
        <div class="row">
          <div class="col-md-1">Category:</div>
          <div class="col-md-5"><a href="/?c=1_0">Anime</a> - <a href="/?c=1_2">English-translated</a></div>
          <div class="col-md-1">Date:</div>
          <div class="col-md-5" data-timestamp="1787059921">2026-08-18 13:32 UTC</div>
        </div>
        <div class="row">
          <div class="col-md-1">Submitter:</div>
          <div class="col-md-5"><a class="text-success" href="/user/subsplease" title="Trusted">subsplease</a></div>
          <div class="col-md-1">Seeders:</div>
          <div class="col-md-5"><span style="color: green;">70</span></div>
        </div>
        <div class="row">
          <div class="col-md-1">Information:</div>
          <div class="col-md-5"><a href="https://subsplease.org/">https://subsplease.org/</a></div>
          <div class="col-md-1">Leechers:</div>
          <div class="col-md-5"><span style="color: red;">2</span></div>
        </div>
        <div class="row">
          <div class="col-md-1">File size:</div>
          <div class="col-md-5">1.3 GiB</div>
          <div class="col-md-1">Completed:</div>
          <div class="col-md-5">0</div>
        </div>
        <div class="row">
          <div class="col-md-offset-6 col-md-1">Info hash:</div>
          <div class="col-md-5"><kbd>e386a18cbd5525b5515a3b118e365033ec190465</kbd></div>
          <br><hr><div>advertisement</div>
        </div>
      </div>
      <div class="panel-footer clearfix">
        <a href="/download/2148063.torrent">Download Torrent</a>
        or
        <a href="magnet:?xt=urn:btih:e386a18cbd5525b5515a3b118e365033ec190465&amp;dn=Example&amp;tr=http://nyaa.tracker.wf:7777/announce">Magnet</a>
      </div>
    </div>
    <div markdown-text class="panel-body" id="torrent-description">Released by SubsPlease</div>
    <div class="panel panel-default">
      <div class="panel-heading">
        <h3 class="panel-title">File list</h3>
      </div>
      <div class="torrent-file-list panel-body">
        <ul>
          <li>
            <a href="" class="folder"><i class="fa fa-folder-open"></i>Example</a>
            <ul data-show="yes">
              <li><i class="fa fa-file"></i>[SubsPlease] Example - 08 (1080p).mkv <span class="file-size">(1.3 GiB)</span></li>
            </ul>
          </li>
        </ul>
      </div>
    </div>
    <div id="comments" class="panel panel-default">
      <div class="panel-heading">
        <h3 class="panel-title">Comments - 1</h3>
      </div>
      <div class="comment-panel" id="com-1">
        <div class="panel-body">
          <p>
            <a href="/user/alice">alice</a>
            (uploader)
          </p>
          <img class="avatar" src="/static/img/avatar/default.png">
          <div class="comment-details">
            <a href="#com-1"><small data-timestamp="1787059921">2026-08-18 13:32 UTC</small></a>
            <small data-timestamp="1787059999">(edited)</small>
          </div>
          <div class="comment-body">
            <div class="comment-content">Thanks for the upload</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
`;

const RSS_XML = `<?xml version="1.0"?>
<rss xmlns:nyaa="https://nyaa.si/xmlns/nyaa" version="2.0">
  <channel>
    <title>Nyaa - "test" - Torrent File RSS</title>
    <description>RSS Feed for "test"</description>
    <item>
      <title>Commented Torrent</title>
      <link>https://nyaa.land/download/2148063.torrent</link>
      <guid isPermaLink="true">https://nyaa.land/view/2148063</guid>
      <pubDate>Tue, 18 Aug 2026 13:32:00 -0000</pubDate>
      <nyaa:seeders>70</nyaa:seeders>
      <nyaa:leechers>2</nyaa:leechers>
      <nyaa:downloads>1109</nyaa:downloads>
      <nyaa:infoHash>e386a18cbd5525b5515a3b118e365033ec190465</nyaa:infoHash>
      <nyaa:categoryId>1_2</nyaa:categoryId>
      <nyaa:category>Anime - English-translated</nyaa:category>
      <nyaa:size>1.3 GiB</nyaa:size>
      <nyaa:comments>2</nyaa:comments>
      <nyaa:trusted>Yes</nyaa:trusted>
      <nyaa:remake>No</nyaa:remake>
    </item>
  </channel>
</rss>`;

test("parseTorrentList maps listing rows including magnet-only torrents", () => {
  const torrents = parseTorrentList(LISTING_HTML, "https://nyaa.land");

  assert.equal(torrents.length, 3);

  assert.deepEqual(torrents[0], {
    id: 2148068,
    title: "Sample Torrent",
    link: "https://nyaa.land/view/2148068",
    file: "https://nyaa.land/download/2148068.torrent",
    magnet: "magnet:?xt=urn:btih:abc123&dn=Sample",
    category: "Anime - Raw",
    categoryId: "1_4",
    size: "146.6 GiB",
    sizeBytes: parseSizeBytes("146.6 GiB"),
    uploaded: "2026-08-18 13:54",
    uploadedTimestamp: 1787059960,
    seeders: 1,
    leechers: 2,
    completed: 3,
    commentCount: 0,
    infoHash: "abc123",
    trusted: false,
    remake: false,
    hidden: false,
    deleted: false,
  });

  assert.equal(torrents[1].id, 2148063);
  assert.equal(torrents[1].title, "Commented Torrent");
  assert.equal(torrents[1].file, "");
  assert.equal(torrents[1].magnet, "magnet:?xt=urn:btih:def456");
  assert.equal(torrents[1].seeders, 70);
  assert.equal(torrents[1].completed, 1109);
  assert.equal(torrents[1].commentCount, 2);
  assert.equal(torrents[1].trusted, true);
  assert.equal(torrents[1].categoryId, "1_2");
  assert.equal(torrents[2].remake, true);
  assert.equal(torrents[2].trusted, false);
});

test("parseListing reads pagination metadata", () => {
  const listing = parseListing(LISTING_HTML, "https://nyaa.land", 1);
  assert.equal(listing.pagination.page, 1);
  assert.equal(listing.pagination.perPage, 75);
  assert.equal(listing.pagination.hasNext, true);
  assert.equal(listing.pagination.total, 1234);
});

test("parsePagination treats a short last page as terminal", () => {
  const html = `<table class="torrent-list"><tbody></tbody></table><ul class="pagination"><li class="active"><a>3</a></li><li class="next disabled"><a>Next</a></li></ul>`;
  const pagination = parsePagination(html, 10, 3);
  assert.equal(pagination.page, 3);
  assert.equal(pagination.hasNext, false);
});

test("parseFileInfo reads labeled fields, hash, files, and comments", () => {
  const file = parseFileInfo(VIEW_HTML, "https://nyaa.land", 2148063);

  assert.ok(file);
  assert.equal(file.torrent.title, "[SubsPlease] Example - 08 (1080p).mkv");
  assert.equal(file.torrent.category, "Anime - English-translated");
  assert.equal(file.torrent.categoryId, "1_2");
  assert.equal(file.torrent.uploaded, "2026-08-18 13:32 UTC");
  assert.equal(file.torrent.uploadedTimestamp, 1787059921);
  assert.equal(file.torrent.seeders, 70);
  assert.equal(file.torrent.leechers, 2);
  assert.equal(file.torrent.size, "1.3 GiB");
  assert.equal(file.torrent.completed, 0);
  assert.equal(file.torrent.file, "https://nyaa.land/download/2148063.torrent");
  assert.equal(
    file.torrent.magnet,
    "magnet:?xt=urn:btih:e386a18cbd5525b5515a3b118e365033ec190465&dn=Example&tr=http://nyaa.tracker.wf:7777/announce"
  );
  assert.equal(file.torrent.trusted, true);
  assert.equal(file.torrent.commentCount, 1);
  assert.equal(file.submittedBy, "subsplease");
  assert.equal(file.submitter.trusted, true);
  assert.equal(file.submitter.url, "https://nyaa.land/user/subsplease");
  assert.equal(file.information, "https://subsplease.org/");
  assert.equal(file.infoHash, "e386a18cbd5525b5515a3b118e365033ec190465");
  assert.deepEqual(file.trackers, ["http://nyaa.tracker.wf:7777/announce"]);
  assert.equal(file.description, "Released by SubsPlease");
  assert.equal(file.fileListStatus, "ok");
  assert.equal(file.files.length, 1);
  assert.equal(file.files[0].path, "Example/[SubsPlease] Example - 08 (1080p).mkv");
  assert.equal(file.fileTree[0].type, "folder");
  assert.equal(file.commentInfo.count, 1);
  assert.equal(file.commentInfo.comments[0].name, "alice");
  assert.equal(file.commentInfo.comments[0].content, "Thanks for the upload");
  assert.equal(file.commentInfo.comments[0].timestamp, "2026-08-18 13:32 UTC");
  assert.equal(file.commentInfo.comments[0].timestampUnix, 1787059921);
  assert.equal(file.commentInfo.comments[0].id, 1);
  assert.equal(file.commentInfo.comments[0].edited, true);
  assert.equal(file.commentInfo.comments[0].uploader, true);
  assert.equal(file.commentInfo.comments[0].profile, "https://nyaa.land/user/alice");
  assert.equal(
    file.commentInfo.comments[0].image,
    "https://nyaa.land/static/img/avatar/default.png"
  );
});

test("parseFileInfo returns null for empty markup", () => {
  assert.equal(parseFileInfo("<html></html>", "https://nyaa.si", 1), null);
});

test("flattenFileTree walks nested folders", () => {
  const files = flattenFileTree([
    {
      type: "folder",
      name: "A",
      children: [{ type: "file", name: "b.mkv", size: "1 B", sizeBytes: 1 }],
    },
  ]);
  assert.deepEqual(files, [{ name: "b.mkv", size: "1 B", sizeBytes: 1, path: "A/b.mkv" }]);
});

test("parseRss maps namespaced nyaa fields", () => {
  const torrents = parseRss(RSS_XML, "https://nyaa.land");
  assert.equal(torrents.length, 1);
  assert.equal(torrents[0].id, 2148063);
  assert.equal(torrents[0].title, "Commented Torrent");
  assert.equal(torrents[0].seeders, 70);
  assert.equal(torrents[0].completed, 1109);
  assert.equal(torrents[0].infoHash, "e386a18cbd5525b5515a3b118e365033ec190465");
  assert.equal(torrents[0].categoryId, "1_2");
  assert.equal(torrents[0].trusted, true);
  assert.equal(torrents[0].remake, false);
  assert.equal(torrents[0].file, "https://nyaa.land/download/2148063.torrent");
  assert.equal(
    torrents[0].magnet,
    "magnet:?xt=urn:btih:e386a18cbd5525b5515a3b118e365033ec190465"
  );
});

test("parseUserProfile reads trusted heading and upload count", () => {
  const user = parseUserProfile(USER_HTML, "https://nyaa.land", "subsplease");
  assert.ok(user);
  assert.equal(user.username, "subsplease");
  assert.equal(user.trusted, true);
  assert.equal(user.level, "Trusted");
  assert.equal(user.uploadCount, 1109);
});

test("category helpers accept documented software/application alias", () => {
  assert.equal(isKnownCategory("software"), true);
  assert.equal(isKnownCategory("id"), false);
  assert.equal(isKnownSubcategory("anime", "eng"), true);
  assert.equal(isKnownSubcategory("anime", "nope"), false);
  assert.equal(getCategoryID("software", "application"), "6_1");
  assert.equal(getCategoryID("software", "applications"), "6_1");
  assert.equal(getCategoryID("software", undefined), "6_0");
  assert.equal(getCategoryID("missing", "raw"), "0_0");
  assert.equal(getCategoryID("anime", "nope"), "1_0");
  assert.equal(resolveCategoryParam("1_2"), "1_2");
  assert.equal(resolveCategoryParam("anime/eng"), "1_2");
  assert.equal(resolveCategoryParam("anime.raw"), "1_4");
  assert.equal(resolveCategoryParam("nope"), undefined);
  assert.equal(resolveCategoryParam("anime/nope"), undefined);
});

test("validation helpers reject unsafe ids and usernames", () => {
  assert.equal(isValidId("2148063"), true);
  assert.equal(isValidId("../etc"), false);
  assert.equal(isValidId("12abc"), false);
  assert.equal(isValidUsername("subsplease"), true);
  assert.equal(isValidUsername("a_b-1"), true);
  assert.equal(isValidUsername("../view"), false);
  assert.equal(isValidUsername("user/name"), false);
  assert.equal(isValidInfoHash("e386a18cbd5525b5515a3b118e365033ec190465"), true);
  assert.equal(isValidInfoHash("not-a-hash"), false);
  assert.deepEqual(parseIdList("1, 2,3"), ["1", "2", "3"]);
});

test("query builder encodes values and omits empty optional fields", () => {
  const query = buildSearchQuery(
    {
      query: "foo & bar",
      page: 2,
      sort: "seeders",
      order: "asc",
      filter: 1,
      category: "",
      exclude: "",
      envelope: false,
      magnets: false,
      user: "",
    },
    { c: "1_2" }
  );
  const params = new URLSearchParams(query);

  assert.equal(params.get("q"), "foo & bar");
  assert.equal(params.get("c"), "1_2");
  assert.equal(params.get("p"), "2");
  assert.equal(params.get("s"), "seeders");
  assert.equal(params.get("o"), "asc");
  assert.equal(params.get("f"), "1");
});

test("getSearchParameters defaults NaN-safe values and accepts filter alias", () => {
  const c = {
    req: {
      query: (key: string) =>
        ({ q: "one two", s: "date", filter: "2", p: "not-a-number" } as Record<
          string,
          string
        >)[key],
    },
  };

  const params = getSearchParameters(c as never);

  assert.equal(params.query, "one two");
  assert.equal(params.sort, "id");
  assert.equal(params.page, 1);
  assert.equal(params.filter, 2);
  assert.equal(params.order, "");
});

test("getSearchParameters resolves c and envelope flags", () => {
  const c = {
    req: {
      query: (key: string) =>
        ({ c: "anime/eng", envelope: "1", magnets: "1" } as Record<string, string>)[key],
    },
  };

  const params = getSearchParameters(c as never);
  assert.equal(params.category, "1_2");
  assert.equal(params.envelope, true);
  assert.equal(params.magnets, true);
});

test("wantsEnvelope is opt-in on category routes", () => {
  const none = { req: { query: () => undefined } };
  const on = { req: { query: (key: string) => (key === "envelope" ? "1" : undefined) } };
  const off = { req: { query: (key: string) => (key === "flat" ? "1" : undefined) } };

  assert.equal(wantsEnvelope(none as never, false), false);
  assert.equal(wantsEnvelope(none as never, true), true);
  assert.equal(wantsEnvelope(on as never, false), true);
  assert.equal(wantsEnvelope(off as never, true), false);
});

test("url, magnet, size, and number helpers", () => {
  assert.equal(resolveUrl("https://nyaa.land", "/view/1"), "https://nyaa.land/view/1");
  assert.equal(resolveUrl("https://nyaa.land", "magnet:?xt=1"), "magnet:?xt=1");
  assert.equal(resolveUrl("https://nyaa.land", undefined), "");
  assert.equal(toCount("1,109"), 1109);
  assert.equal(toCount(""), 0);
  assert.equal(extractViewId("/view/2148063#comments"), 2148063);
  assert.equal(extractViewId("nope"), 0);
  assert.equal(extractCategoryId("/?c=1_2"), "1_2");
  assert.equal(extractInfoHash("magnet:?xt=urn:btih:abc123&dn=x"), "abc123");
  assert.equal(parseSizeBytes("1.3 GiB"), Math.round(1.3 * 1024 ** 3));
  assert.equal(parseSizeBytes("12.0 MiB"), Math.round(12 * 1024 ** 2));
  assert.deepEqual(parseMagnet("magnet:?xt=urn:btih:abc&dn=n&tr=udp://a&tr=udp://b"), {
    infoHash: "abc",
    name: "n",
    trackers: ["udp://a", "udp://b"],
  });
});
