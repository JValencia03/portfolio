import type { NextConfig } from "next";
import { ROUTED_PATHS } from "./src/data/navigation";
import { defaultLocale } from "./src/lib/i18n/config";

// `pnpm build:pages` (or STATIC_EXPORT=1) builds a plain static site for
// GitHub Pages. Pages has no server, so the redirects below are replaced by
// HTML pages that scripts/write-redirects.mjs writes after the build.
const staticExport = process.env.STATIC_EXPORT === "1" || process.env.npm_lifecycle_event === "build:pages";

const nextConfig: NextConfig = {
  // Export mode has no PPR, so cacheComponents and partialPrefetching are off,
  // and robots.ts/sitemap.ts (which export rejects without a segment config
  // that cacheComponents forbids) are skipped: routes are limited to .tsx
  // and the script writes both files.
  ...(staticExport && { output: "export", trailingSlash: true, pageExtensions: ["tsx"] }),
  cacheComponents: !staticExport,
  partialPrefetching: !staticExport,
  experimental: {
    // The root layout lives under app/[locale], so unmatched URLs need a
    // 404 page that does not depend on it.
    globalNotFound: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // Locale-less URLs (/, /skills, /projects/distance…) lead to the default locale.
  ...(!staticExport && {
    async redirects() {
      return ROUTED_PATHS.map((path) => ({
        source: `/${path}`,
        destination: path ? `/${defaultLocale}/${path}` : `/${defaultLocale}`,
        permanent: false,
      }));
    },
  }),
};

export default nextConfig;
