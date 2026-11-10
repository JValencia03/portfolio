import { Geist, IBM_Plex_Mono, Syne } from "next/font/google";

/** Display: the hero name, section headings, project titles. */
const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
});

/** Text and interface: body copy, navigation, buttons. */
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

/** Technical voice: labels, section numbers, metadata. */
const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

/** Class names that expose the font CSS variables; apply to <html>. */
export const fontVariables = `${syne.variable} ${geistSans.variable} ${plexMono.variable}`;
