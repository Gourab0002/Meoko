export interface Torrent {
  id: number;
  title: string;
  category: string;
  categoryId: string;
  uploaded: string;
  uploadedTimestamp: number;
  seeders: number;
  leechers: number;
  completed: number;
  commentCount: number;
  size: string;
  sizeBytes: number;
  file: string;
  link: string;
  magnet: string;
  infoHash: string;
  trusted: boolean;
  remake: boolean;
  hidden: boolean;
  deleted: boolean;
}

export interface Submitter {
  name: string;
  url: string;
  trusted: boolean;
  anonymous: boolean;
}

export interface TorrentFile {
  name: string;
  size: string;
  sizeBytes: number;
  path: string;
}

export type FileTreeNode =
  | {
      type: "file";
      name: string;
      size: string;
      sizeBytes: number;
    }
  | {
      type: "folder";
      name: string;
      children: FileTreeNode[];
    };

export type FileListStatus = "ok" | "unavailable" | "too_many";

export interface File {
  torrent: Torrent;
  description: string;
  submittedBy: string;
  submitter: Submitter;
  information: string;
  infoHash: string;
  trackers: string[];
  files: TorrentFile[];
  fileTree: FileTreeNode[];
  fileListStatus: FileListStatus;
  commentInfo: Comments;
  origin: string;
}

export interface Comment {
  id: number;
  name: string;
  content: string;
  image: string;
  timestamp: string;
  timestampUnix: number;
  edited: boolean;
  uploader: boolean;
  profile: string;
}

export interface Comments {
  count: number;
  comments: Comment[];
}

export interface UserProfile {
  username: string;
  url: string;
  level: string;
  trusted: boolean;
  uploadCount: number | null;
}

export interface Pagination {
  page: number;
  perPage: number;
  hasNext: boolean;
  total: number | null;
}

export interface ListingResult {
  torrents: Torrent[];
  pagination: Pagination;
  user: UserProfile | null;
  origin: string;
}

export interface ListingResponse {
  torrents: Torrent[];
  page: number;
  perPage: number;
  hasNext: boolean;
  total: number | null;
  origin: string;
  user?: UserProfile;
}

export interface QueryParams {
  query: string;
  sort: string;
  order: string;
  page: number;
  filter: number;
  category: string;
  exclude: string;
  envelope: boolean;
  magnets: boolean;
  user: string;
}

export interface FetchResult {
  origin: string;
  html: string;
  status: number;
  url: string;
}

export interface MirrorStatus {
  origin: string;
  ok: boolean;
  status: number | null;
  error: string | null;
  ms: number;
}

export interface ErrorBody {
  error: string;
  status: number;
}

export type ErrorStatus = 400 | 404 | 502 | 503;

export class HttpError extends Error {
  status: ErrorStatus;

  constructor(status: ErrorStatus, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
