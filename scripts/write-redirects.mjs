// Static-host stand-ins for what a Next.js server would provide, written into
// the export after `pnpm build:pages`:
// - an HTML redirect page at every locale-less path (/, /skills/…), replacing
//   the redirects in next.config.ts;
// - robots.txt and sitemap.xml, replacing src/app/robots.ts and sitemap.ts
//   (skipped in export mode, see next.config.ts).
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROUTED_PATHS } from "../src/data/navigation.ts";
import { defaultLocale, locales } from "../src/lib/i18n/config.ts";

const outDir = process.argv[2] ?? "out";
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const absolute = (path) => new URL(path, siteUrl).href;
const localePath = (locale, path) => `/${locale}/${path ? `${path}/` : ""}`;

for (const path of ROUTED_PATHS) {
  const target = localePath(defaultLocale, path);
  const html = `<!doctype html>
<html lang="${defaultLocale}">
<head>
<meta charset="utf-8">
<title>Redirecting…</title>
<meta name="robots" content="noindex">
<link rel="canonical" href="${target}">
<meta http-equiv="refresh" content="0; url=${target}">
<script>location.replace(${JSON.stringify(target)} + location.search + location.hash)</script>
</head>
<body><a href="${target}">${target}</a></body>
</html>
`;
  const dir = join(outDir, path);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), html);
  console.log(`/${path} -> ${target}`);
}

const urls = ROUTED_PATHS.flatMap((path) => {
  const alternates = locales
    .map((locale) => `    <xhtml:link rel="alternate" hreflang="${locale}" href="${absolute(localePath(locale, path))}" />`)
    .join("\n");
  return locales.map((locale) => `  <url>\n    <loc>${absolute(localePath(locale, path))}</loc>\n${alternates}\n  </url>`);
});
writeFileSync(
  join(outDir, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join("\n")}
</urlset>
`,
);
writeFileSync(join(outDir, "robots.txt"), `User-Agent: *\nAllow: /\n\nSitemap: ${absolute("/sitemap.xml")}\n`);

// GitHub Pages runs Jekyll unless told otherwise, which drops `_next/`.
writeFileSync(join(outDir, ".nojekyll"), "");
