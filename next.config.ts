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
  // The project page is plain HTML (public/index.html), not a Next.js page, so
  // the game links to it with an ordinary <a href={HOME}> (src/lib/home.ts).
  env: { BASE_PATH: basePath },
  // `next dev` doesn't serve public/index.html at "/" by itself. (The static
  // export doesn't need this: index.html is simply the folder's front page.
  // So `next dev` warns that rewrites don't work with "output: export": fine.)
  ...(process.env.NODE_ENV === "development" && {
    rewrites: async () => [{ source: "/", destination: "/index.html" }],
  }),
};

export default nextConfig;
