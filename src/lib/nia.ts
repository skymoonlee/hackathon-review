// GitHub repo context fetcher.
// Originally backed by the `nia` CLI; now uses the GitHub REST API directly so it
// works on serverless platforms (Vercel) where no CLI binary is available.
// Function names are kept for backwards compatibility with existing call sites.

import { SERVER_ENV } from "@/config/env";

export interface RepoCoord {
  owner: string;
  repo: string;
}

export class NiaError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "NiaError";
  }
}

const GITHUB_API = "https://api.github.com";
const GITHUB_HOST_RE = /^https?:\/\/github\.com\/([^/\s]+)\/([^/\s#?]+)/i;

export function parseGitHubUrl(input: string): RepoCoord | null {
  if (!input) return null;
  const trimmed = input.trim();
  const m = GITHUB_HOST_RE.exec(trimmed);
  if (m) {
    return { owner: m[1]!, repo: m[2]!.replace(/\.git$/i, "") };
  }
  // Allow plain "owner/repo" too.
  const slash = trimmed.split("/").filter(Boolean);
  if (slash.length === 2 && !slash[0]!.includes(" ") && !slash[1]!.includes(" ")) {
    return { owner: slash[0]!, repo: slash[1]!.replace(/\.git$/i, "") };
  }
  return null;
}

function authHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "hackathon-review",
  };
  if (SERVER_ENV.githubToken) headers.authorization = `Bearer ${SERVER_ENV.githubToken}`;
  return headers;
}

async function ghFetch(url: string): Promise<Response> {
  const res = await fetch(url, { headers: authHeaders(), cache: "no-store" });
  return res;
}

interface RepoMeta {
  default_branch: string;
}

interface TreeEntry {
  path: string;
  type: "blob" | "tree" | "commit";
}

interface TreeResponse {
  tree: TreeEntry[];
  truncated: boolean;
}

interface RepoSnapshot {
  defaultBranch: string;
  entries: TreeEntry[];
  truncated: boolean;
}

const snapshotCache = new Map<string, Promise<RepoSnapshot>>();

function snapshotKey(coord: RepoCoord): string {
  return `${coord.owner.toLowerCase()}/${coord.repo.toLowerCase()}`;
}

async function getSnapshot(coord: RepoCoord): Promise<RepoSnapshot> {
  const key = snapshotKey(coord);
  const cached = snapshotCache.get(key);
  if (cached) return cached;

  const promise = (async (): Promise<RepoSnapshot> => {
    const metaRes = await ghFetch(`${GITHUB_API}/repos/${coord.owner}/${coord.repo}`);
    if (!metaRes.ok) {
      throw new NiaError(
        `GitHub repo metadata failed (${metaRes.status} ${metaRes.statusText})`,
        metaRes.status,
      );
    }
    const meta = (await metaRes.json()) as RepoMeta;
    const branch = meta.default_branch;

    const treeRes = await ghFetch(
      `${GITHUB_API}/repos/${coord.owner}/${coord.repo}/git/trees/${encodeURIComponent(
        branch,
      )}?recursive=1`,
    );
    if (!treeRes.ok) {
      throw new NiaError(
        `GitHub tree fetch failed (${treeRes.status} ${treeRes.statusText})`,
        treeRes.status,
      );
    }
    const treeJson = (await treeRes.json()) as TreeResponse;
    return {
      defaultBranch: branch,
      entries: treeJson.tree ?? [],
      truncated: Boolean(treeJson.truncated),
    };
  })();

  snapshotCache.set(key, promise);
  // Drop cache on failure so the next request can retry.
  promise.catch(() => snapshotCache.delete(key));
  return promise;
}

/** Returns a newline-separated listing of file/directory paths in the default branch. */
export async function githubTree(coord: RepoCoord): Promise<string> {
  const snap = await getSnapshot(coord);
  const lines = snap.entries.map((e) => (e.type === "tree" ? `${e.path}/` : e.path));
  if (snap.truncated) lines.push("… (tree truncated by GitHub API)");
  return lines.join("\n");
}

/** Read a file at HEAD of the default branch via the Contents API; returns "" if missing. */
export async function githubReadSafe(
  coord: RepoCoord,
  path: string,
  maxLines = 400,
): Promise<string> {
  try {
    const res = await ghFetch(
      `${GITHUB_API}/repos/${coord.owner}/${coord.repo}/contents/${encodeURI(path)}`,
    );
    if (!res.ok) return "";
    const data = (await res.json()) as
      | { content?: string; encoding?: string; type?: string; size?: number }
      | { content?: string; encoding?: string; type?: string; size?: number }[];
    if (Array.isArray(data)) return ""; // path was a directory
    if (data.type !== "file" || !data.content || data.encoding !== "base64") return "";
    const decoded = Buffer.from(data.content, "base64").toString("utf8");
    const lines = decoded.split(/\r?\n/);
    if (lines.length <= maxLines) return decoded;
    return lines.slice(0, maxLines).join("\n");
  } catch {
    return "";
  }
}

function globToRegex(pattern: string): RegExp {
  // Tokenize to safely handle `**` vs `*`.
  let out = "^";
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i]!;
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        // `**` matches any number of path segments (including zero).
        out += ".*";
        i += 2;
        // Eat a trailing slash so `src/**/*.ts` works when `**` matches empty.
        if (pattern[i] === "/") i += 1;
      } else {
        out += "[^/]*";
        i += 1;
      }
    } else if (ch === "?") {
      out += "[^/]";
      i += 1;
    } else if (/[.+^${}()|[\]\\]/.test(ch)) {
      out += `\\${ch}`;
      i += 1;
    } else {
      out += ch;
      i += 1;
    }
  }
  out += "$";
  return new RegExp(out);
}

/** Returns repo paths that match a glob like `src/**\/*.ts` (matched against the cached tree). */
export async function githubGlob(coord: RepoCoord, pattern: string): Promise<string[]> {
  try {
    const snap = await getSnapshot(coord);
    const re = globToRegex(pattern);
    return snap.entries
      .filter((e) => e.type === "blob" && re.test(e.path))
      .map((e) => e.path);
  } catch {
    return [];
  }
}
