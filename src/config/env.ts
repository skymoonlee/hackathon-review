// Public env (client-safe). Only NEXT_PUBLIC_* values are exposed to the browser.
export const PUBLIC_ENV = {
  insforgeUrl: process.env.NEXT_PUBLIC_INSFORGE_URL ?? "",
  insforgeAnonKey: process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY ?? "",
  insforgeOssHost: process.env.NEXT_PUBLIC_INSFORGE_OSS_HOST ?? "",
} as const;

// Server-only env. Do NOT import this file from client components.
export const SERVER_ENV = {
  insforgeUrl: process.env.INSFORGE_URL ?? "",
  insforgeAnonKey: process.env.INSFORGE_ANON_KEY ?? "",
  insforgeApiKey: process.env.INSFORGE_API_KEY ?? "",
  insforgeProjectId: process.env.INSFORGE_PROJECT_ID ?? "",
  insforgeOssHost: process.env.INSFORGE_OSS_HOST ?? "",
  niaApiKey: process.env.NIA_API_KEY ?? "",
  niaBinary: process.env.NIA_BINARY ?? "nia",
  githubToken: process.env.GITHUB_TOKEN ?? "",
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiModel: process.env.OPENAI_MODEL ?? "gpt-5.5",
} as const;
