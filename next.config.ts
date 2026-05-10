import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["pdf-to-png-converter", "@napi-rs/canvas", "pdfjs-dist"],
};

export default nextConfig;
