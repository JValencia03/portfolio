import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { locale as rootLocale } from "next/root-params";
import { Frame } from "@/components/layout/Frame";
import { InitialScrollScript } from "@/components/layout/InitialScrollScript";
import { Navbar } from "@/components/layout/Navbar";
import { PortfolioExperience } from "@/components/layout/PortfolioExperience";
import { ExperienceCanvasLoader } from "@/components/three/ExperienceCanvasLoader";
import { profile } from "@/data/profile";
import { hasLocale, locales } from "@/lib/i18n/config";
import { loadDictionary } from "@/lib/i18n/dictionaries";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { NavigationProvider } from "@/lib/navigation/NavigationProvider";
import { siteUrl } from "@/lib/seo/metadata";
import { fontVariables } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  metadataBase: siteUrl,
  applicationName: profile.name,
  authors: [{ name: profile.name }],
  creator: profile.name,
};

export const viewport: Viewport = {
  themeColor: "#050506",
  colorScheme: "dark",
};

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

/**
 * Root layout. It owns the entire experience — providers, navbar, every
 * section and the single WebGL canvas — so all of it stays mounted no matter
 * which entry URL was loaded. The pages below only contribute metadata.
 */
export default async function RootLayout({ children }: LayoutProps<"/[locale]">) {
  const locale = await rootLocale();
  if (!hasLocale(locale)) notFound();

  const dictionary = await loadDictionary(locale);

  // Structured data: who this site is about. Only facts already on the page.
  const person = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: dictionary.meta.role,
    url: new URL(`/${locale}`, siteUrl).href,
  };

  return (
    // The pre-paint script sets data-face on <html> before React hydrates.
    <html lang={locale} className={`${fontVariables} antialiased`} suppressHydrationWarning>
      <body>
        <I18nProvider locale={locale} dictionary={dictionary}>
          <NavigationProvider>
            <a href="#content" className="skip-link">
              {dictionary.common.skipToContent}
            </a>
            <div aria-hidden="true" className="atmosphere" />
            <ExperienceCanvasLoader />
            <div aria-hidden="true" className="scroll-progress" />
            <Navbar />
            <Frame />
            <div aria-hidden="true" className="grain" />
            <main id="content">
              <PortfolioExperience />
            </main>
            {children}
          </NavigationProvider>
        </I18nProvider>
        <InitialScrollScript />
        <script
          type="application/ld+json"
          // Escaping "<" keeps the JSON from ever closing the script element.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(person).replace(/</g, "\\u003c") }}
        />
      </body>
    </html>
  );
}
