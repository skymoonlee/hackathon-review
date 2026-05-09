import { spawn } from "node:child_process";
import { SERVER_ENV } from "@/config/env";
import { NIA } from "@/config/global";

export interface RepoCoord {
  owner: string;
  repo: string;
}

export class NiaError extends Error {
  constructor(message: string, public readonly stderr?: string) {
    super(message);
    this.name = "NiaError";
  }
}

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

interface RunOptions {
  timeoutMs?: number;
  maxBytes?: number;
}

function runNia(args: string[], opts: RunOptions = {}): Promise<string> {
  const timeoutMs = opts.timeoutMs ?? NIA.defaultTimeoutMs;
  const maxBytes = opts.maxBytes ?? NIA.maxStdoutBytes;

  return new Promise((resolve, reject) => {
    const env: NodeJS.ProcessEnv = { ...process.env };
    if (SERVER_ENV.niaApiKey) env.NIA_API_KEY = SERVER_ENV.niaApiKey;

    const child = spawn(NIA.binary, [...args, "--color=false"], {
      env,
      shell: process.platform === "win32",
    });

    let stdout = "";
    let stderr = "";
    let killed = false;
    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      if (stdout.length < maxBytes) stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderr.length < maxBytes) stderr += chunk.toString("utf8");
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(new NiaError(`Failed to spawn nia: ${err.message}`));
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (killed) {
        return reject(new NiaError(`nia timed out after ${timeoutMs}ms`, stderr));
      }
      if (code !== 0) {
        return reject(new NiaError(`nia exited with code ${code}`, stderr));
      }
      resolve(stdout);
    });
  });
}

/** `nia github tree owner/repo --path <path>` — returns raw stdout (line-per-entry). */
export async function githubTree(coord: RepoCoord, path?: string): Promise<string> {
  const args = ["github", "tree", `${coord.owner}/${coord.repo}`];
  if (path) args.push("--path", path);
  return runNia(args);
}

/** `nia github read owner/repo path [--start --end]` */
export async function githubRead(
  coord: RepoCoord,
  path: string,
  start?: number,
  end?: number,
): Promise<string> {
  const args = ["github", "read", `${coord.owner}/${coord.repo}`, path];
  if (start !== undefined) args.push("--start", String(start));
  if (end !== undefined) args.push("--end", String(end));
  return runNia(args);
}

/** Read a file but cap the response size. Returns "" if not found. */
export async function githubReadSafe(
  coord: RepoCoord,
  path: string,
  maxLines = NIA.maxFileLines,
): Promise<string> {
  try {
    const out = await githubRead(coord, path, 1, maxLines);
    return out;
  } catch {
    return "";
  }
}

/** `nia github glob owner/repo pattern` */
export async function githubGlob(coord: RepoCoord, pattern: string): Promise<string[]> {
  try {
    const out = await runNia(["github", "glob", `${coord.owner}/${coord.repo}`, pattern]);
    return out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
  } catch {
    return [];
  }
}
