# ElementaryParticlePhysics — AI Agent Reference

This is the operational map for agents working on an educational, single-page
guide to elementary particles. The served application is a static HTML document
with inline CSS, JavaScript, and Canvas 2D demonstrations. It is a learning aid,
not a numerical physics simulator or a source of current experimental results.
The separate JSON-driven modular implementation is an incomplete prototype;
do not confuse it with the page served by the project server.

## Read Order and Sources of Truth

1. [LICENSE](LICENSE) governs redistribution under the GNU General Public License,
   version 3. Preserve it. There are no separate product-principle, security, or
   privacy policy documents in this checkout.
2. [tests/navigation.test.js](tests/navigation.test.js) specifies the tested
   standalone navigation, disclosure markup, and inline-script syntax contracts.
   [tests/physics-model.test.js](tests/physics-model.test.js) checks particle
   catalog semantics, filters, mass handling, occupancy rules, reactions, detector
   signatures, and cross-topic references. Scientific statements follow the
   primary references linked in the page, including the fixed PDG 2025 edition;
   tests are not a substitute for those references.
3. [elementaryparticles.html](elementaryparticles.html) defines the served UI;
   [serve.js](serve.js) defines the HTTP interface. Source and configuration govern
   behavior beyond the assertions actually made by tests.
4. [README.md](README.md) documents local startup and navigation checks.
5. [modular/content.json](modular/content.json) and the other
   [modular files](modular/) describe the alternative prototype, not a production
   build pipeline. Git history supplies historical context only.

This handbook indexes those sources rather than overriding them. Inspect actual
behavior when they disagree, fix stale documentation in the same scoped change,
and report unresolved conflicts. Running code does not override legal or explicit
product requirements. No roadmap, contribution guide, CI configuration, package
manifest, or nested `AGENTS.md` exists in this checkout.

## Collaboration and Maintenance Rules

- Read all applicable `AGENTS.md` files and check `git status --short --branch`
  before edits. Preserve unrelated working-tree changes.
- Update this handbook and affected user documentation in the same edit batch
  whenever ownership, symbols, commands, interfaces, durable bug prevention, or
  feature status changes. Remove references to renamed or deleted owners.
- Before a commit, review the complete diff, run relevant checks, validate changed
  links, and include the handbook alongside the code that changes its facts. Do
  not add chronological task or commit summaries here.
- Use focused regression checks for navigation/content changes and inspect the
  rendered page for layout or interaction changes. The static tests do not prove
  browser scrolling, responsive layout, or scientific accuracy.
- Keep the served page self-contained with respect to repository assets. Do not
  silently switch it to the modular prototype or add a build dependency.
- No tracked file is identified as generated. Edit source directly. Logs,
  dependency directories, coverage, build outputs, and environment files are
  excluded by [.gitignore](.gitignore); do not commit local runtime artifacts.
- No repository-enforced branch, commit, or release naming convention is defined.
  Do not invent one from history. No authoritative backlog exists; record newly
  discovered task-relevant gaps here, and label future work explicitly as planned
  if a backlog is introduced. Do not represent ideas as shipped behavior.

## Essential Project Principles

- **Reading comes first:** every listed topic must have real, readable content.
  Preserve native section links and keyboard access; navigation must not depend
  on animations, a CDN script, or the experimental JSON renderer.
- **One page is the deployed unit:** [serve.js](serve.js) reads
  [elementaryparticles.html](elementaryparticles.html) on each request. Inline
  behavior and styling belong in that document unless a deliberate architectural
  change also updates the server and documentation.
- **Educational scope:** distinguish established explanations from speculative
  theories. Verify scientific claims against appropriate references before
  changing them; existing explanatory prose and particle values are not an
  automatically maintained scientific dataset.
- **Local preview stays local:** retain the server's `127.0.0.1` binding and
  explicit route allowlist. Do not turn it into a general file server accidentally.

## Critical Implementation Contracts

- **Navigation targets:** `.nav-dot` elements are named `<a href="#…">` links.
  Each fragment resolves to exactly one `.content-section` with a unique `id`, a
  heading, and learning material. `#beyond` and `#summary` are separate topics.
  [Navigation tests](tests/navigation.test.js) enforce destination coverage and
  unique IDs. Do not select bare `[data-section]` to find content: both links and
  sections carry that attribute.
- **Scroll state:** `updateNavigation` in
  [elementaryparticles.html](elementaryparticles.html) selects the current topic
  by section position, matches links by fragment, and updates `.active` and
  `aria-current="location"`. It guards zero scroll range and selects the final
  section at the bottom. Native anchors own scrolling, fragments, and history.
- **Mobile access:** the `max-width: 768px` styles in
  [elementaryparticles.html](elementaryparticles.html) show a horizontally
  scrollable bottom navigation bar. Do not hide section navigation on phones;
  retain bottom content clearance. Verify this in a browser.
- **Disclosure pairing:** each `.expand-btn` immediately precedes its
  `.expandable` panel; `aria-controls` names that panel. `toggleExpand` synchronizes
  the panel/button `.expanded` classes, `aria-expanded`, and panel `inert` state.
  Panels start collapsed and inert. Expanded panels have no fixed height cap, so
  long details and narrow-screen tables remain reachable. Markup is covered by
  [disclosure checks](tests/navigation.test.js); interaction requires browser QA.
- **Catalog and mass conventions:** the `physics-model` script in
  [elementaryparticles.html](elementaryparticles.html) owns `PARTICLES`, used by
  tiles, the property table, inspector, filters, and comparisons. Numerical masses
  use MeV/c²; displayed GeV values are converted, rounded teaching values from PDG
  2025. Neutrino flavor masses use `null`, not zero. `massRatio` returns `null` for
  unknown masses or a zero denominator. The interaction filter denotes principal
  gauge interactions/Higgs sector, not every tree-level or loop vertex. Preserve
  its visible scope explanation. [Model tests](tests/physics-model.test.js) cover
  these distinctions.
- **Quantum-state teaching model:** `addToQuantumState` tests occupancy of one
  fixed spatial mode and a selected spin/polarization state. Identical fermions
  cannot share a full state; opposite electron spins may share an orbital, and
  photons may share a mode. Rejected additions must not mutate occupancy. Photon
  choices are polarizations, not a third longitudinal spin state.
- **Scientific boundaries:** distinguish the Higgs scalar from gauge carriers;
  massless photons still have energy, massless gluons are confined, neutrino
  flavor states mix mass states, and virtual lines do not violate four-momentum
  conservation. `chargeBalance` tests electric charge only and MUST NOT be
  presented as a proof that a process is physically allowed. Detector signatures
  are qualitative and missing momentum alone is not a particle identification.
- **Cross-topic selection:** `data-particle` values must be catalog keys.
  `showParticleDetail` updates an inline `#particle-inspector`, never a popup.
  Delegated clicks update the title and focus it; native particle links retain
  fragment/history behavior, while tile/table buttons scroll to the inspector.
  Query text is used for matching and is not interpolated into rendered HTML.
- **Server boundary:** [serve.js](serve.js) allows only `/` and
  `/elementaryparticles.html`, ignoring the query string. Successful responses
  are UTF-8 HTML with `Cache-Control: no-store`; other paths return 404, and file
  read failures return 500. It does not serve the modular directory or tests.

## Architecture and Data/Control Flow

`node serve.js` → loopback HTTP request → route allowlist → fresh read of
[elementaryparticles.html](elementaryparticles.html) → browser renders inline
sections/CSS → native fragment links navigate → scroll/resize handlers update
navigation/progress. Buttons invoke `toggleExpand` or delegated particle
selection. Native `details`/`summary` elements own deeper explanations. The pure `physics-model`
script defines catalog and learning rules; `initParticleExplorers` connects them
with controls and renders the catalog, comparison, occupancy lab, process check,
and detector view. Those features share authored data, not remote fetches.
`DOMContentLoaded` initializes navigation, explorers, and Canvas 2D animations using
`requestAnimationFrame`. There is no application database, authentication,
background worker, or application API.

The independent prototype is [modular/index.html](modular/index.html) → local
CSS/script → `fetch('content.json')` → `physicsData` → `buildPage` → card builders
and visualization dispatch. That is the intended source flow; the checked-in
script currently fails parsing before initialization. The standalone page does
not fetch the JSON. Its current explanations and model are authored directly in
HTML; there is no generator or automatic synchronization with the older prototype
JSON.

Both HTML entry points reference external CDN libraries. The standalone's core
navigation and Canvas 2D drawing do not call Three.js, GSAP, or Chart.js; Font
Awesome supplies decorative icons. These imports are external network activity,
not bundled dependencies.

## Linked Source Tree and File Reference

### [elementaryparticles.html](elementaryparticles.html)

Owns the entire served educational experience: markup, theme, interactions, and
animations. Edit it for the shipped UI; it does not implement HTTP routing or use
the modular renderer at runtime.

- **Markup/CSS landmarks:** `.nav-sidebar`/`.nav-dot` map introduction, scale,
  matter, particle zoo, fermions, forces, Higgs, quantum properties, interactions,
  detection, mathematics, beyond, and summary to matching section IDs.
  `.concept-card`, `.mnemonic`, `.cern-reference`, `.equation-box`, and
  `.depth-*` organize learning material. `.table-scroll` contains wide tables.
  `.expandable`/`.expanded` control the scale/matter disclosures; native
  `.deep-dive` details own later explanations and the property table.
  `.catalog-groups`, `.property-grid`, `.state-box`, and `.detector-layers` style
  explorers. The responsive media query owns the
  bottom navigation; `prefers-reduced-motion` disables smooth anchor scrolling.
- **`updateNavigation`:** computes progress and the current section; scroll,
  resize, disclosure changes, and DOM initialization call it.
- **`toggleExpand(button)`:** uses the adjacent panel and updates visual and
  accessibility state. Keep button/panel adjacency when inserting content.
- **Pure `physics-model` script:** `PARTICLES` holds authored particle records;
  `INTERACTION_NAMES` and `FAMILY_NAMES` label them. `selectParticles` combines
  family/interaction/search filters and nonmutating mass/name sorting;
  `massRatio` handles zero and unknown masses. `addToQuantumState` returns a new
  occupancy result without changing its input. `PROCESSES` contains equations,
  charge lists, explanations, and particle references; `chargeBalance` totals
  the initial/final charges. `DETECTOR_SIGNATURES` provides four qualitative
  detector-layer responses and a catalog reference for each selectable example.
- **Catalog UI:** `renderParticleExplorer` reads controls, renders groups/rows,
  updates result status, and preserves `selectedParticle`. `particleById`,
  `isFermion`, `interactionText`, `statisticsText`, and `particleLink` resolve
  catalog identities, labels, rules, and links. `showParticleDetail(id)` updates
  the inline inspector and pressed state of tile/table buttons. `renderComparison`
  uses `#compare-a`/`#compare-b` and the same catalog for properties/mass ratios.
- **Other learning explorers:** `renderQuantumState` displays `stateCounts`;
  `addQuantumParticle` invokes the pure occupancy rule. `renderProcess` connects
  `#process-choice` to the charge check and reaction links. `renderDetector`
  connects `#detector-choice` to the layer responses and explanation.
  `initParticleExplorers` binds all controls, reset actions, delegated selection,
  and native-details toggle updates, then renders initial states.
- **Content/reference landmarks:** `#particle-zoo` is the catalog hub,
  `#particle-inspector` is its inline field guide; `#fermions` has composite and
  neutrino explanations, `#forces` links carriers, `#higgs` explains mass,
  `#quantum` hosts the occupancy experiment, `#interactions` hosts reaction checks,
  `#detection` hosts signatures, `#mathematics` links equations to examples, and
  `#references` contains fixed-edition primary sources. The model does not use
  the prototype's JSON particle copy.
- **`initVisualizations`:** initializes `scaleVisualization` and `atomModel`.
  `drawScaleVisualization(canvas)` owns wheel zoom and its drawing loop;
  `animateAtom(canvas)` draws a schematic nucleus and orbiting electrons.
  `createParticleCollision()` returns the animated hero canvas and owns particle
  and trail lifetimes. The DOM-ready callback inserts it into the hero demo.
- **Dependencies/tests:** served by [serve.js](serve.js); checked by
  [tests/navigation.test.js](tests/navigation.test.js),
  [tests/physics-model.test.js](tests/physics-model.test.js), and browser inspection.
- **Common mistakes:** adding a navigation entry without content, matching a
  link instead of a section, reusing the Beyond target for the summary, clipping
  expanded content, or assuming edits to the modular files affect this page.

### [serve.js](serve.js)

Owns the dependency-free Node.js preview server, not a general static server.
`port` reads `PORT` with a 3000 fallback; `page` resolves the standalone HTML
relative to `__dirname`. The `http.createServer` callback enforces the allowlist,
reads the HTML with `fs.readFile`, and handles 404/500 responses. The server error
listener sets a failing process exit code; `server.listen` binds loopback and logs
the actual port. [README.md](README.md) invokes it. No automated server tests
exist; verify routing manually if changing this file. Preserve fresh reads so a
browser refresh displays edits without restarting the process.

### [modular/index.html](modular/index.html)

Prototype shell, not a route served by the preview server. `#nav-sidebar` and
`#main-container` are injection targets; `#progressBar` receives scroll progress.
It loads [style.css](modular/style.css) and deferred
[script.js](modular/script.js), plus the same CDN libraries as the main page.
An empty shell does not demonstrate working content: inspect the script parse
check first. There are no focused prototype browser tests.

### [modular/content.json](modular/content.json)

Owns the prototype's hand-authored particle descriptions and section/card data;
it is not generated or fetched by the served page.

- **`particleData`:** keyed particles with symbols, names, groups, masses,
  charges, spins, discovery descriptions, and optional generation/force fields.
- **`sections`:** ordered hero and topic records, with `id`, `nav_title`, headings,
  card content, optional tables/equations/canvas metadata, and expandable blocks.
  `has_canvas`, `canvas_id`, and `canvas_type` feed renderer/visualization dispatch.
- **`visualizations`:** scale metadata, collision/atom descriptions, quark
  combinations, force, Higgs, detector, and Feynman-diagram descriptions.
  `config` declares animation/equation, difficulty, theme, and color settings;
  its presence does not prove the UI consumes every setting.
- **Dependencies/tests:** read by [script.js](modular/script.js). JSON parsing can
  be checked with the command below; no schema or content-accuracy tests exist.
  Do not assume every declared block or visualization type has a working handler.

### [modular/script.js](modular/script.js)

Contains overlapping original and enhanced prototype implementations. It is
currently invalid JavaScript: duplicate `let physicsData` declarations cause a
syntax error. The descriptions below locate intended code, not verified shipped
behavior; fixing only that declaration does not establish prototype correctness.

- **Bootstrap/building:** DOM-ready listeners fetch JSON into `physicsData` and
  call `buildPage`, `setupEventListeners`, `initVisualizations`, and
  `addConsoleEasterEgg`. `buildPage` creates dots and sections by array index.
  `createCard` renders card variants, content, canvases, buttons, equations,
  resource links, and expandable content. `createTable` renders table data;
  `createParticleGrid` binds particle keys to detail popups;
  `createExpandableContent` recursively switches on block type.
- **Interaction:** `setupEventListeners` installs scroll/click/resize handlers;
  `updateActiveNavDot` tracks sections by index. `toggleExpand` changes classes
  and chevron direction. `showParticleDetail` creates `#particlePopup` from JSON;
  `handleInteractiveButton` dispatches quark/force/Feynman button labels;
  `showParticleMass` displays mass descriptions. Some helpers are exported on
  `window` for inline handlers. `addConsoleEasterEgg` prints educational messages.
- **Visualization dispatch:** `initVisualizations` switches on `canvas[data-type]`
  and inserts the hero collision canvas. `drawScaleVisualization` uses optional
  JSON scales and wheel zoom. `animateAtom`, `createParticleCollision`,
  `animateForceExchange`, `animateHiggsField`, `animateSpinDemo`, and
  `animateLeptonInteraction` contain independent animation loops.
  `showQuarkCombination` draws baryon/meson configurations; `showForce` draws a
  selected carrier; `drawDetectorView` draws detector layers/tracks;
  `drawFeynmanDiagram` selects a process and has local straight/wavy/curly line
  helpers; `drawUniverseComposition` draws a composition chart.
  `drawMexicanHat_old` is an older potential sketch; `drawMexicanHat` is an
  animated potential cross-section. `drawFeynmanElements` is a separate line
  drawing helper for fermion/photon/gluon/massive-boson styles.
- **Dependencies/tests:** depends on the prototype shell, CSS, JSON, and browser
  Canvas APIs. `node --check modular/script.js` currently fails. There is no
  automated runtime coverage.
- **Common mistakes:** duplicate declarations/listeners and placeholder functions
  coexist with enhanced versions. Consolidate intended owners before repairing
  behavior; do not paste this file into the standalone page. Reinitializing
  animations on resize can create additional loops without cleanup.

### [modular/style.css](modular/style.css)

Owns prototype styling only. `:root` supplies theme colors; navigation, card,
particle, canvas, equation, mnemonic, and disclosure rules style renderer output.
Additional rules cover summary/resources, button groups, tables, `#particlePopup`,
`#heroAnimation`, expert depth labels, loading spinners, print output, and mobile
canvas/grid sizing. Its mobile rule still hides `.nav-sidebar`, and expanded
details still have a fixed maximum height. No automated CSS checks exist. Do not
assume the standalone navigation fixes apply here; these styles are independent.

### [tests/navigation.test.js](tests/navigation.test.js)

Uses Node's built-in `node:test`, strict assertions, filesystem reads, and
`vm.Script`; no package installation is needed. `attribute` reads quoted HTML
attributes from the repository's current markup. The topic test verifies native
links, expected destinations, unique IDs, content targets, and headings/prose.
The disclosure test checks panel references and initial accessibility state. The
script test compiles inline JavaScript without executing browser APIs. It does
not parse arbitrary HTML, exercise scrolling, or test the modular prototype.
Update expected topics when intentionally changing the learning structure; do not
weaken missing-section assertions to make a regression pass.

### [tests/physics-model.test.js](tests/physics-model.test.js)

Extracts the pure `physics-model` script into an isolated `node:vm` context and
uses the actual model functions. Tests cover particle family/spin invariants,
unknown neutrino masses, zero/unknown mass ratios, combined filters, numeric mass
sorting without catalog mutation, identical-fermion exclusion and boson
occupancy, reaction charge balance, detector signatures, and static cross-topic
anchors/particle keys. It also validates reaction/detector catalog references.
It has no browser DOM or external dependencies; UI rendering, event wiring, and
scientific completeness still require browser/source review. Keep the pure
script independent of `document` so these checks remain focused and executable.

### [README.md](README.md)

Owns the short human-facing startup instructions, `PORT` override, mobile
navigation guidance, explorer capabilities, mass-reference conventions, and regression command. Keep it synchronized with server
and navigation behavior; it is not a build manifest or deployment specification.

### [.gitignore](.gitignore)

Excludes Node-related dependencies, logs, coverage, environment files, caches,
and outputs for several toolchains. These generic patterns do not establish that
the project uses those toolchains. There is no dependency manifest in the repo.

### [LICENSE](LICENSE)

Contains the GNU General Public License version 3 text. Preserve it when changing
or distributing the project; it does not define development commands.

### [AGENTS.md](AGENTS.md)

Owns this current operational reference, source map, invariants, and known gaps.
Maintain it task by task, edit by edit, and before each commit. It is authored
documentation, not generated output or a replacement for focused tests.

## Features and Recurring Development Pitfalls

### Guided topic navigation — Shipped

The standalone page provides section links from Introduction through Summary.
Native anchors → matching section IDs → `updateNavigation` for active/progress
state. Desktop dots expose labels on hover/focus; mobile uses a scrolling label
bar. The [HTML](elementaryparticles.html) owns this path and
[navigation tests](tests/navigation.test.js) protect topic coverage. Browser checks
must cover clicks, keyboard activation, fragments/history, and mobile overflow.

### Particle catalog, inspection, and comparison — Shipped

[HTML](elementaryparticles.html) filters → `selectParticles` →
`renderParticleExplorer` tiles/property table → `showParticleDetail` field guide
and cross-topic links. `renderComparison` compares any pair, including the
massless/unknown cases, from the same `PARTICLES` catalog. Family, principal
interaction, search, and sort choices are transient; reset restores all entries.
Native buttons are keyboard-activatable, selection focuses the inspector title,
and status messages announce updates. [Model tests](tests/physics-model.test.js)
cover rules/data; browser checks cover rendering, controls, focus, and mobile use.

### Progressive explanations and quantum occupancy — Shipped

The scale/matter sections retain `toggleExpand`; later explanations use native
`details`/`summary`. Section links and contextual particle links connect topics.
In `#quantum`, `addQuantumParticle` → `addToQuantumState` → `renderQuantumState`
compares electron spin states with photon polarizations in a fixed spatial mode.
The [model tests](tests/physics-model.test.js) enforce rejection without mutation,
opposite-spin access, and repeated boson occupation. This is an occupancy teaching
model, not a many-body wavefunction solver.

### Reaction and detector exploration — Shipped

`#process-choice` → `PROCESSES`/`chargeBalance` → `renderProcess` displays beta
decay, annihilation, Higgs decay, or a charge-violating counterexample. Passing
charge conservation alone does not prove a process is allowed.
`#detector-choice` → `DETECTOR_SIGNATURES` → `renderDetector` shows layer responses
for electron/photon/muon/hadron/neutrino examples, exceptions, and catalog links.
[Model tests](tests/physics-model.test.js) cover charge/lookup/signature invariants;
no rates, event reconstruction, or detector response simulation is calculated.

### Schematic animations — Shipped

The standalone DOM-ready callback → `initVisualizations` and
`createParticleCollision` → Canvas 2D animation loops. Scale-wheel zoom and the
atom/hero diagrams are implemented. Later topics use tables, native disclosures,
and the occupancy/process/detector teaching controls, not the prototype's canvas
simulations. The atom animation is explicitly labeled schematic. There are no
automated rendering tests or scientific-accuracy guarantees.

### JSON-driven alternative — Experimental/scaffold

[Prototype shell](modular/index.html) → [script](modular/script.js) →
[JSON](modular/content.json) → rendered cards/visualizations, with
[prototype CSS](modular/style.css). Parsing currently blocks that entire flow.
It is outside the default server allowlist and has no verified run/release path.

### Dots target themselves or topics have no content — Fixed regression risk

Both navigation and content use `data-section`; a bare attribute selector can
return the navigation control first. Separate sidebar entries can also outlive
missing section markup. Preserve real fragment links and section IDs, and run
[navigation tests](tests/navigation.test.js). Beyond must not silently resolve to
the summary. Never treat a successful click callback alone as proof of access.

### Hidden or clipped content on small screens — Fixed regression risk

Hiding the mobile sidebar removes direct access; a fixed expanded height truncates
long material when text wraps. In [HTML](elementaryparticles.html), keep the bottom
navigation available and `.expandable.expanded` uncapped. Keep collapsed panels
inert and wide tables independently scrollable. Verify narrow layouts and expanded
panel `scrollHeight` versus visible height in a browser. The prototype retains
older styles and does not inherit this fix.

### Editing the wrong implementation — Deliberate architecture boundary

Changes to [modular files](modular/) do not reach the page served by
[serve.js](serve.js). Follow its `page` constant to the standalone owner. There is
no build step connecting the copies; compare overlapping content explicitly when
editing it. For prototype work, parse-check its script before runtime debugging.

### Confusing mass, interaction, and statistics — Fixed regression risk

Massless is not energyless; neutral is not interactionless; bosons are not all
gauge carriers. Neutrino flavor masses must not be replaced with old direct bounds
as if they were measured flavor rest masses. Keep numerical conventions in
`PARTICLES`, use `massRatio` for comparisons, retain filter scope notes, and keep
Pauli exclusion tied to the full state rather than mass or position.
[Model tests](tests/physics-model.test.js) protect these data/logic boundaries;
primary references linked in the HTML govern scientific content beyond tests.

## Interface Ownership Map

| Surface | Authoritative owner |
| --- | --- |
| `/`, `/elementaryparticles.html`, optional query strings | [serve.js](serve.js) request callback |
| All other HTTP paths (404) | [serve.js](serve.js) allowlist |
| `node serve.js`, `PORT` | [serve.js](serve.js), documented in [README.md](README.md) |
| Section URL fragments and responsive topic navigation | [elementaryparticles.html](elementaryparticles.html) anchors and `updateNavigation` |
| Disclosures, catalog/inspector/comparison, learning explorers, three canvas demonstrations | [elementaryparticles.html](elementaryparticles.html) inline functions |
| Prototype shell and JSON card/block format | [modular/index.html](modular/index.html), [content.json](modular/content.json), [script.js](modular/script.js) builders |

There is no public library API, persistence protocol, plugin interface, or separate
backend application route registry.

## Build, Run, Test, Debug, and Release

Run from the repository root. Node.js is required for the server and tests; no
install/bootstrap command, package manifest, build, lint, format, or typecheck
configuration exists. A minimum supported Node version and platform matrix are
not specified — verify before changing runtime compatibility.

```sh
node serve.js
# Open http://127.0.0.1:3000 and refresh after edits; Ctrl-C stops the server.

PORT=8080 node serve.js
node --test tests/*.test.js
node --check serve.js
node -e "JSON.parse(require('node:fs').readFileSync('modular/content.json', 'utf8')); console.log('JSON OK')"
git diff --check
```

The startup commands come from [README.md](README.md) and
[serve.js](serve.js); the regression command is documented in the README. The
syntax/JSON commands directly inspect current source without changing it. Tests,
syntax, JSON, and diff checks have been run successfully. Local startup was
verified using `PORT=0 node serve.js`, which selects an available port and logs it.
Preview requires permission to bind a loopback socket in restricted environments.
Opening the HTML can contact its CDNs; the server itself needs no credentials or
external service. These commands do not write application data.

Prototype diagnostic (known to fail; not a passing project gate):

```sh
node --check modular/script.js
```

Use browser developer tools to inspect fragments, section rectangles, current
link state, console errors, and canvas behavior. Test both desktop and the mobile
breakpoint after navigation/CSS edits. No configured packaging, deployment,
release, migration, seed, benchmark, or security-scanner workflow exists.
Unknown — verify before changing deployment or publishing behavior.

## Test Ownership Map

| Contract | Focused validation |
| --- | --- |
| Every listed topic resolves to unique content; summary remains separate | [tests/navigation.test.js](tests/navigation.test.js), topic test |
| Disclosure button/panel references and initial collapsed/inert state | [tests/navigation.test.js](tests/navigation.test.js), disclosure test |
| Standalone inline JavaScript parses | [tests/navigation.test.js](tests/navigation.test.js), script test |
| Native click/keyboard navigation, history, active state, responsive layout, expansion height | Browser inspection; no automated browser suite |
| Server routing, fresh reads, status codes | Manual loopback HTTP checks; no automated server suite |
| Prototype code/data | Node syntax diagnostic and JSON parse check; no runtime suite/schema |
| Catalog semantics/filtering/mass ratios, occupancy, charge checks, detector data/references | [tests/physics-model.test.js](tests/physics-model.test.js) |
| Explorer event wiring, inspector keyboard focus, responsive tables/controls | Browser inspection; no automated browser suite |
| Scientific completeness, canvas drawing/lifecycle | Primary-source review/manual inspection; no comprehensive automated coverage |

There are no shared fixtures, test helper packages, or generated test data.

## Data, Security, Privacy, and Compatibility Boundaries

- Static HTML (including `physics-model`) and prototype JSON are canonical
  authored content for their own implementations. Inspector selection, filter
  input, comparisons, occupancy, detector/reaction choice, pixels, and progress are
  transient; no explorer input is sent to a server and there is no application
  storage, replication, migration, or backup protocol. URL fragments preserve
  navigable topic locations; keep existing IDs
  stable or update all links intentionally.
- The prototype interpolates repository-controlled JSON into `innerHTML` and
  inline handlers. Do not accept user-controlled/remote JSON as trusted content
  without redesigning escaping, validation, and URL/handler boundaries.
- No credentials or user accounts are required. Keep secrets out of source and
  this handbook; [.gitignore](.gitignore) excludes local environment files.
- CDN resources execute in the page context. Their versions are specified in
  both HTML heads; neither entry point includes integrity metadata. Verify the
  actual usage before changing or removing imports. Do not claim a fully bundled
  offline dependency model.
- Keep [serve.js](serve.js) restricted to loopback and its explicit file. The
  prototype, source tests, and local environment files must not become reachable
  through accidental path handling changes.
- No formal browser-support/deprecation policy exists. Native links are the core
  navigation contract; Canvas 2D and JavaScript supply enhancements.

## Current Status, Known Gaps, and Roadmap

### Shipped

The loopback server serves the standalone educational page with all topic
destinations, separate summary, keyboard-capable fragment navigation, a mobile
navigation bar, a shared particle catalog with filters/property table/inline
inspection/comparison, occupancy/reaction/detector explorers, contextual links,
primary references, native deeper explanations, and scale/atom/hero canvases.
Source regression checks cover navigation and the pure learning model.

### Experimental/scaffold

The modular implementation contains broader card/visualization code and JSON
configuration but is not a working substitute for the standalone page.

### Known gaps

- [modular/script.js](modular/script.js) fails `node --check` on duplicate
  `physicsData` declarations; additional structural/runtime issues remain
  unverified. Prototype execution must not be described as working.
- Prototype canvas simulations are not implemented in the standalone later topics;
  the standalone uses its own qualitative teaching explorers.
  The prototype's `lepton_demo` canvas type is not dispatched by
  `initVisualizations`, and its `potential_3d` block is not handled by
  `createExpandableContent`. Declared settings are not a complete feature UI.
- No automated browser/server suite, comprehensive scientific-content validation,
  formal compatibility matrix, or release/deployment workflow exists. The catalog
  uses rounded fixed-edition PDG 2025 values, not a live feed. Check references
  before scientific updates; tests cannot certify every explanation.
- The catalog requires JavaScript; surrounding learning content stays readable
  without it. There is no URL persistence for selected particle/filter state.
  Canvas loops have no general cleanup mechanism; reduced-motion styles disable
  smooth navigation but do not stop ongoing canvas animations.

### Planned

No maintained roadmap/backlog or committed future delivery plan exists. Treat
prototype comments and future-physics learning material as neither an application
roadmap nor evidence of implemented functionality.

## Task Start and Handoff Checklist

1. Read applicable instructions; inspect status and preserve unrelated edits.
2. Identify the served/prototype owner, its source-map landmarks, relevant feature
   path, critical contracts, data boundaries, and focused checks.
3. Compare handbook statements with current implementation before relying on them.
4. Keep native navigation/content coverage, accessibility state, loopback routing,
   and authored-data trust boundaries intact.
5. Run relevant checks and browser validation; synchronize README/handbook facts
   in the same change, including paths, symbols, features, tests, and known gaps.
6. Validate local documentation links and `git diff --check`; review the full diff
   before committing. Report what passed, what was not tested, and remaining gaps.
