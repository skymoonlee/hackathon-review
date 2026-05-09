"use client";

import { createClient, type InsForgeClient } from "@insforge/sdk";
import { PUBLIC_ENV } from "@/config/env";

let cached: InsForgeClient | null = null;

export function getInsforge(): InsForgeClient {
  if (cached) return cached;
  cached = createClient({
    baseUrl: PUBLIC_ENV.insforgeUrl,
    anonKey: PUBLIC_ENV.insforgeAnonKey,
  });
  return cached;
}
