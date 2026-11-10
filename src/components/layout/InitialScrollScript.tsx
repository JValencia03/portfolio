import { SECTIONS } from "@/data/navigation";

/** Locale-less path → [section id, face color] for every section with a URL below the home page. */
const targets = Object.fromEntries(
  SECTIONS.flatMap((section) => (section.path ? [[section.path, [section.id, section.face]]] : [])),
);

/**
 * Runs synchronously while the HTML is parsed, before the first paint.
 *
 * 1. If the browser can run the scene, it turns the transition tracks on
 *    (`data-scene`). Deciding this before paint means the document has its
 *    final height from the first frame: no layout shift when the scene loads.
 *    Without JavaScript the attribute is never set and the page is a plain
 *    document.
 * 2. On direct access to a section URL (e.g. /en/skills) it jumps straight
 *    into that section and applies its face color, so the visitor never sees
 *    the hero flash by and never has to replay the sequence. The target is
 *    the end of the section's pin — its height beyond its content — which is
 *    where the content is fully revealed (same rule as scrollStore, including
 *    the one-pixel nudge past the boundary).
 *
 * Must be rendered after the sections. The navigation coordinator takes over
 * once the page hydrates.
 */
const code = `(function(){try{var r=document.documentElement;if(window.WebGL2RenderingContext)r.dataset.scene="on";history.scrollRestoration="manual";var m=${JSON.stringify(targets)};var t=m[location.pathname.split("/").filter(Boolean).slice(1).join("/")];if(!t)return;if(t[1])r.dataset.face=t[1];var e=document.getElementById(t[0]);if(!e)return;var c=e.firstElementChild,y=e.getBoundingClientRect().top+scrollY;if(c&&e.hasAttribute("data-pin"))y+=Math.max(0,e.offsetHeight-c.offsetHeight);scrollTo(0,Math.ceil(y)+1)}catch(_){}})()`;

export function InitialScrollScript() {
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
