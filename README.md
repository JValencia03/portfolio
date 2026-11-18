# Interactive Rubik Portfolio

Personal portfolio built around a procedural 3×3 Rubik's Cube, as one
continuous scroll-driven experience that never ends:

1. **Hero.** The solved cube rests in its slot.
2. **The cube opens.** Its layers turn, its 27 pieces fly apart in a burst of
   light and the three projects it held come forward: Distance, Dodaman, LCDR.
3. **Inside the cube.** Each project is read in full, in the color of one face
   (red, orange, yellow).
4. **The cube closes** and solves itself, then turns: Skills, About and
   Contact are entered through the blue, green and white faces.
5. **Finale.** The cube comes apart around the resume, gathers again and
   returns to its slot. The scroll carries on from the top: the page loops.

Next.js (App Router) · React · TypeScript · Tailwind CSS 4 · Three.js with
React Three Fiber · native CSS scroll-driven animations.

## Commands

```bash
pnpm dev         # development server at http://localhost:3000
pnpm build       # production build
pnpm start       # serve the production build
pnpm typecheck   # generate route types, then type-check
pnpm lint
pnpm test        # unit tests (Node's built-in runner)
```

## Adding your content

Everything the site still needs from you is in `src/data`. A value of
`PENDING`, `null` or an empty array is shown on the page as a marked
placeholder; replace it and the placeholder disappears.

| File | What it holds |
|---|---|
| `src/data/profile.ts` | Name, hero introduction, stack, About texts, contact links, resume |
| `src/data/projects.ts` | Distance, Dodaman and LCDR: card content and case studies |
| `src/data/skills.ts` | Skill categories and their technologies |

Texts that depend on language take one value per locale:

```ts
intro: { en: "…", es: "…" },
```

**Resume.** Put the PDF at `public/resume.pdf` and set
`resume.available: true` in `profile.ts`. Until then no link to it is
rendered anywhere.

**Interface copy** (labels, headings, button text) lives in
`src/lib/i18n/dictionaries/en.ts` and `es.ts`.

**Site address.** Set `NEXT_PUBLIC_SITE_URL` to the public URL so canonical
links, Open Graph tags and the sitemap point at it. On Vercel the production
domain is picked up automatically.

To find every remaining placeholder, search the rendered page for the
`data-placeholder` attribute.

## How it is put together

- **One document, many URLs.** The root layout (`src/app/[locale]/layout.tsx`)
  renders the whole experience; each route only contributes metadata and names
  the section to land on. Moving between sections uses the History API, so the
  layout and the WebGL canvas are never remounted.
- **Section order, colors and how each section is reached** (the cube
  opening, inside the open cube, through a face, the finale) are defined once,
  in `src/data/navigation.ts`.
- **Scroll timeline** (`src/lib/scroll`). A pure model maps any scroll
  position to one of thirteen explicit states and a progress value. The 3D scene,
  the active section and the URL all read it. Stage lengths are set in
  `phases.ts`; what the scene does at each point is in `choreography.ts`.
- **Scene** (`src/components/three`). One persistent canvas. `SceneDirector`
  samples the scroll position each frame and the rigs apply the resulting
  pose. The cube and the background field are instanced meshes.
- **Cube model** (`src/lib/rubik`). Pure data and math: the 27 cubies, face
  orientations as quaternions, idle motion, the opening (real layer turns, then
  every piece flying out of view) and the finale's separation.
- **The loop** (`src/components/layout/LoopSeam.tsx`). The document ends with
  an inert copy of the hero. When the scroll reaches it, the position is moved
  back to the top, where the page looks exactly the same, so nothing is seen
  to change. It goes forward only: scrolling up from the top stops there.
- **CSS scroll-driven animations** are in `src/styles/scroll-animations.css`,
  all behind `@supports` and `prefers-reduced-motion`.

Without WebGL, with reduced motion requested, or without JavaScript, the
transition tracks and the loop collapse and the site is a plain, fully
navigable document that ends with the resume.

Rendering quality is chosen from the device's capabilities
(`src/lib/three/quality.ts`). Append `?quality=low` or `?quality=high` to any
URL to force a tier.
