import { NextResponse } from "next/server";
import { NIA } from "@/config/global";
import { SERVER_ENV } from "@/config/env";
import {
  githubGlob,
  githubReadSafe,
  githubTree,
  parseGitHubUrl,
} from "@/lib/nia";
import type { RepoContext, RepoFile } from "@/types";

export const runtime = "nodejs";

interface Body {
  repoUrl?: string;
}

function clipLines(text: string, max: number): string {
  const lines = text.split(/\r?\n/);
  if (lines.length <= max) return text;
  return [...lines.slice(0, max), `… (+${lines.length - max} more)`].join("\n");
}

export async function POST(request: Request) {
  const body = (await request.json()) as Body;
  const coord = parseGitHubUrl(body.repoUrl ?? "");

  if (!coord) {
    const ctx: RepoContext = {
      source: "none",
      reason: "no_github_url",
      files: [],
    };
    return NextResponse.json(ctx);
  }

  if (!SERVER_ENV.niaApiKey) {
    const ctx: RepoContext = {
      source: "fallback",
      reason: "missing_nia_key",
      owner: coord.owner,
      repo: coord.repo,
      files: [],
    };
    return NextResponse.json(ctx);
  }

  try {
    const treeRaw = await githubTree(coord);
    const tree = clipLines(treeRaw, NIA.treeLineLimit);

    const fileResults = await Promise.all(
      NIA.keyFiles.map(async (path): Promise<RepoFile | null> => {
        const content = await githubReadSafe(coord, path);
        if (!content.trim()) return null;
        return { path, content: clipLines(content, NIA.maxFileLines) };
      }),
    );
    const files = fileResults.filter((f): f is RepoFile => f !== null);

    const shapeResults = await Promise.all(
      NIA.shapeGlobs.map((pattern) => githubGlob(coord, pattern)),
    );
    const shape = Array.from(new Set(shapeResults.flat())).slice(0, NIA.shapeGlobLimit);

    const ctx: RepoContext = {
      source: "nia",
      owner: coord.owner,
      repo: coord.repo,
      tree,
      files,
      shape,
    };
    return NextResponse.json(ctx);
  } catch (err) {
    console.error("[repo-context] Nia call failed:", err);
    const ctx: RepoContext = {
      source: "fallback",
      reason: err instanceof Error ? err.message : "unknown",
      owner: coord.owner,
      repo: coord.repo,
      files: [],
    };
    return NextResponse.json(ctx);
  }
}
