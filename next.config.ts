import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native and bundler-heavy packages must stay out of the Next.js server bundle.
  serverExternalPackages: ["better-sqlite3", "@remotion/bundler", "@remotion/renderer"],
};

export default nextConfig;
