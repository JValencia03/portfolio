import type { NextConfig } from "next";
import { ROUTED_PATHS } from "./src/data/navigation";
import { defaultLocale } from "./src/lib/i18n/config";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
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
  async redirects() {
    return ROUTED_PATHS.map((path) => ({
      source: `/${path}`,
      destination: path ? `/${defaultLocale}/${path}` : `/${defaultLocale}`,
      permanent: false,
    }));
  },
};

export default nextConfig;
