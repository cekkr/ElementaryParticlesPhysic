# ElementaryParticlePhysics
An elementary particles "periodic table" in one web page

Run `node serve.js`, then open http://127.0.0.1:3000 in your browser.
Refresh the browser after editing the HTML. Set `PORT` to use a different port
(for example, `PORT=8080 node serve.js`).

The section navigation links to every topic, from the introduction through the
summary. On small screens, swipe the navigation bar at the bottom to reach more
topics. Links also support keyboard navigation and shareable URL fragments.

Explore the Standard Model through searchable particle tiles and a property
table, filter by family or interaction, and compare any two particles. The
linked field guide explains mass, charge, spin, statistics, and real examples.
Other sections include a Pauli-exclusion experiment, reaction charge checks,
detector signatures, and expandable mathematical explanations. Values are rounded
from the fixed PDG 2025 references linked in the page; the explorers are teaching
models, not precision simulations.

Run the regression checks with `node --test tests/*.test.js`.
