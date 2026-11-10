# MASTER SPECIFICATION — INTERACTIVE RUBIK PORTFOLIO

**Project:** Personal Developer Portfolio  
**Profile:** Full Stack Developer  
**Status:** Technical and visual specification approved  
**Primary audience:** Recruiters, hiring managers and software engineering teams  
**Languages:** English and Spanish  
**Implementation approach:** Incremental, testable and maintainable

---

# 1. Project vision

Build a premium, cinematic, interactive personal portfolio centered around a fully procedural 3×3 Rubik's Cube.

The experience must remain recognizably a professional website, not a video game, game menu or experimental interface that compromises usability.

The visitor should immediately understand who the developer is and what professional role they offer. As the visitor scrolls, the experience should progressively reveal a visually impressive 3D environment.

The core concept is:

**One Rubik's Cube. Six faces. Six sections. One continuous experience.**

The main interaction is scroll-driven:

1. The visitor sees a floating Rubik's Cube.
2. Scrolling rotates the cube toward a specific face.
3. The camera aligns perpendicularly with that face.
4. The camera advances toward the face.
5. The visitor visually passes through the face as if entering a portal.
6. The corresponding portfolio section appears.
7. The visitor can read and interact with the section normally.
8. Continuing to scroll reverses the camera movement, reveals the cube and rotates it toward the next face.
9. The sequence repeats for all six sections.
10. At the end, the Rubik's Cube separates into 27 individual cubies to reveal a Resume finale.

The resulting experience must feel fluid, cohesive, technically sophisticated and professionally credible.

---

# 2. Mandatory technology stack

Use the following technologies:

| Area | Technology |
|---|---|
| Framework | Next.js, App Router |
| UI | React |
| Language | TypeScript, strict mode |
| Styling | Tailwind CSS 4 and native CSS |
| 3D engine | Three.js |
| React 3D integration | React Three Fiber |
| Three.js utilities | @react-three/drei |
| Scroll-driven UI animations | Native CSS Scroll-driven Animations |
| Advanced scroll integration | ScrollTimeline / Web Animations API where appropriate |
| Custom visual effects | GLSL only when necessary |
| Icons | Lucide |
| Package manager | pnpm |
| Deployment target | Vercel |

Use current stable, mutually compatible versions and verify API compatibility before implementation.

## Non-negotiable scroll requirement

**Native CSS Scroll-driven Animations must be a first-class part of the implementation.**

Use modern CSS capabilities such as:

- `animation-timeline`
- `scroll()`
- `view()`
- Named scroll timelines when appropriate
- CSS custom properties
- `@supports` for progressive enhancement

Do not replace the native CSS scroll system with GSAP ScrollTrigger, Framer Motion or a generic scroll animation library.

Three.js camera transformations cannot be directly animated through ordinary CSS properties. Implement a small, efficient bridge between scroll progress and the WebGL scene.

The bridge must be reversible, deterministic and resistant to desynchronization.

Use CSS animations for DOM content and Three.js for genuine 3D geometry, camera movement, lighting and materials.

Avoid unnecessary dependencies.

There is no requirement for a database, authentication system, CMS or dedicated backend.

---

# 3. Visual identity

## 3.1 General style

The aesthetic combines:

- Futuristic neon lighting
- Minimalist editorial typography
- Cinematic depth
- Floating spatial elements
- Dark atmospheric backgrounds
- Genuine 3D geometry
- Clean, professional HTML content

Do not create a gaming dashboard, pixel-art website or excessively decorative science-fiction interface.

The site must retain the visual language of a modern premium portfolio.

## 3.2 Typography

Use a modern sans-serif typeface such as Geist.

Typography should emphasize:

- Strong visual hierarchy
- Large, readable headings
- Generous negative space
- Clear supporting text
- Consistent spacing
- High contrast

Monospaced text may be used sparingly for technical labels.

Avoid excessive decorative typography and unnecessary animated text.

## 3.3 Background

The initial environment uses predominantly black and graphite-gray tones.

The background contains multiple independently floating 3D cubes positioned at different depths.

The cubes should create spatial depth through:

- Perspective
- Scale
- Atmospheric lighting
- Slow descending or floating movement
- Controlled parallax
- Depth-dependent movement

The background must not resemble a rigid wall or regular grid.

### Cursor interaction

Implement cursor-based repulsion.

Nearby cubes move away from the cursor's projected position in the 3D scene, then gradually return toward their normal trajectories.

Requirements:

- Smooth falloff by distance
- No abrupt jumps
- Damped recovery
- Subtle forces
- No excessive oscillation
- Pointer interactions must not obstruct HTML controls

The cursor itself remains mostly native, with contextual feedback over interactive elements.

### Section colors

Initially, background cubes remain black and gray.

When a Rubik's Cube face becomes active, introduce its corresponding color gradually into the environment.

The background must not abruptly change to a flat solid color.

Use the active face's color as:

- Atmospheric tint
- Reflection color
- Selective edge illumination
- Accent lighting
- Subtle background glow

Maintain sufficient contrast between the environment and readable content.

---

# 4. Procedural Rubik's Cube

## 4.1 Geometry

Create the Rubik's Cube entirely with Three.js geometry.

Do not import a Rubik's Cube from Blender, GLB, GLTF or another external 3D model.

The cube must be a genuine 3×3×3 arrangement containing 27 individually identifiable cubies.

Each cubie must have:

- A defined local position
- A shared geometric scale
- Consistent spacing
- Beveled or subtly rounded edges
- Suitable material properties
- Stable identity for animation
- Correct outward-facing colored panels

Do not create 27 complete miniature Rubik's Cubes.

Only externally visible faces receive colored panels.

## 4.2 Standard Rubik's Cube colors

Use the six classical Rubik's Cube colors.

Opposite pairs must be:

- White ↔ Yellow
- Blue ↔ Green
- Red ↔ Orange

Use one consistent physical orientation respecting these opposing faces and the cube's handedness.

Each face contains nine matching colored panels.

The cube should remain solved.

**Do not shuffle or twist individual layers when switching sections.**

Transitions rotate the complete cube as a rigid object.

The initial orientation is not fixed to particular colors.

Choose a visually compelling orientation revealing three physically adjacent faces.

## 4.3 Material design

Use translucent, futuristic, colored-glass styling.

Suggested characteristics:

- Tinted transparent or transmissive surfaces
- Controlled reflections
- Soft neon edge illumination
- Visible separation between cubies
- Slight beveling
- Legible face colors
- Premium material finish

Start with Three.js physical materials and introduce custom shaders only if necessary.

Do not allow strong bloom, reflections or transparency to make the six face colors unrecognizable.

## 4.4 Idle movement

When the user is not scrolling:

- The cube floats gently.
- Small vertical movement simulates suspension.
- The pointer subtly influences its orientation.
- The cube returns smoothly to its default orientation.

Pointer movement must not change the logical identity of a face.

When a scroll transition begins, the deterministic navigation animation takes precedence over idle movement.

---

# 5. Section-to-face mapping

The Rubik's Cube has six sections:

| Face | Section |
|---|---|
| Yellow | Projects |
| Blue | Skills |
| Green | About |
| White | Contact |
| Red | Distance |
| Orange | Dodaman |

Preserve the physical opposition between corresponding face pairs.

The proposed narrative scroll order is:

1. Hero
2. Projects
3. Skills
4. About
5. Contact
6. Distance
7. Dodaman
8. Resume Finale

This sequence is the initial implementation order and should be configurable centrally.

Each navigation target must map to exactly one cube face.

A target may be reached by scrolling or through direct navigation.

The Rubik's Cube must rotate correctly even when the destination face is opposite its current orientation.

Use quaternion-based or otherwise robust 3D orientation interpolation. Avoid uncontrolled Euler angle accumulation and unintended full rotations.

---

# 6. Main scroll experience

## 6.1 General behavior

Scrolling is the primary mechanism for controlling the cinematic experience.

The site must not emulate scrolling by unnecessarily capturing wheel events.

Use actual browser scroll position and appropriate sticky layouts.

Scrolling downward progresses through the experience.

Scrolling upward reverses the same animation.

All transitions must support:

- Forward movement
- Reverse movement
- Pausing at arbitrary positions
- Resuming without jumps
- Direct navigation
- Browser history navigation
- Responsive resizing

## 6.2 Scroll state machine

Model the experience using explicit states:

- HERO
- ROTATING
- ALIGNED
- APPROACHING
- PORTAL_TRANSITION
- INSIDE_SECTION
- EXITING
- FINALE

Define stable progress ranges and transitions.

Do not implement disconnected animation effects without a shared progression model.

## 6.3 Rotation phase

As the visitor leaves the hero or a previous section:

1. The cube becomes fully visible.
2. Idle motion decreases.
3. The cube smoothly rotates to the destination face.
4. The selected face becomes perpendicular to the camera.
5. The cube settles into an aligned position.

The transition must remain deterministic during reverse scrolling.

## 6.4 Camera approach

After alignment:

1. The camera begins advancing.
2. The selected face grows in the viewport.
3. Environmental lighting progressively shifts toward its color.
4. The nine colored panels become visually prominent.
5. The portal transition begins.

Do not use a simple page fade as a substitute for the camera movement.

## 6.5 Portal transition

The user should perceive the camera passing through the selected Rubik's Cube face.

The transition may use a carefully synchronized combination of:

- Camera movement
- Face-aligned geometry
- Lighting
- Color transition
- Controlled masking
- HTML content reveal

Avoid physically invalid clipping artifacts and distracting camera intersections.

The final effect must convincingly connect the 3D face with the corresponding HTML section.

## 6.6 Section reading phase

Once inside the section:

- The content becomes stable.
- The text remains readable.
- The visitor can scroll through its content normally.
- Cards and links can be interacted with.
- The camera should not continuously move in a distracting manner.

The background continues its ambient animation.

The section should feel spatially integrated with the original 3D environment.

## 6.7 Exit phase

After the section's content:

1. The visual portal transition reverses.
2. The camera moves backward.
3. The complete Rubik's Cube becomes visible.
4. The cube rotates toward the next target.
5. The new face enters its own approach phase.

Avoid abrupt cuts between independently rendered scenes.

---

# 7. Navigation and routing

## 7.1 Main navigation

Create a floating, centered navbar with a compact island design.

Navigation items:

- Projects
- Skills
- About
- Contact
- Resume

The project details are accessible from the Projects cards and may also have contextual navigation controls.

Include a compact `EN / ES` language selector.

The navbar must:

- Remain accessible
- Indicate the active section
- Use the active face's color subtly
- Work with keyboard navigation
- Adapt to smaller screens
- Avoid covering essential content

Resume opens an external PDF document in a new browser tab.

## 7.2 Route architecture

Implement one coherent visual experience with section-specific URLs.

Suggested canonical routes:

English:

- `/en`
- `/en/projects`
- `/en/skills`
- `/en/about`
- `/en/contact`
- `/en/projects/distance`
- `/en/projects/dodaman`

Spanish:

- `/es`
- `/es/projects`
- `/es/skills`
- `/es/about`
- `/es/contact`
- `/es/projects/distance`
- `/es/projects/dodaman`

English is the initial default.

The exact route structure may be adjusted internally if necessary, but separate, directly accessible URLs must be retained.

The WebGL scene should remain mounted across compatible internal route transitions.

Do not force a complete reload of the portfolio for ordinary navigation.

## 7.3 URL and scroll synchronization

Create a single navigation coordinator responsible for:

- Active section
- Active Rubik's Cube face
- Scroll position
- Navigation target
- Current route
- Language
- Transition state

Prevent feedback loops between route changes and scroll updates.

When the user scrolls into a section, synchronize its URL appropriately without flooding browser history.

When the user explicitly clicks a navigation link, preserve useful browser Back and Forward behavior.

Use Next.js routing APIs and History API integration carefully.

## 7.4 Direct URL access

Opening `/en/skills` directly must work.

Expected result:

- The correct page loads.
- The Skills section becomes available.
- The correct cube face and ambient color are selected.
- The user does not need to replay the entire cinematic sequence.
- Refreshing the page preserves the intended destination.

Direct navigation should favor usability over theatrical delays.

## 7.5 Project navigation

The Projects section includes two cards:

- Distance
- Dodaman

Selecting a card triggers a targeted navigation to the corresponding cube face.

The transition should be visually coherent and sufficiently short for intentional navigation.

Never force the visitor to watch all intermediate sections when navigating directly to a destination.

---

# 8. Hero section

Use a balanced three-column desktop composition.

## Left column

Contains:

- Developer's name
- Full Stack Developer title
- Short professional introduction
- Primary CTA

All descriptive copy remains editable.

## Center column

Contains the procedural 3D Rubik's Cube.

It is the main visual focal point without making the professional information unreadable.

The cube should reveal three adjacent faces in an attractive perspective.

Include a subtle scroll invitation.

## Right column

Contains:

- Technology stack summary
- Secondary CTA or professional availability element
- Compact information blocks

Do not invent employment status or availability.

## Responsive behavior

On mobile, the layout becomes vertically organized.

Prioritize:

1. Identity
2. Professional role
3. Rubik's Cube
4. Primary CTA
5. Technology summary

Ensure the cube remains visually significant without occupying the entire useful viewport.

---

# 9. Section design system

## 9.1 General composition

All six sections use a hybrid editorial and futuristic design.

Primary content is HTML.

The surrounding environment is Three.js.

Use:

- Large headings
- Spacious layouts
- Floating text blocks
- Selective three-dimensional cards
- Cinematic depth
- Controlled parallax
- Neon lighting accents
- Generous negative space

Do not place all content inside large glassmorphism containers.

## 9.2 Spatial depth

Create multiple visual depth layers:

- Foreground interactive content
- Midground decorative elements
- Background floating cubes
- Atmospheric lighting layers

Use subtle depth motion.

Text content should not move unpredictably during reading.

## 9.3 Cards

Interactive cards use cursor-controlled 3D tilt.

Requirements:

- Limited angular range
- Smooth pointer tracking
- Return to neutral when the pointer leaves
- Subtle highlights
- Accessible focus appearance
- Mobile-compatible non-hover behavior

Use performant CSS transforms where practical.

Do not require WebGL for ordinary HTML cards.

## 9.4 Projects section

Include two cards:

- Distance
- Dodaman

Each card contains placeholders for:

- Project name
- Short description
- Visual asset
- Technologies
- Project status
- Case study link

Do not invent screenshots or technical claims.

## 9.5 Skills section

Create a technical category layout with placeholders for:

- Frontend
- Backend
- Databases
- Systems and tooling
- AI-assisted development

Categories should be configurable.

Use clean technical presentation, not arbitrary skill percentage bars.

## 9.6 About section

Prepare a professional editorial layout with placeholders for:

- Personal introduction
- Development approach
- Technical interests
- Career objectives

Do not generate unverified biographies or employment experience.

## 9.7 Contact section

Use a memorable final call to action:

**Let's build something.**

Provide placeholder contact links for:

- Email
- GitHub
- LinkedIn

The layout must remain functional without a server-side contact form.

## 9.8 Distance case study

Create the complete visual structure but leave its content blank or explicitly marked as placeholder.

Suggested blocks:

- Overview
- Problem
- Approach
- Architecture
- Technical decisions
- Challenges
- Results
- Links

Do not infer functionality from the project's name.

## 9.9 Dodaman case study

Use the same technical case-study structure as Distance.

Name:

**Dodaman**

Expanded project name:

**Document Dashboard Management**

All functional descriptions, architecture details, metrics and results remain placeholders.

Do not present planned functionality as already implemented.

---

# 10. Resume finale

After the final section, create a distinct cinematic ending.

The camera returns to the complete Rubik's Cube.

The cube pauses briefly in its solved state.

Its 27 cubies then separate spatially in a controlled three-dimensional animation.

The pieces should:

- Maintain visual continuity
- Preserve their individual geometry
- Disperse along deterministic trajectories
- Remain visually recognizable
- Support reverse scrolling
- Avoid chaotic particle behavior

As they separate, reveal the Resume CTA.

The final content includes:

- Resume heading
- Short optional closing statement
- Open Resume button
- Optional contact link

The Resume button opens the PDF in a new tab.

Use a placeholder PDF path until the real document is provided.

Avoid broken or misleading download buttons before the asset is available.

---

# 11. Internationalization

Support English and Spanish throughout the interface.

Requirements:

- English default
- Compact EN/ES selector
- Centralized translation dictionaries
- No hardcoded user-facing copy
- Language-aware routing
- Correct page metadata by language
- Equivalent information architecture in both languages

Switching language must not unnecessarily restart the 3D experience.

Preserve the active section whenever possible.

Project names remain unchanged.

---

# 12. Performance and rendering

Create one persistent primary WebGL canvas.

Avoid multiple unnecessary renderers.

Optimize:

- Shared geometries
- Shared materials
- Instanced background cubes where appropriate
- Draw calls
- Pixel ratio
- Shadow quality
- Bloom and postprocessing
- Event handling
- Scroll progress calculations
- Client-side JavaScript
- Asset loading

Do not trigger React component rerenders for every scroll pixel or every animation frame.

Use refs, external animation values and React Three Fiber's rendering lifecycle appropriately.

Aim for smooth animation on modern desktop hardware and a responsive experience on mainstream mobile devices.

Provide adaptive rendering quality based on device capabilities rather than only viewport width.

Use a reduced visual workload on mobile, preserving the core experience.

---

# 13. Accessibility and progressive enhancement

The site must remain navigable without interacting with the 3D cube.

Requirements:

- Semantic HTML headings
- Keyboard-accessible links
- Visible focus states
- Correct contrast
- Screen reader-friendly content
- Responsive layouts
- Touch-friendly targets
- `prefers-reduced-motion` support
- WebGL failure fallback
- Native CSS animation feature detection

If the user requests reduced motion, minimize or bypass large camera transitions while preserving all content and navigation.

If WebGL is unavailable, render a visually consistent static or lightweight alternative with functional HTML navigation.

Never make essential information available exclusively inside a WebGL canvas.

---

# 14. SEO and professional discoverability

The content must be indexable and understandable by search engines.

Implement:

- Server-rendered semantic section content
- Page titles
- Meta descriptions
- Open Graph metadata
- Canonical URLs
- Language alternates where appropriate
- Valid internal links
- Descriptive project page titles
- Proper heading hierarchy

The 3D presentation must not prevent recruiters or automated tools from accessing professional information.

---

# 15. Proposed component architecture

Use a modular structure along these lines:

```text
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── projects/
│   │   ├── skills/
│   │   ├── about/
│   │   └── contact/
│   ├── layout.tsx
│   └── globals.css
│
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Hero.tsx
│   │   └── PortfolioExperience.tsx
│   ├── three/
│   │   ├── ExperienceCanvas.tsx
│   │   ├── RubiksCube.tsx
│   │   ├── Cubie.tsx
│   │   ├── FloatingCubes.tsx
│   │   ├── CameraRig.tsx
│   │   └── LightingRig.tsx
│   ├── scroll/
│   │   ├── ScrollCoordinator.tsx
│   │   └── ScrollSequence.tsx
│   ├── sections/
│   ├── projects/
│   └── ui/
│
├── hooks/
├── lib/
│   ├── rubik/
│   ├── scroll/
│   ├── navigation/
│   └── i18n/
├── data/
│   ├── navigation.ts
│   ├── projects.ts
│   └── skills.ts
└── styles/
    └── scroll-animations.css
```

This is a suggested organization, not a requirement to create empty files.

The App Router structure must support the project detail URLs as actual direct-loadable routes.

Shared experience state should live in an appropriate persistent layout or provider.

---

# 16. Implementation phases

Develop incrementally.

## Phase 1 — Foundation

Set up the application, typography, theme, routes and translation system.

Deliver a functional static interface before building complex 3D features.

## Phase 2 — Procedural Rubik's Cube

Implement the 27 cubies, outward-facing color panels, materials, orientation and idle behavior.

Verify geometry and color correctness.

## Phase 3 — Scroll architecture

Implement native CSS scroll timelines, section anchors, progression calculation and reversible synchronization with Three.js.

Validate one complete face transition before expanding to all six.

## Phase 4 — Cinematic camera and portal

Implement alignment, approach, portal transition, section reading and exit.

All stages must work in both scrolling directions.

## Phase 5 — Interactive environment

Create floating cubes, cursor repulsion, colored lighting and cinematic depth.

Optimize geometry and render performance.

## Phase 6 — Website interface

Implement the floating navbar, hero, sections, cards, placeholders and bilingual navigation.

## Phase 7 — Resume finale

Implement the deterministic 27-cubie separation and Resume CTA.

## Phase 8 — Responsive refinement

Adapt camera, layout, input interactions and rendering workload for mobile.

## Phase 9 — Quality assurance

Perform accessibility, performance, navigation and browser compatibility testing.

---

# 17. Acceptance criteria

The implementation is not considered complete until the following behaviors work.

### Rubik geometry

- Exactly 27 cubie positions.
- Six solved colored faces.
- Nine colored panels per face.
- Correct opposite color pairs.
- Programmatic geometry.
- No external Rubik model.
- Whole-cube rotation without shuffling.

### Scroll

- Native CSS Scroll-driven Animations are used meaningfully.
- Three.js and scroll remain synchronized.
- Scrolling backward correctly reverses transitions.
- Pausing during a transition does not cause snapping.
- Reading sections remain stable.
- No unwanted scroll locking.

### Navigation

- Every section is reachable from its appropriate controls.
- Direct URLs load correctly.
- Refresh preserves route functionality.
- Back and Forward behave coherently.
- Navbar navigation is animated but reasonably quick.
- Distance and Dodaman have individual routes.

### Visual experience

- Initial dark floating-cube environment.
- Neon lighting.
- Translucent Rubik material.
- Smooth cursor repulsion.
- Color synchronization by active face.
- Cinematic portal transitions.
- 3D tilt cards.
- Deterministic Resume finale.

### Internationalization

- EN/ES switch works.
- Interface copy is translated.
- Active destination is preserved where possible.

### Quality

- Mobile functionality.
- Keyboard navigation.
- Reduced motion.
- WebGL fallback.
- Semantic, indexable content.
- No fabricated project information.
- No obvious rendering leaks or continuous React rerender loops.

---

# 18. Instructions for Claude

You are responsible for implementing this project according to the specification.

Treat established visual, technical and interaction decisions as requirements, not suggestions.

Do not replace the concept with a conventional template.

Do not remove the Rubik's Cube, replace it with a static image or convert the experience into a video-game interface.

Do not replace native CSS Scroll-driven Animations with a JavaScript animation library.

Do not invent content for Distance, Dodaman, professional experience, employment history or project results.

Use clearly identifiable, centralized placeholders for missing information.

Work in incremental phases. Before each phase, identify its implementation objectives and dependencies.

After implementation, report:

1. What was implemented.
2. Which files were created or modified.
3. How the result can be tested.
4. Any technical compromises.
5. Any remaining problems.

Run relevant type checks, linting and build verification.

Do not claim that a behavior works unless it has been implemented and, where feasible, tested.

Prioritize a coherent, functioning experience over an accumulation of disconnected effects.

**The objective is not merely to create a visually impressive portfolio. It is to deliver a technically sophisticated, maintainable, accessible and memorable website that demonstrates modern frontend engineering while presenting a Full Stack Developer professionally.**
