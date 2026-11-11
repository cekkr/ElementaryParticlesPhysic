# ElementaryParticlesPhysics
An elementary particles "periodic table" in one web page

Run `node serve.js`, then open http://127.0.0.1:3000 in your browser.
Set `PORT` to use a different port (for example, `PORT=8080 node serve.js`).

The page is available in English and Italian. Use the language menu in the
top-right corner, or open `?lang=it` / `?lang=en`; the choice is remembered in
the browser.

`elementaryparticles.html` is generated — do not edit it directly. Edit the
sources in `src/` (`template.html` for structure, `styles.css`, `physics-model.js`,
`app.js`, and the translations in `src/i18n/en.json` and `src/i18n/it.json`), then
run `node generate.js` and refresh the browser. Every text change must be made in
every supported language; the generator refuses to build if a translation is
missing. `node generate.js --check` reports whether the page is up to date.

The section navigation links to every topic, from the introduction through the
summary. On small screens, swipe the navigation bar at the bottom to reach more
topics. Links also support keyboard navigation and shareable URL fragments.

Explore the Standard Model through searchable particle tiles and a property
table, filter by family or interaction, and compare any two particles. The
comparison has a selectable A × B matrix with matching particle axes, colored
scattering-channel summaries, and a preview of both particles. Select cells or
row/column labels; arrow keys move between cells and Enter/Space selects. The
synchronized dropdowns remain available for quick access on small screens.
The matrix distinguishes tree-level from higher-order routes, not reaction rates.
The linked field guide explains mass, charge, spin, statistics, and real examples.
Other sections include a Pauli-exclusion experiment, reaction charge checks,
detector signatures, and expandable mathematical explanations. Values are rounded
from the fixed PDG 2025 references linked in the page; the explorers are teaching
models, not precision simulations.

The history of the Standard Model is told in 18 numbered "History" steps placed
inside the sections, in reading order: atoms with the scale of the universe, the
electron and the neutron with matter, quarks and the particle zoo with fermions,
the photon and gauge theories with forces, spin and antimatter with quantum
properties, and so on, ending with the chain of discoveries in the summary. Each
step states the puzzle, the discovery and the classification, with the full story
in an expandable panel and links to the previous and next step. In the other
direction, the property table's discovery years and column headings, the catalog
group headings, and the particle field guide link back to the relevant step. The
steps are adapted from `docs/StandardModel_history.md`.

Run the regression checks with `node --test tests/*.test.js`.
