import * as cheerio from "cheerio";
import { Constants } from "./constants.ts";
import type {
  Comment,
  File,
  FileListStatus,
  FileTreeNode,
  Pagination,
  Submitter,
  Torrent,
  TorrentFile,
  UserProfile,
} from "./models.ts";
import {
  extractCategoryId,
  extractInfoHash,
  extractViewId,
  parseMagnet,
  parseSizeBytes,
  resolveUrl,
  toCount,
} from "./utils.ts";

type CheerioRoot = ReturnType<typeof cheerio.load>;
type CheerioSelection = ReturnType<CheerioRoot>;

const emptySubmitter: Submitter = {
  name: "",
  url: "",
  trusted: false,
  anonymous: false,
};

export function rowFlags(className: string): {
  trusted: boolean;
  remake: boolean;
  hidden: boolean;
  deleted: boolean;
} {
  const classes = ` ${className} `;
  return {
    trusted: classes.includes(" success ") || className.split(/\s+/).includes("success"),
    remake: className.split(/\s+/).includes("danger"),
    hidden: className.split(/\s+/).includes("warning"),
    deleted: className.split(/\s+/).includes("deleted"),
  };
}

function labeledNode(
  $: CheerioRoot,
  scope: CheerioSelection,
  label: string
): CheerioSelection {
  const match = scope.find("div.row > div").filter((_, el) => {
    return $(el).text().replace(/\s+/g, " ").trim() === label;
  });
  return match.first().next();
}

export function labeledValue(
  $: CheerioRoot,
  scope: CheerioSelection,
  label: string
): string {
  return labeledNode($, scope, label)
    .text()
    .replace(/\s+/g, " ")
    .trim();
}

function parseUnix(value: string | undefined): number {
  if (!value) {
    return 0;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

function torrentFromParts(
  partial: Omit<
    Torrent,
    | "categoryId"
    | "uploadedTimestamp"
    | "commentCount"
    | "sizeBytes"
    | "infoHash"
    | "trusted"
    | "remake"
    | "hidden"
    | "deleted"
  > &
    Partial<Torrent>
): Torrent {
  const magnet = partial.magnet ?? "";
  const size = partial.size ?? "";
  return {
    id: partial.id,
    title: partial.title,
    category: partial.category,
    categoryId: partial.categoryId ?? "",
    uploaded: partial.uploaded,
    uploadedTimestamp: partial.uploadedTimestamp ?? 0,
    seeders: partial.seeders,
    leechers: partial.leechers,
    completed: partial.completed,
    commentCount: partial.commentCount ?? 0,
    size,
    sizeBytes: partial.sizeBytes ?? parseSizeBytes(size),
    file: partial.file,
    link: partial.link,
    magnet,
    infoHash: partial.infoHash ?? extractInfoHash(magnet),
    trusted: partial.trusted ?? false,
    remake: partial.remake ?? false,
    hidden: partial.hidden ?? false,
    deleted: partial.deleted ?? false,
  };
}

export function parseTorrentList(html: string, origin: string): Torrent[] {
  const $ = cheerio.load(html);
  const torrents: Torrent[] = [];

  let rows = $("table.torrent-list tbody tr");
  if (!rows.length) {
    rows = $("tbody tr");
  }

  rows.each((_, selection) => {
    const row = $(selection);
    const titleLink = row.find('a[href^="/view/"]').not(".comments").last();
    const torrentPath = titleLink.attr("href") ?? "";
    const id = extractViewId(torrentPath);

    if (!id) {
      return;
    }

    const downloadHref = row.find('a[href^="/download/"]').attr("href");
    const magnetHref = row.find('a[href^="magnet:"]').attr("href");
    const categoryLink = row.find("td:first-child a").first();
    const cells = row.find("td");
    const last = cells.length;
    const dateCell = last >= 4 ? cells.eq(last - 4) : null;
    const size = last >= 5 ? cells.eq(last - 5).text().trim() : "";
    const commentsText = row.find("a.comments").first().text();
    const flags = rowFlags(row.attr("class") ?? "");

    torrents.push(
      torrentFromParts({
        id,
        title: titleLink.text().trim(),
        link: resolveUrl(origin, torrentPath),
        file: resolveUrl(origin, downloadHref),
        magnet: magnetHref ?? "",
        category: categoryLink.attr("title") ?? "",
        categoryId: extractCategoryId(categoryLink.attr("href")),
        size,
        uploaded: dateCell ? dateCell.text().trim() : "",
        uploadedTimestamp: parseUnix(dateCell?.attr("data-timestamp")),
        seeders: last >= 3 ? toCount(cells.eq(last - 3).text()) : 0,
        leechers: last >= 2 ? toCount(cells.eq(last - 2).text()) : 0,
        completed: last >= 1 ? toCount(cells.eq(last - 1).text()) : 0,
        commentCount: toCount(commentsText),
        ...flags,
      })
    );
  });

  return torrents;
}

export function parsePagination(
  html: string,
  itemCount: number,
  requestedPage: number
): Pagination {
  const $ = cheerio.load(html);
  const perPage = Constants.ResultsPerPage;
  const activeText = $("ul.pagination li.active").first().text();
  const activePage = toCount(activeText);
  const page = activePage > 0 ? activePage : requestedPage > 0 ? requestedPage : 1;

  const nextEnabled = $("ul.pagination li.next").not(".disabled").length > 0;
  let laterPage = false;
  $("ul.pagination a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    const value = extractQueryNumber(href, "p");
    if (value > page) {
      laterPage = true;
    }
  });

  const hasNext =
    itemCount === 0 ? false : nextEnabled || laterPage || itemCount >= perPage;

  let total: number | null = null;
  const boldTotal = html.match(/of\s+<b>([\d,]+)<\/b>/i);
  const textTotal = html.match(/of\s+([\d,]+)\s+items/i);
  if (boldTotal) {
    total = toCount(boldTotal[1]);
  } else if (textTotal) {
    total = toCount(textTotal[1]);
  }

  return { page, perPage, hasNext, total };
}

function extractQueryNumber(href: string, key: string): number {
  try {
    return toCount(new URL(href, "https://nyaa.si").searchParams.get(key) ?? "");
  } catch {
    const match = href.match(new RegExp(`[?&]${key}=(\\d+)`));
    return match ? Number(match[1]) : 0;
  }
}

export function parseUserProfile(
  html: string,
  origin: string,
  username: string
): UserProfile | null {
  const $ = cheerio.load(html);
  const heading = $("h3").filter((_, el) => {
    return /browsing/i.test($(el).text());
  }).first();

  if (!heading.length) {
    return {
      username,
      url: `${origin}/user/${encodeURIComponent(username)}`,
      level: "",
      trusted: false,
      uploadCount: null,
    };
  }

  const span = heading.find("span").first();
  const name = span.text().trim() || username;
  const level = span.attr("title") ?? "";
  const cls = span.attr("class") ?? "";
  const countMatch = heading.text().match(/\(([\d,]+)\)\s*$/);

  return {
    username: name,
    url: `${origin}/user/${encodeURIComponent(name)}`,
    level,
    trusted: cls.includes("text-success") || /trusted/i.test(level),
    uploadCount: countMatch ? toCount(countMatch[1]) : null,
  };
}

export function parseListing(
  html: string,
  origin: string,
  requestedPage = 1,
  username?: string
): {
  torrents: Torrent[];
  pagination: Pagination;
  user: UserProfile | null;
} {
  const torrents = parseTorrentList(html, origin);
  return {
    torrents,
    pagination: parsePagination(html, torrents.length, requestedPage),
    user: username ? parseUserProfile(html, origin, username) : null,
  };
}

function parseFileItems($: CheerioRoot, list: CheerioSelection): FileTreeNode[] {
  const nodes: FileTreeNode[] = [];

  list.children("li").each((_, li) => {
    const el = $(li);
    const folderLink = el.children("a.folder");

    if (folderLink.length) {
      const nested = el.children("ul");
      nodes.push({
        type: "folder",
        name: folderLink.text().trim(),
        children: nested.length ? parseFileItems($, nested) : [],
      });
      return;
    }

    const sizeEl = el.children("span.file-size");
    const size = sizeEl.text().replace(/[()]/g, "").trim();
    const name = el.clone().children().remove().end().text().replace(/\s+/g, " ").trim();

    if (!name) {
      return;
    }

    nodes.push({
      type: "file",
      name,
      size,
      sizeBytes: parseSizeBytes(size),
    });
  });

  return nodes;
}

export function flattenFileTree(
  nodes: FileTreeNode[],
  prefix: string[] = []
): TorrentFile[] {
  const files: TorrentFile[] = [];

  for (const node of nodes) {
    if (node.type === "file") {
      const pathParts = [...prefix, node.name];
      files.push({
        name: node.name,
        size: node.size,
        sizeBytes: node.sizeBytes,
        path: pathParts.join("/"),
      });
    } else {
      files.push(...flattenFileTree(node.children, [...prefix, node.name]));
    }
  }

  return files;
}

function parseFileList(
  $: CheerioRoot,
  container: CheerioSelection
): { tree: FileTreeNode[]; files: TorrentFile[]; status: FileListStatus } {
  const fileList = container.find(".torrent-file-list").first();
  if (fileList.length) {
    const tree = parseFileItems($, fileList.children("ul").first());
    return { tree, files: flattenFileTree(tree), status: "ok" };
  }

  const titles = container
    .find("h3.panel-title")
    .toArray()
    .map((el) => $(el).text().replace(/\s+/g, " ").trim());

  if (titles.some((title) => /too many files/i.test(title))) {
    return { tree: [], files: [], status: "too_many" };
  }

  if (titles.some((title) => /file list is not available/i.test(title))) {
    return { tree: [], files: [], status: "unavailable" };
  }

  return { tree: [], files: [], status: "unavailable" };
}

function parseSubmitter(
  $: CheerioRoot,
  container: CheerioSelection,
  origin: string
): Submitter {
  const node = labeledNode($, container, "Submitter:");
  if (!node.length) {
    return emptySubmitter;
  }

  const link = node.find("a").first();
  const name = node.text().replace(/\s+/g, " ").trim();
  const href = link.attr("href");
  const title = link.attr("title") ?? "";
  const cls = link.attr("class") ?? "";

  return {
    name,
    url: resolveUrl(origin, href),
    trusted: cls.includes("text-success") || /trusted/i.test(title),
    anonymous: /^anonymous/i.test(name),
  };
}

function parseInformation(
  $: CheerioRoot,
  container: CheerioSelection,
  origin: string
): string {
  const node = labeledNode($, container, "Information:");
  if (!node.length) {
    return "";
  }

  const href = node.find("a").attr("href");
  const text = node.text().replace(/\s+/g, " ").trim();
  if (!text || /^no information\.?$/i.test(text)) {
    return "";
  }

  if (href && !href.startsWith("javascript:")) {
    return resolveUrl(origin, href);
  }

  return text;
}

function parseComments($: CheerioRoot, container: CheerioSelection, origin: string): Comment[] {
  const comments: Comment[] = [];

  container.find("div#comments div.comment-panel").each((index, selection) => {
    const panel = $(selection);
    const element = panel.find("div.panel-body");
    const avatar = element.find("img.avatar").attr("src");
    const userLink = element.find('a[href^="/user/"]').first();
    const timestampEl = element.find("small[data-timestamp]").first();
    const idAttr = panel.attr("id") ?? "";
    const parsedId = toCount(idAttr.replace(/^com-/i, ""));
    const userParagraph = element.find("p").first().text();

    comments.push({
      id: parsedId || index + 1,
      name: userLink.text().trim() || element.find("a").first().text().trim(),
      content: element.find("div.comment-content").text(),
      image: resolveUrl(origin, avatar || "/static/img/avatar/default.png"),
      timestamp: timestampEl.text().trim(),
      timestampUnix: parseUnix(timestampEl.attr("data-timestamp")),
      edited: element.find("small").toArray().some((el) => /edited/i.test($(el).text())),
      uploader: /\(uploader\)/i.test(userParagraph),
      profile: resolveUrl(origin, userLink.attr("href")),
    });
  });

  return comments;
}

function panelFlags(container: CheerioSelection): {
  trusted: boolean;
  remake: boolean;
  hidden: boolean;
  deleted: boolean;
} {
  const panel = container.find(".panel").first();
  const cls = panel.attr("class") ?? "";
  const headingStyle = panel.find(".panel-heading").attr("style") ?? "";
  return {
    trusted: cls.includes("panel-success"),
    remake: cls.includes("panel-danger"),
    hidden: /darkgray/i.test(headingStyle),
    deleted: cls.includes("panel-deleted") || cls.includes("deleted"),
  };
}

export function parseFileInfo(
  html: string,
  origin: string,
  fileId: number
): File | null {
  const $ = cheerio.load(html);
  const container = $("body div.container").last();

  if (!container.length) {
    return null;
  }

  const title = container
    .find(".panel-heading h3.panel-title")
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();

  if (!title) {
    return null;
  }

  const downloadHref = container.find('a[href^="/download/"]').attr("href");
  const magnetHref = container.find('a[href^="magnet:"]').attr("href") ?? "";
  const magnet = parseMagnet(magnetHref);
  const infoHash =
    container.find("kbd").first().text().trim() || magnet.infoHash;
  const commentTitle = container.find("div#comments h3.panel-title").first().text();
  const commentParts = commentTitle.split("-");
  const listedCount = toCount(commentParts[commentParts.length - 1] ?? "0");
  const comments = parseComments($, container, origin);
  const dateNode = labeledNode($, container, "Date:");
  const categoryNode = labeledNode($, container, "Category:");
  const categoryHref =
    categoryNode.find('a[href*="c="]').last().attr("href") ??
    categoryNode.find('a[href*="c="]').first().attr("href");
  const size = labeledValue($, container, "File size:");
  const submitter = parseSubmitter($, container, origin);
  const fileList = parseFileList($, container);
  const flags = panelFlags(container);

  const torrentData = torrentFromParts({
    title,
    file: resolveUrl(origin, downloadHref),
    link: `${origin}/view/${fileId}`,
    id: fileId,
    magnet: magnetHref,
    size,
    category: categoryNode.text().replace(/\s+/g, " ").trim(),
    categoryId: extractCategoryId(categoryHref),
    uploaded: dateNode.text().replace(/\s+/g, " ").trim(),
    uploadedTimestamp: parseUnix(dateNode.attr("data-timestamp")),
    seeders: toCount(labeledValue($, container, "Seeders:")),
    leechers: toCount(labeledValue($, container, "Leechers:")),
    completed: toCount(labeledValue($, container, "Completed:")),
    commentCount: Math.max(listedCount, comments.length),
    infoHash,
    ...flags,
  });

  return {
    torrent: torrentData,
    description: container.find("div.panel-body#torrent-description").text(),
    submittedBy: submitter.name,
    submitter,
    information: parseInformation($, container, origin),
    infoHash,
    trackers: magnet.trackers,
    files: fileList.files,
    fileTree: fileList.tree,
    fileListStatus: fileList.status,
    commentInfo: {
      count: Math.max(listedCount, comments.length),
      comments,
    },
    origin,
  };
}

function decodeXml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function rssChildText(item: CheerioSelection, localName: string): string {
  const html = item.html() ?? "";
  const match = html.match(
    new RegExp(
      `<(?:[\\w.-]+:)?${localName}\\b[^>]*>([\\s\\S]*?)</(?:[\\w.-]+:)?${localName}>`,
      "i"
    )
  );
  if (match) {
    return decodeXml(match[1].replace(/\s+/g, " ").trim());
  }

  const exact = item.find(localName).first().text().trim();
  if (exact) {
    return exact;
  }

  return item.find(`nyaa\\:${localName}`).first().text().trim();
}

function rssYes(value: string): boolean {
  return /^(yes|true|1)$/i.test(value.trim());
}

export function isViewPage(html: string, url = ""): boolean {
  if (/\/view\/\d+/.test(url)) {
    return true;
  }
  return /id=["']torrent-description["']/.test(html);
}

export function parseRss(xml: string, origin: string): Torrent[] {
  const $ = cheerio.load(xml, { xml: true });
  const torrents: Torrent[] = [];

  $("item").each((_, el) => {
    const item = $(el);
    const guid = item.find("guid").first().text().trim();
    const link = item.find("link").first().text().trim();
    const title = item.find("title").first().text().trim();
    const id = extractViewId(guid) || extractViewId(link);
    const infoHash = rssChildText(item, "infoHash");
    const size = rssChildText(item, "size");
    const magnet = link.startsWith("magnet:")
      ? link
      : infoHash
        ? `magnet:?xt=urn:btih:${infoHash}`
        : "";
    const file = /^https?:/i.test(link) && /\/download\//.test(link) ? link : "";
    const pubDate = item.find("pubDate").first().text().trim();
    const uploadedTimestamp = pubDate ? Math.floor(Date.parse(pubDate) / 1000) || 0 : 0;

    if (!id && !title) {
      return;
    }

    torrents.push(
      torrentFromParts({
        id,
        title,
        category: rssChildText(item, "category"),
        categoryId: rssChildText(item, "categoryId"),
        uploaded: pubDate,
        uploadedTimestamp,
        seeders: toCount(rssChildText(item, "seeders")),
        leechers: toCount(rssChildText(item, "leechers")),
        completed: toCount(rssChildText(item, "downloads")),
        commentCount: toCount(rssChildText(item, "comments")),
        size,
        file,
        link: guid || (id ? `${origin}/view/${id}` : ""),
        magnet,
        infoHash,
        trusted: rssYes(rssChildText(item, "trusted")),
        remake: rssYes(rssChildText(item, "remake")),
      })
    );
  });

  return torrents;
}

export function parseRssMeta(xml: string): { title: string; description: string } {
  const $ = cheerio.load(xml, { xml: true });
  const channel = $("channel").first();
  return {
    title: channel.children("title").first().text().trim(),
    description: channel.children("description").first().text().trim(),
  };
}
