"use client";

import { DB_TABLES } from "@/config/global";
import { getInsforge } from "@/lib/insforge-client";
import type { Criterion, HackathonPreset, ParsedTrack } from "@/types";

interface RawPresetRow {
  slug: string;
  name: string;
  description: string | null;
  is_default: boolean;
  sort_order: number;
  tracks: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function coerceCriterion(raw: unknown): Criterion | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id : "";
  const title = typeof raw.title === "string" ? raw.title : "";
  if (!id || !title) return null;
  const scaleRaw = isRecord(raw.scale) ? raw.scale : {};
  const kind = scaleRaw.kind === "10-point" ? "10-point" : "5-point";
  const fallbackMax = kind === "10-point" ? 10 : 5;
  return {
    id,
    title,
    description: typeof raw.description === "string" ? raw.description : "",
    weight: typeof raw.weight === "number" ? raw.weight : 0,
    scale: {
      kind,
      min: typeof scaleRaw.min === "number" ? scaleRaw.min : 1,
      max: typeof scaleRaw.max === "number" ? scaleRaw.max : fallbackMax,
      step: typeof scaleRaw.step === "number" ? scaleRaw.step : 1,
    },
  };
}

function coerceTrack(raw: unknown): ParsedTrack | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === "string" ? raw.id : "";
  const name = typeof raw.name === "string" ? raw.name : "";
  if (!id || !name) return null;
  const emphasis = Array.isArray(raw.emphasis)
    ? raw.emphasis.filter((x): x is string => typeof x === "string")
    : undefined;
  const criteria = Array.isArray(raw.criteria)
    ? raw.criteria
        .map(coerceCriterion)
        .filter((c): c is Criterion => c !== null)
    : undefined;
  return {
    id,
    name,
    description: typeof raw.description === "string" ? raw.description : "",
    emphasis,
    tagline: typeof raw.tagline === "string" ? raw.tagline : undefined,
    criteria: criteria && criteria.length > 0 ? criteria : undefined,
  };
}

function coercePreset(row: RawPresetRow): HackathonPreset | null {
  const tracks = Array.isArray(row.tracks)
    ? row.tracks.map(coerceTrack).filter((t): t is ParsedTrack => t !== null)
    : [];
  if (tracks.length === 0) return null;
  return {
    slug: row.slug,
    name: row.name,
    description: row.description ?? "",
    isDefault: !!row.is_default,
    tracks,
  };
}

export async function fetchPresets(): Promise<HackathonPreset[]> {
  const insforge = getInsforge();
  const { data, error } = await insforge.database
    .from(DB_TABLES.hackathonPresets)
    .select("slug, name, description, is_default, sort_order, tracks")
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("[fetchPresets] failed:", error.message);
    return [];
  }
  const rows = (data ?? []) as RawPresetRow[];
  return rows
    .map(coercePreset)
    .filter((p): p is HackathonPreset => p !== null);
}
