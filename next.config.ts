import type { NextConfig } from "next";

// The game is a fully static site hosted on GitHub Pages under
// /<repo-name>/. PAGES_BASE_PATH is set by the deploy workflow; locally it's
// empty so `npm run dev` serves from the root.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  agentRules: false,
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
