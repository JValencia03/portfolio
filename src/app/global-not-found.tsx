import type { Metadata } from "next";
import { profile } from "@/data/profile";
import { defaultLocale, locales } from "@/lib/i18n/config";
import en from "@/lib/i18n/dictionaries/en";
import es from "@/lib/i18n/dictionaries/es";
import { fontVariables } from "./fonts";
import "./globals.css";

const dictionaries = { en, es };

export const metadata: Metadata = {
  title: `${en.notFound.title} · ${profile.name}`,
  description: en.notFound.description,
};

/**
 * 404 for URLs that match no route. It is rendered outside the root layout,
 * where the visitor's language is unknown, so it speaks every supported one.
 */
export default function GlobalNotFound() {
  return (
    <html lang={defaultLocale} className={`${fontVariables} antialiased`}>
      <body>
        <div aria-hidden="true" className="atmosphere" />
        <main className="section">
          <div className="section-inner flex flex-col items-center justify-center gap-12 text-center">
            <p className="font-mono text-sm tracking-widest text-fog-400">404</p>
            {locales.map((locale) => {
              const copy = dictionaries[locale].notFound;
              return (
                <div key={locale} lang={locale}>
                  <h1 className="font-display text-3xl font-bold tracking-tight md:text-5xl">{copy.title}</h1>
                  <p className="mt-3 text-fog-300">{copy.description}</p>
                  {/* A plain link on purpose: leaving this document requires a full page load. */}
                  <a href={`/${locale}`} className="btn btn-ghost mt-6">
                    {copy.home}
                  </a>
                </div>
              );
            })}
          </div>
        </main>
      </body>
    </html>
  );
}
