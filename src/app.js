// ============================================
// Browser behavior: navigation, language switching, explorers, and canvases.
// generate.js inlines this file into the page's second <script>. It relies on
// globals from physics-model.js (PARTICLES, t, setModelLanguage, ...).
// All visible strings come from t('ui.*') / t('model.*'), never literals.
// ============================================

// Native fragment links own navigation; scrolling only updates its state.
function updateNavigation() {
    const scrolled = window.scrollY;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? (scrolled / maxScroll) * 100 : 0;
    document.getElementById('progressBar').style.width = progress + '%';

    const sections = document.querySelectorAll('.content-section');
    let activeSection = sections[0];
    sections.forEach(section => {
        if (section.getBoundingClientRect().top <= window.innerHeight / 2) {
            activeSection = section;
        }
    });
    if (maxScroll > 0 && scrolled >= maxScroll - 1) {
        activeSection = sections[sections.length - 1];
    }

    document.querySelectorAll('.nav-dot').forEach(link => {
        const active = link.getAttribute('href') === '#' + activeSection.id;
        link.classList.toggle('active', active);
        if (active) {
            link.setAttribute('aria-current', 'location');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

window.addEventListener('scroll', updateNavigation, { passive: true });
window.addEventListener('resize', updateNavigation);

// Expand/Collapse functionality
function toggleExpand(button) {
    const expandable = button.nextElementSibling;
    expandable.classList.toggle('expanded');
    button.classList.toggle('expanded');
    const expanded = expandable.classList.contains('expanded');
    expandable.inert = !expanded;
    button.setAttribute('aria-expanded', expanded);
    updateNavigation();
}

// ---------- Language selection ----------
// Order: ?lang= query parameter, saved choice, browser preference, English.
const LANGUAGE_STORAGE_KEY = 'elementary-particles-language';
function preferredLanguage() {
    const supported = Object.keys(I18N);
    const candidates = [];
    try { candidates.push(new URLSearchParams(window.location.search).get('lang')); } catch (error) { /* ignore */ }
    try { candidates.push(window.localStorage.getItem(LANGUAGE_STORAGE_KEY)); } catch (error) { /* storage may be blocked */ }
    for (const language of navigator.languages || [navigator.language]) {
        if (language) candidates.push(language.toLowerCase().split('-')[0]);
    }
    return candidates.find(language => language && supported.includes(language)) || DEFAULT_LANGUAGE;
}
// Static markup carries data-i18n="key" (innerHTML) and
// data-i18n-attr="attribute:key;attribute:key" annotations written by generate.js.
function applyStaticTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(element => {
        element.innerHTML = t(element.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-attr]').forEach(element => {
        element.dataset.i18nAttr.split(';').forEach(pair => {
            const [attribute, key] = pair.split(':');
            element.setAttribute(attribute, t(key));
        });
    });
}
function setLanguage(language, { persist = false, rerender = true } = {}) {
    const active = setModelLanguage(language);
    document.documentElement.lang = active;
    document.getElementById('language-choice').value = active;
    if (persist) {
        try { window.localStorage.setItem(LANGUAGE_STORAGE_KEY, active); } catch (error) { /* storage may be blocked */ }
    }
    applyStaticTranslations();
    if (rerender) renderAllExplorers();
    updateNavigation();
}

// ---------- Particle catalog, inspector, and comparison ----------
let selectedParticle = 'electron';
let stateCounts = [0, 0];
const particleById = id => PARTICLES.find(p => p.id === id);
const isFermion = p => ['quark', 'lepton'].includes(p.family);
const interactionText = p => p.interactions.map(key => INTERACTION_NAMES[key]).join(', ');
const statisticsText = p => t(isFermion(p) ? 'ui.statistics.fermion' : 'ui.statistics.boson');
function particleLink(id, label) {
    return `<a href="#particle-inspector" data-particle="${id}">${label || particleById(id).name}</a>`;
}
// History links jump to the step (or story block) that explains a particle, family, or property.
const historyLink = (anchor, label) => `<a href="#${anchor}">${label}</a>`;
const historyYearLink = p => `<a href="#${HISTORY_ANCHORS.particles[p.id]}" aria-label="${t('ui.history.yearLink', { year: p.discovered, name: p.name })}">${p.discovered}</a>`;
function renderParticleExplorer() {
    const controls = {
        family: document.getElementById('particle-family').value,
        interaction: document.getElementById('particle-interaction').value,
        query: document.getElementById('particle-search').value,
        sort: document.getElementById('particle-sort').value
    };
    const visible = selectParticles(controls);
    document.getElementById('particle-count').textContent = t(visible.length ? 'ui.catalog.count' : 'ui.catalog.countNone', { shown: visible.length, total: PARTICLES.length });
    const groups = [
        { key: 'quarks', families: ['quark'], history: 'quark' },
        { key: 'leptons', families: ['lepton'], history: 'lepton' },
        { key: 'bosons', families: ['gauge', 'scalar'], history: 'gauge' }
    ];
    document.getElementById('particle-grid').innerHTML = groups.map(group => {
        const members = visible.filter(p => group.families.includes(p.family));
        if (!members.length) return '';
        return `<div class="family-group"><h4>${t(`ui.catalog.groups.${group.key}.title`)}</h4><p class="hint">${t(`ui.catalog.groups.${group.key}.subtitle`)}</p><p class="history-group-link">${historyLink(HISTORY_ANCHORS.families[group.history], t(`ui.history.families.${group.history}`))}</p><div class="particle-grid">${members.map(p => `<button type="button" class="particle-tile ${p.family}" data-particle="${p.id}" aria-controls="particle-inspector" aria-pressed="${p.id === selectedParticle}"><span class="particle-symbol">${p.symbol}</span><span class="particle-name">${p.name}</span><span class="tile-mass">${p.mass === null ? t('ui.catalog.mixedMass') : p.massLabel}</span><span class="tile-meta">${p.generation ? `${t('ui.catalog.generationShort', { generation: p.generation })} · ` : ''}Q ${p.charge} · ${t('ui.catalog.spin')} ${p.spin}</span></button>`).join('')}</div></div>`;
    }).join('');
    document.getElementById('particle-rows').innerHTML = visible.map(p => `<tr><th scope="row"><button type="button" class="table-particle" data-particle="${p.id}" aria-controls="particle-inspector" aria-pressed="${p.id === selectedParticle}">${p.symbol} ${p.name}</button></th><td>${FAMILY_NAMES[p.family]}</td><td>${p.generation || '—'}</td><td>${p.massLabel}</td><td>${p.charge}</td><td>${p.spin}</td><td>${interactionText(p)}</td><td>${historyYearLink(p)}</td></tr>`).join('');
    updateNavigation();
}
function showParticleDetail(id) {
    const p = particleById(id);
    if (!p) return;
    selectedParticle = id;
    const source = p.family === 'quark' ? 'quarks' : p.family === 'lepton' ? 'leptons' : 'gauge-higgs-bosons';
    const higgsNote = t(p.family === 'quark' || (p.family === 'lepton' && p.charge !== '0') ? 'ui.inspector.higgsNote.yukawa'
        : p.family === 'lepton' ? 'ui.inspector.higgsNote.neutrino'
        : p.id === 'higgs' ? 'ui.inspector.higgsNote.higgs'
        : ['photon', 'gluon'].includes(p.id) ? 'ui.inspector.higgsNote.massless'
        : 'ui.inspector.higgsNote.electroweak');
    const chargeNote = t(p.family === 'quark' ? 'ui.inspector.chargeNote.quark'
        : p.id === 'gluon' ? 'ui.inspector.chargeNote.gluon'
        : p.charge === '0' ? 'ui.inspector.chargeNote.neutral'
        : 'ui.inspector.chargeNote.charged');
    document.getElementById('particle-detail-title').textContent = `${p.symbol} · ${p.name}`;
    document.getElementById('particle-selection-status').textContent = t('ui.inspector.selected', { name: p.name });
    document.getElementById('particle-detail').innerHTML = `<div class="property-grid"><div><strong>${t('ui.properties.type')}</strong><span>${FAMILY_NAMES[p.family]}</span></div><div><strong>${t('ui.properties.restMass')}</strong><span>${p.massLabel}</span></div><div><strong>${t('ui.properties.electricCharge')}</strong><span>${p.charge} e</span></div><div><strong>${t('ui.properties.spin')}</strong><span>${t('ui.inspector.spinValue', { spin: p.spin })}</span></div></div><p class="particle-example">${p.example}</p><dl class="detail-list"><dt>${t('ui.inspector.role')}</dt><dd>${p.role}</dd><dt>${t('ui.inspector.origin')}</dt><dd>${p.origin}</dd><dt>${t('ui.inspector.fate')}</dt><dd>${p.fate}</dd><dt>${t('ui.inspector.massOrigin')}</dt><dd>${p.massNote} ${higgsNote}</dd><dt>${t('ui.properties.interactions')}</dt><dd>${interactionText(p)}. ${chargeNote}</dd><dt>${t('ui.inspector.quantumRule')}</dt><dd>${statisticsText(p)}</dd><dt>${t('ui.history.title')}</dt><dd>${t('ui.history.discovered', { year: p.discovered, how: p.discovery })} ${historyLink(HISTORY_ANCHORS.particles[p.id], t('ui.history.readStory'))}</dd></dl><div class="learning-paths history-paths">${historyLink(HISTORY_ANCHORS.families[p.family], t(`ui.history.families.${p.family}`))}${historyLink(HISTORY_ANCHORS.topics.spin, t('ui.history.topics.spin'))}${historyLink(HISTORY_ANCHORS.topics.antimatter, t('ui.history.topics.antimatter'))}${p.generation ? historyLink(HISTORY_ANCHORS.topics.generations, t('ui.history.topics.generations')) : ''}</div><div class="learning-paths">${p.generation ? `<a href="#generations">${t('ui.inspector.paths.generations')}</a>` : ''}<a href="#particle-creation">${t('ui.inspector.paths.creation')}</a><a href="#${isFermion(p) ? 'fermions' : 'forces'}">${t(isFermion(p) ? 'ui.inspector.paths.matter' : 'ui.inspector.paths.forces')}</a><a href="#higgs">${t('ui.inspector.paths.higgs')}</a><a href="#quantum">${t('ui.inspector.paths.quantum')}</a><a href="#interactions">${t('ui.inspector.paths.reaction')}</a><a href="#detection">${t('ui.inspector.paths.detection')}</a></div><p class="source-note"><a href="https://pdg.lbl.gov/2025/tables/rpp2025-sum-${source}.pdf">${t('ui.inspector.pdgReference')}</a> · <a href="#references">${t('ui.inspector.conventions')}</a></p>`;
    document.querySelectorAll('button[data-particle]').forEach(button => button.setAttribute('aria-pressed', button.dataset.particle === id));
}
function renderInteractionMatrix() {
    const axisLabel = dimension => t(dimension === 'a' ? 'ui.comparison.rowA' : 'ui.comparison.columnB');
    const axis = (p, dimension) => `<button type="button" class="matrix-axis family-${p.family} ${dimension === 'a' ? 'matrix-row-axis' : ''}" data-pair-axis="${dimension}" data-axis-particle="${p.id}" aria-label="${axisLabel(dimension)}: ${p.name}" aria-pressed="false" aria-controls="comparison-preview"><span class="axis-symbol">${p.symbol}</span><span class="axis-name">${p.name}</span></button>`;
    document.getElementById('interaction-matrix-head').innerHTML = `<tr><th scope="col" class="matrix-corner">${t('ui.comparison.corner')}</th>${PARTICLES.map(p => `<th scope="col" id="pair-column-${p.id}">${axis(p, 'b')}</th>`).join('')}</tr>`;
    document.getElementById('interaction-matrix-body').innerHTML = PARTICLES.map(a => `<tr><th scope="row" id="pair-row-${a.id}">${axis(a, 'a')}</th>${PARTICLES.map(b => {
        const pair = pairInteraction(a.id, b.id);
        const description = `${a.name} × ${b.name}: ${pair.channels.map(c => PAIR_CHANNELS[c].label).join(', ')}. ${pair.status}`;
        return `<td headers="pair-row-${a.id} pair-column-${b.id}"><button type="button" class="matrix-cell channel-${pair.channels[0]}" data-pair-a="${a.id}" data-pair-b="${b.id}" aria-label="${description}" title="${description}" aria-pressed="false" aria-controls="comparison-preview" tabindex="-1"><span class="matrix-codes" aria-hidden="true">${pair.channels.map(c => `<span class="matrix-code channel-${c}">${PAIR_CHANNELS[c].code}</span>`).join('')}</span><span class="matrix-order" aria-hidden="true">${t(pair.treeLevel ? 'ui.comparison.tree' : 'ui.comparison.loop')}</span></button></td>`;
    }).join('')}</tr>`).join('');
}
function selectComparisonPair(aId, bId) {
    if (!particleById(aId) || !particleById(bId)) return;
    document.getElementById('compare-a').value = aId;
    document.getElementById('compare-b').value = bId;
    renderComparison();
}
function handleMatrixKeydown(event) {
    const cell = event.target.closest('.matrix-cell');
    if (!cell) return;
    let row = PARTICLES.findIndex(p => p.id === cell.dataset.pairA);
    let col = PARTICLES.findIndex(p => p.id === cell.dataset.pairB);
    if (event.key === 'ArrowUp') row--;
    else if (event.key === 'ArrowDown') row++;
    else if (event.key === 'ArrowLeft') col--;
    else if (event.key === 'ArrowRight') col++;
    else if (event.key === 'Home') { col = 0; if (event.ctrlKey) row = 0; }
    else if (event.key === 'End') { col = PARTICLES.length - 1; if (event.ctrlKey) row = PARTICLES.length - 1; }
    else return;
    event.preventDefault();
    row = Math.max(0, Math.min(PARTICLES.length - 1, row));
    col = Math.max(0, Math.min(PARTICLES.length - 1, col));
    const next = document.querySelector(`.matrix-cell[data-pair-a="${PARTICLES[row].id}"][data-pair-b="${PARTICLES[col].id}"]`);
    cell.tabIndex = -1;
    next.tabIndex = 0;
    next.focus();
}
function renderComparisonOptions() {
    const options = PARTICLES.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    ['compare-a', 'compare-b'].forEach(id => {
        const select = document.getElementById(id);
        const value = select.value;
        select.innerHTML = options;
        if (value) select.value = value;
    });
}
function renderComparison() {
    const a = particleById(document.getElementById('compare-a').value);
    const b = particleById(document.getElementById('compare-b').value);
    const pair = pairInteraction(a.id, b.id);
    const previewCard = (p, axis) => `<div class="pair-particle family-${p.family}"><p class="pair-axis">${t(axis === 'a' ? 'ui.comparison.rowA' : 'ui.comparison.columnB')} · ${FAMILY_NAMES[p.family]}</p><h4><span class="pair-symbol">${p.symbol}</span>${p.name}</h4><p>${p.massLabel}<br>Q = ${p.charge} e · ${t('ui.catalog.spin')} ${p.spin} ℏ</p><p>${t(isFermion(p) ? 'ui.comparison.fermionNote' : 'ui.comparison.bosonNote')}</p>${particleLink(p.id, t('ui.comparison.openGuide'))}</div>`;
    document.getElementById('comparison-preview').innerHTML = `${previewCard(a, 'a')}<div class="pair-explanation"><h4>${pair.status}</h4><div class="channel-tags">${pair.channels.map(c => `<span class="channel-tag channel-${c}">${PAIR_CHANNELS[c].label}</span>`).join('')}</div><p>${pair.explanation}</p>${pair.sameFermion ? `<p>${t('ui.comparison.sameFermion')}</p>` : ''}</div>${previewCard(b, 'b')}`;
    document.getElementById('pair-selection-status').textContent = `${a.name} × ${b.name}. ${pair.status}.`;
    document.querySelectorAll('.matrix-cell').forEach(cell => {
        const rowSelected = cell.dataset.pairA === a.id;
        const colSelected = cell.dataset.pairB === b.id;
        cell.setAttribute('aria-pressed', rowSelected && colSelected);
        cell.classList.toggle('in-selected-axis', rowSelected || colSelected);
        cell.tabIndex = rowSelected && colSelected ? 0 : -1;
    });
    document.querySelectorAll('.matrix-axis').forEach(axis => axis.setAttribute('aria-pressed', axis.dataset.axisParticle === (axis.dataset.pairAxis === 'a' ? a.id : b.id)));
    const properties = [['type', p => FAMILY_NAMES[p.family]], ['restMass', p => p.massLabel], ['chargeUnit', p => p.charge], ['spinUnit', p => p.spin], ['interactions', interactionText], ['statistics', statisticsText], ['example', p => p.example]];
    document.getElementById('comparison-head').innerHTML = `<tr><th scope="col">${t('ui.properties.property')}</th><th scope="col">${a.name}</th><th scope="col">${b.name}</th></tr>`;
    document.getElementById('comparison-body').innerHTML = properties.map(([key, getter]) => `<tr><th scope="row">${t(`ui.properties.${key}`)}</th><td>${getter(a)}</td><td>${getter(b)}</td></tr>`).join('');
    const ratio = massRatio(a, b);
    document.getElementById('mass-comparison').textContent = ratio === null
        ? t('ui.comparison.noRatio')
        : t('ui.comparison.ratio', { a: a.name, b: b.name, ratio: new Intl.NumberFormat(currentLanguage, { maximumSignificantDigits: 4, useGrouping: false }).format(ratio) });
}

// ---------- Occupancy, reaction, and detector explorers ----------
function stateUnit(electron, count) {
    return t(`ui.state.unit.${electron ? 'electron' : 'photon'}.${count === 1 ? 'one' : 'other'}`);
}
// The last message is kept as a key so a language switch can re-render it.
let stateMessage = null;
function renderQuantumState() {
    const electron = document.getElementById('state-particle').value === 'electron';
    const labelKeys = electron ? ['ui.state.spinUp', 'ui.state.spinDown'] : ['ui.state.polarizationA', 'ui.state.polarizationB'];
    document.getElementById('state-assumption').textContent = t(electron ? 'ui.state.assumption.electron' : 'ui.state.assumption.photon');
    document.getElementById('state-boxes').innerHTML = labelKeys.map((key, i) => `<div class="state-box"><strong>${t(key)}</strong><span class="state-count">${stateCounts[i]}</span><span>${stateUnit(electron, stateCounts[i])}</span></div>`).join('');
    labelKeys.forEach((key, i) => document.getElementById(`add-state-${i}`).textContent = t('ui.state.add', { state: t(key).toLowerCase() }));
    document.getElementById('state-result').textContent = stateMessage
        ? t(stateMessage.key, { count: stateMessage.count, unit: stateUnit(electron, stateMessage.count) })
        : t('ui.state.start');
}
function resetQuantumState() {
    stateCounts = [0, 0];
    stateMessage = null;
    renderQuantumState();
}
function addQuantumParticle(state) {
    const id = document.getElementById('state-particle').value;
    const result = addToQuantumState(id, stateCounts, state);
    stateCounts = result.counts;
    stateMessage = result.accepted ? { key: 'ui.state.added', count: stateCounts[state] } : { key: 'ui.state.blocked' };
    renderQuantumState();
}
function renderProcess() {
    const process = PROCESSES[document.getElementById('process-choice').value];
    const charge = chargeBalance(process);
    const verdict = t(charge.before === charge.after ? 'ui.process.balanced' : 'ui.process.notConserved');
    document.getElementById('process-result').innerHTML = `<h4>${process.label}</h4><div class="equation">${process.equation}</div><p class="charge-check">${t('ui.process.chargeCheck', { before: charge.before, after: charge.after, verdict })}</p><p>${process.explanation}</p><div class="learning-paths">${process.particles.map(id => particleLink(id)).join('')}</div>`;
}
function renderDetector() {
    const signature = DETECTOR_SIGNATURES[document.getElementById('detector-choice').value];
    const names = [0, 1, 2, 3].map(i => t(`ui.detector.layers.${i}`));
    document.getElementById('detector-layers').innerHTML = names.map((name, i) => `<div class="detector-layer"><span class="layer-step">${i + 1}</span><h4>${name}</h4><p>${signature.layers[i]}</p></div>`).join('');
    document.getElementById('detector-explanation').textContent = signature.why;
    document.getElementById('detector-particle-link').innerHTML = t('ui.detector.catalogLink', { link: particleLink(signature.particle, signature.catalogLabel) });
}
// Discovery table in the "final map" history step: same catalog, with first-observation data.
function renderHistoryDiscoveries() {
    document.getElementById('history-discovery-rows').innerHTML = PARTICLES.map(p => `<tr><th scope="row">${particleLink(p.id, `${p.symbol} ${p.name}`)}</th><td>${FAMILY_NAMES[p.family]}</td><td>${p.generation || '—'}</td><td>${p.charge}</td><td>${p.massLabel}</td><td>${historyYearLink(p)}</td><td>${p.discovery}</td></tr>`).join('');
}
// Prediction → observation bars on a fixed 1890–2020 axis; full sentences stay available as text.
function renderHistoryTimeline() {
    const start = 1890;
    const end = 2020;
    const position = year => ((year - start) / (end - start)) * 100;
    const ticks = [1900, 1925, 1950, 1975, 2000].map(year => `<span class="timeline-tick" style="left: ${position(year).toFixed(2)}%">${year}</span>`).join('');
    const legend = `<span class="timeline-legend"><i class="legend-bar"></i>${t('page.history.extra.timeline.predicted')} <i class="legend-dot"></i>${t('page.history.extra.timeline.observed')}</span>`;
    document.getElementById('history-timeline').innerHTML = `<li class="timeline-axis" aria-hidden="true">${legend}<span class="timeline-track">${ticks}</span></li>` + DISCOVERY_TIMELINE.map(entry => {
        const p = entry.id ? particleById(entry.id) : null;
        const name = p ? p.name : t(`page.history.extra.timeline.${entry.label}`);
        const anchor = p ? HISTORY_ANCHORS.particles[p.id] : entry.anchor;
        const text = entry.predicted
            ? t('page.history.extra.timeline.entry', { name, predicted: entry.predicted, observed: entry.observed, gap: entry.observed - entry.predicted })
            : t('page.history.extra.timeline.surprise', { name, observed: entry.observed });
        const bar = entry.predicted ? `<span class="timeline-bar" style="left: ${position(entry.predicted).toFixed(2)}%; width: ${(position(entry.observed) - position(entry.predicted)).toFixed(2)}%"></span>` : '';
        return `<li class="${entry.predicted ? 'timeline-predicted' : 'timeline-surprise'}"><a href="#${anchor}" class="timeline-name">${p ? p.symbol : entry.symbol} ${name}</a><span class="timeline-track" aria-hidden="true">${bar}<span class="timeline-dot" style="left: ${position(entry.observed).toFixed(2)}%"></span></span><span class="timeline-years" aria-hidden="true">${entry.predicted ? `${entry.predicted} → ${entry.observed}` : entry.observed}</span><span class="sr-only">${text}</span></li>`;
    }).join('');
}
// ---------- Inside matter: zoom ladder, composite builder, particle creation ----------
let compositionLevel = 'atom';
let selectedComposite = 'proton';
let selectedProduction = 'charm';
let collisionEnergy = 8000;
// Energies are MeV in the model; display picks eV…TeV with locale digits (unit symbols are SI).
function formatEnergy(mev) {
    const units = [['TeV', 1e6], ['GeV', 1e3], ['MeV', 1], ['keV', 1e-3], ['eV', 1e-6]];
    const [unit, scale] = units.find(([, size]) => Math.abs(mev) >= size) || units.at(-1);
    return `${new Intl.NumberFormat(currentLanguage, { maximumSignificantDigits: 4 }).format(mev / scale)} ${unit}`;
}
const formatLength = metres => {
    const exponent = Math.round(Math.log10(metres));
    const superscript = String(exponent).replace('-', '⁻').replace(/\d/g, digit => '⁰¹²³⁴⁵⁶⁷⁸⁹'[digit]);
    return `≈ 10${superscript} m`;
};
function renderCompositionLevel() {
    const index = COMPOSITION_LEVELS.findIndex(level => level.key === compositionLevel);
    const level = COMPOSITION_LEVELS[index];
    document.querySelectorAll('.level-btn').forEach(button => button.setAttribute('aria-pressed', button.dataset.level === level.key));
    document.getElementById('zoom-out').disabled = index === 0;
    document.getElementById('zoom-in').disabled = index === COMPOSITION_LEVELS.length - 1;
    document.getElementById('compositionCanvas').setAttribute('aria-label', t(`ui.compositionCanvas.label.${level.key}`));
    const probe = t('ui.composition.probeValue', { energy: formatEnergy(probeEnergy(level.size) / 1e6) });
    document.getElementById('level-detail').innerHTML = `<h4><span class="level-step">${index + 1}</span> ${level.name}</h4><dl class="detail-list"><dt>${t('ui.composition.size')}</dt><dd>${formatLength(level.size)}</dd><dt>${t('ui.composition.inside')}</dt><dd>${level.inside}</dd><dt>${t('ui.composition.glue')}</dt><dd>${level.glue}</dd><dt>${t('ui.composition.breakIt')}</dt><dd>${level.breakIt}</dd><dt>${t('ui.composition.probe')}</dt><dd>${probe}</dd><dt>${t('ui.composition.evidence')}</dt><dd>${level.evidence}</dd></dl><p class="level-takeaway">${level.takeaway}</p><div class="learning-paths">${level.particles.map(id => particleLink(id)).join('')}</div>`;
}
function setCompositionLevel(key) {
    compositionLevel = key;
    renderCompositionLevel();
}
function renderComposite() {
    const composite = COMPOSITES[selectedComposite];
    const summary = compositeSummary(selectedComposite);
    document.getElementById('composite-choice').value = selectedComposite;
    const chips = summary.parts.map(part => {
        const label = `<span class="chip-symbol">${part.symbol}</span><small>${part.composite ? COMPOSITES[part.id].name : part.anti ? t('ui.composite.antiName', { name: particleById(part.id).name }) : particleById(part.id).name}</small><small class="chip-charge">${formatChargeThirds(part.chargeThirds)}</small>`;
        return part.composite
            ? `<button type="button" class="constituent-chip composite-chip" data-composite="${part.id}" aria-label="${t('ui.composite.openPart', { name: COMPOSITES[part.id].name })}">${label}</button>`
            : `<a class="constituent-chip" href="#particle-inspector" data-particle="${part.id}">${label}</a>`;
    }).join('<span class="chip-plus" aria-hidden="true">+</span>');
    const chargeEquation = `${summary.parts.map(part => formatChargeThirds(part.chargeThirds)).join(' ')} = ${formatChargeThirds(summary.chargeThirds)}`;
    const share = Math.min(summary.partsShare, 1) * 100;
    const verdict = summary.bound
        ? t('ui.composite.verdict.bound', { name: composite.name, binding: formatEnergy(-summary.massDifference) })
        : t(summary.partsShare < 0.5 ? 'ui.composite.verdict.light' : 'ui.composite.verdict.heavy', {
            name: composite.name,
            share: new Intl.NumberFormat(currentLanguage, { maximumFractionDigits: 1 }).format(summary.partsShare * 100),
            extra: formatEnergy(summary.massDifference)
        });
    document.getElementById('composite-result').innerHTML = `<div class="composite-head"><span class="composite-symbol">${composite.symbol}</span><div><h4>${composite.name}</h4><p class="hint">${t(`ui.composite.kinds.${composite.kind}`)}</p></div></div><div class="constituents" aria-label="${t('ui.composite.partsLabel')}">${chips}</div><div class="property-grid"><div><strong>${t('ui.composite.charge')}</strong><span>${chargeEquation}</span></div><div><strong>${t('ui.composite.mass')}</strong><span>${formatEnergy(summary.mass)}/c²</span></div><div><strong>${t(summary.bound ? 'ui.composite.partsMassBound' : 'ui.composite.partsMassQuarks')}</strong><span>${formatEnergy(summary.partsMass)}/c²</span></div><div><strong>${t('ui.composite.lifetime')}</strong><span>${composite.lifetime}</span></div></div><div class="mass-bars" aria-hidden="true"><div class="mass-bar"><span>${t('ui.composite.barWhole')}</span><i style="width: 100%"></i></div><div class="mass-bar parts"><span>${t('ui.composite.barParts')}</span><i style="width: ${share.toFixed(2)}%"></i></div></div><p class="composite-verdict">${verdict}</p><p>${composite.note}</p>`;
}
function selectComposite(key) {
    if (!COMPOSITES[key]) return;
    selectedComposite = key;
    renderComposite();
}
// Logarithmic slider from 0.5 MeV to 20 TeV.
const ENERGY_RANGE = [Math.log10(0.5), Math.log10(2e7)];
const sliderToEnergy = value => 10 ** (ENERGY_RANGE[0] + (value / 1000) * (ENERGY_RANGE[1] - ENERGY_RANGE[0]));
const energyToSlider = energy => Math.round(((Math.log10(energy) - ENERGY_RANGE[0]) / (ENERGY_RANGE[1] - ENERGY_RANGE[0])) * 1000);
function renderCreation() {
    const energyText = formatEnergy(collisionEnergy);
    const slider = document.getElementById('collision-energy');
    slider.value = energyToSlider(collisionEnergy);
    slider.setAttribute('aria-valuetext', energyText);
    document.getElementById('collision-energy-value').textContent = energyText;
    document.getElementById('collider-presets').innerHTML = COLLIDER_PRESETS.map(preset => `<button type="button" class="action-btn preset-btn" data-energy="${preset.energy}" aria-pressed="${preset.energy === collisionEnergy}">${preset.label} <small>${formatEnergy(preset.energy)}</small></button>`).join('');
    const reachable = availableProductions(collisionEnergy);
    document.getElementById('creation-status').textContent = reachable.length
        ? t('ui.creation.status', { energy: energyText, count: reachable.length, total: PRODUCTION_CHANNELS.length, heaviest: reachable.at(-1).label })
        : t('ui.creation.statusNone', { energy: energyText });
    document.getElementById('creation-list').innerHTML = PRODUCTION_CHANNELS.map(channel => {
        const open = reachable.includes(channel);
        return `<li class="${open ? 'reachable' : 'locked'}"><button type="button" class="creation-item" data-production="${channel.key}" aria-pressed="${channel.key === selectedProduction}"><span class="creation-threshold">${formatEnergy(productionThreshold(channel))}</span><span class="creation-label">${channel.label}</span><span class="creation-reaction">${channel.reaction}</span><span class="creation-state">${t(open ? 'ui.creation.reachable' : 'ui.creation.locked')}</span></button></li>`;
    }).join('');
    const channel = PRODUCTION_CHANNELS.find(c => c.key === selectedProduction);
    const threshold = productionThreshold(channel);
    const open = threshold <= collisionEnergy;
    const decays = channel.symbols.map((symbol, i) => `<li>${channel.decays[i] ? `${symbol} → ${channel.decays[i].join(' + ')}` : `${symbol}: ${t('ui.creation.stable')}`}</li>`).join('');
    const reach = open ? t('ui.creation.canMake', { threshold: formatEnergy(threshold) })
        : threshold / collisionEnergy < 2
            ? t('ui.creation.needPercent', { threshold: formatEnergy(threshold), percent: new Intl.NumberFormat(currentLanguage, { maximumSignificantDigits: 2 }).format((threshold / collisionEnergy - 1) * 100) })
            : t('ui.creation.needMore', { threshold: formatEnergy(threshold), factor: new Intl.NumberFormat(currentLanguage, { maximumSignificantDigits: 2 }).format(threshold / collisionEnergy) });
    const builder = channel.composite ? `<button type="button" class="action-btn" data-composite="${channel.composite}">${t('ui.composite.openPart', { name: COMPOSITES[channel.composite].name })}</button>` : '';
    document.getElementById('creation-detail').innerHTML = `<h4>${channel.label}</h4><div class="equation small-equation">${channel.reaction}</div><p class="creation-reach ${open ? 'reachable' : 'locked'}">${reach}</p><dl class="detail-list"><dt>${t('ui.creation.firstMade')}</dt><dd>${channel.first}</dd><dt>${t('ui.creation.thenWhat')}</dt><dd>${channel.fate}<ul class="decay-list">${decays}</ul></dd></dl><div class="learning-paths">${channel.particles.map(id => particleLink(id)).join('')}</div>${builder}`;
    document.getElementById('creationCanvas').setAttribute('aria-label', open
        ? t('ui.creationCanvas.label', { reaction: channel.reaction })
        : t('ui.creationCanvas.labelTooLow', { reaction: channel.reaction }));
}
function setCollisionEnergy(energy) {
    collisionEnergy = energy;
    renderCreation();
}
// Story blocks live in closed <details>; open them before a fragment link scrolls there.
function revealFragmentTarget(hash) {
    if (!hash || hash.length < 2) return false;
    let target = null;
    try { target = document.getElementById(decodeURIComponent(hash.slice(1))); } catch (error) { return false; }
    let opened = false;
    for (let node = target && target.parentElement; node; node = node.parentElement) {
        if (node.tagName === 'DETAILS' && !node.open) {
            node.open = true;
            opened = true;
        }
    }
    return opened;
}
function renderAllExplorers() {
    renderParticleExplorer();
    showParticleDetail(selectedParticle);
    renderComparisonOptions();
    renderInteractionMatrix();
    renderComparison();
    renderQuantumState();
    renderProcess();
    renderDetector();
    renderHistoryDiscoveries();
    renderHistoryTimeline();
    renderCompositionLevel();
    renderComposite();
    renderCreation();
}
function initParticleExplorers() {
    ['particle-family', 'particle-interaction', 'particle-sort'].forEach(id => document.getElementById(id).addEventListener('change', renderParticleExplorer));
    document.getElementById('particle-search').addEventListener('input', renderParticleExplorer);
    document.getElementById('reset-particles').addEventListener('click', () => {
        document.getElementById('particle-search').value = '';
        ['particle-family', 'particle-interaction'].forEach(id => document.getElementById(id).value = 'all');
        document.getElementById('particle-sort').value = 'model';
        renderParticleExplorer();
    });
    // Runs before native fragment navigation, so the browser scrolls to the opened block.
    document.addEventListener('click', event => {
        const link = event.target.closest('a[href^="#"]');
        if (link) revealFragmentTarget(link.getAttribute('href'));
    });
    window.addEventListener('hashchange', () => revealFragmentTarget(window.location.hash));
    document.addEventListener('click', event => {
        const control = event.target.closest('[data-particle]');
        if (!control) return;
        showParticleDetail(control.dataset.particle);
        if (control.tagName === 'BUTTON') {
            document.getElementById('particle-inspector').scrollIntoView({ behavior: 'auto', block: 'start' });
        }
        // Native links keep their fragment/history behavior; focus announces the detail title.
        document.getElementById('particle-detail-title').focus({ preventScroll: true });
    });
    renderComparisonOptions();
    ['compare-a', 'compare-b'].forEach(id => document.getElementById(id).addEventListener('change', renderComparison));
    document.getElementById('compare-a').value = 'electron';
    document.getElementById('compare-b').value = 'photon';
    document.getElementById('interaction-matrix').addEventListener('click', event => {
        const cell = event.target.closest('.matrix-cell');
        const axis = event.target.closest('.matrix-axis');
        if (cell) selectComparisonPair(cell.dataset.pairA, cell.dataset.pairB);
        else if (axis) selectComparisonPair(
            axis.dataset.pairAxis === 'a' ? axis.dataset.axisParticle : document.getElementById('compare-a').value,
            axis.dataset.pairAxis === 'b' ? axis.dataset.axisParticle : document.getElementById('compare-b').value
        );
    });
    document.getElementById('interaction-matrix').addEventListener('keydown', handleMatrixKeydown);
    document.getElementById('reset-state').addEventListener('click', resetQuantumState);
    document.getElementById('state-particle').addEventListener('change', resetQuantumState);
    [0, 1].forEach(i => document.getElementById(`add-state-${i}`).addEventListener('click', () => addQuantumParticle(i)));
    document.getElementById('process-choice').addEventListener('change', renderProcess);
    document.getElementById('detector-choice').addEventListener('change', renderDetector);
    document.querySelectorAll('.level-btn').forEach(button => button.addEventListener('click', () => setCompositionLevel(button.dataset.level)));
    [['zoom-in', 1], ['zoom-out', -1]].forEach(([id, step]) => document.getElementById(id).addEventListener('click', () => {
        const index = COMPOSITION_LEVELS.findIndex(level => level.key === compositionLevel) + step;
        if (COMPOSITION_LEVELS[index]) setCompositionLevel(COMPOSITION_LEVELS[index].key);
    }));
    document.getElementById('composite-choice').addEventListener('change', event => selectComposite(event.target.value));
    // Composite chips and "open in builder" buttons share data-composite.
    document.addEventListener('click', event => {
        const control = event.target.closest('button[data-composite]');
        if (!control) return;
        selectComposite(control.dataset.composite);
        if (!control.closest('#composite-builder')) document.getElementById('composite-builder').scrollIntoView({ behavior: 'auto', block: 'start' });
        document.getElementById('composite-choice').focus({ preventScroll: true });
    });
    document.getElementById('collision-energy').addEventListener('input', event => setCollisionEnergy(sliderToEnergy(Number(event.target.value))));
    document.getElementById('collider-presets').addEventListener('click', event => {
        const preset = event.target.closest('[data-energy]');
        if (preset) setCollisionEnergy(Number(preset.dataset.energy));
    });
    document.getElementById('creation-list').addEventListener('click', event => {
        const item = event.target.closest('[data-production]');
        if (!item) return;
        selectedProduction = item.dataset.production;
        renderCreation();
        document.querySelector(`[data-production="${selectedProduction}"]`).focus();
    });
    document.querySelectorAll('details').forEach(details => details.addEventListener('toggle', updateNavigation));
    document.getElementById('language-choice').addEventListener('change', event => setLanguage(event.target.value, { persist: true }));
    renderAllExplorers();
}

// ---------- Canvas visualizations ----------
function initVisualizations() {
    // Scale visualization
    const scaleCanvas = document.getElementById('scaleVisualization');
    if (scaleCanvas) {
        drawScaleVisualization(scaleCanvas);
    }

    // Atom model (its aria-label is translated through data-i18n-attr)
    const atomCanvas = document.getElementById('atomModel');
    if (atomCanvas) {
        animateAtom(atomCanvas);
    }

    const compositionCanvas = document.getElementById('compositionCanvas');
    if (compositionCanvas) animateComposition(compositionCanvas);
    const creationCanvas = document.getElementById('creationCanvas');
    if (creationCanvas) animateCreation(creationCanvas);
}

// Scale visualization: labels are looked up each frame so they follow the active language.
function drawScaleVisualization(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    let zoom = 1;
    let targetZoom = 1;

    const scales = [
        { size: 26, key: 'observableUniverse', color: '#8338ec' },
        { size: 21, key: 'galaxy', color: '#3a86ff' },
        { size: 12, key: 'solarSystem', color: '#00d4ff' },
        { size: 6, key: 'earth', color: '#06ffa5' },
        { size: 0, key: 'human', color: '#ffb700' },
        { size: -3, key: 'millimeter', color: '#ff9500' },
        { size: -6, key: 'micrometer', color: '#ff6b00' },
        { size: -9, key: 'nanometer', color: '#ff4500' },
        { size: -10, key: 'atom', color: '#ff006e' },
        { size: -15, key: 'nucleus', color: '#cc0055' },
        { size: -18, key: 'quark', color: '#990044' }
    ];

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        const visibleLabels = [];

        // Draw scales
        scales.forEach((scale) => {
            const radius = Math.max(10, (scale.size + 20) * zoom * 5);
            const alpha = Math.max(0.3, 1 - Math.abs(radius - 100) / 200);

            ctx.strokeStyle = scale.color;
            ctx.lineWidth = 2;
            ctx.globalAlpha = alpha;

            ctx.beginPath();
            ctx.arc(centerX, centerY, Math.abs(radius), 0, Math.PI * 2);
            ctx.stroke();

            if (Math.abs(radius - 100) < 50) {
                visibleLabels.push({ scale, label: t(`ui.scaleCanvas.${scale.key}`), radius, alpha });
            }
        });

        // Labels: give each visible ring its own row so text never overlaps.
        // Outer rings sit higher; a leader line joins each label to its ring.
        const rowHeight = 40;
        const firstRowY = centerY - ((visibleLabels.length - 1) * rowHeight) / 2;
        ctx.font = '14px Arial';
        const widestLabel = Math.max(0, ...visibleLabels.map(l => ctx.measureText(l.label).width));
        const labelX = Math.min(
            centerX + Math.max(0, ...visibleLabels.map(l => l.radius)) + 30,
            canvas.width - widestLabel - 8
        );
        visibleLabels.forEach(({ scale, label, radius, alpha }, row) => {
            const y = firstRowY + row * rowHeight;
            ctx.globalAlpha = alpha;
            ctx.strokeStyle = scale.color;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(centerX + radius, centerY);
            ctx.lineTo(labelX - 6, y - 4);
            ctx.stroke();

            // Backing plate keeps text legible where it crosses rings (narrow canvases)
            ctx.globalAlpha = 0.85;
            ctx.fillStyle = 'rgb(10, 14, 39)';
            ctx.fillRect(labelX - 4, y - 14, widestLabel + 8, 34);
            ctx.globalAlpha = alpha;

            ctx.fillStyle = scale.color;
            ctx.textBaseline = 'alphabetic';
            ctx.font = '14px Arial';
            ctx.fillText(label, labelX, y);
            ctx.font = '12px Arial';
            ctx.fillText(`10^${scale.size} m`, labelX, y + 16);
        });

        ctx.globalAlpha = 1;

        // Smooth zoom
        zoom += (targetZoom - zoom) * 0.1;
        requestAnimationFrame(draw);
    }

    // Mouse wheel zoom
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        targetZoom *= e.deltaY > 0 ? 0.9 : 1.1;
        targetZoom = Math.max(0.1, Math.min(10, targetZoom));
    });

    draw();
}

// Animate atom model
function animateAtom(canvas) {
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    let time = 0;

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw nucleus
        ctx.fillStyle = '#ff006e';
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff006e';
        ctx.beginPath();
        ctx.arc(centerX, centerY, 25, 0, Math.PI * 2);
        ctx.fill();

        // Draw protons and neutrons in nucleus
        for (let i = 0; i < 3; i++) {
            const angle = (Math.PI * 2 / 3) * i + time * 0.5;
            const x = centerX + Math.cos(angle) * 10;
            const y = centerY + Math.sin(angle) * 10;

            ctx.fillStyle = i < 2 ? '#ff4444' : '#4444ff';
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.shadowBlur = 0;

        // Draw electron orbitals
        for (let orbit = 1; orbit <= 3; orbit++) {
            const radius = 40 + orbit * 35;

            // Orbital path
            ctx.strokeStyle = 'rgba(100, 255, 218, 0.2)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);

            // Electron
            const electronAngle = time * (4 - orbit) * 0.5;
            const electronX = centerX + Math.cos(electronAngle) * radius;
            const electronY = centerY + Math.sin(electronAngle) * radius;

            // Electron trail
            for (let j = 0; j < 10; j++) {
                const trailAngle = electronAngle - j * 0.1;
                const trailX = centerX + Math.cos(trailAngle) * radius;
                const trailY = centerY + Math.sin(trailAngle) * radius;

                ctx.fillStyle = `rgba(0, 212, 255, ${0.5 - j * 0.05})`;
                ctx.beginPath();
                ctx.arc(trailX, trailY, 5 - j * 0.4, 0, Math.PI * 2);
                ctx.fill();
            }

            // Main electron
            ctx.fillStyle = '#00d4ff';
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#00d4ff';
            ctx.beginPath();
            ctx.arc(electronX, electronY, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
        }

        // Labels
        ctx.fillStyle = '#e0e6ed';
        ctx.font = '12px Arial';
        ctx.fillText(t('ui.atomCanvas.nucleus'), centerX - 25, centerY + 45);
        ctx.fillText(t('ui.atomCanvas.paths'), centerX + 100, centerY - 100);

        time += 0.02;
        requestAnimationFrame(draw);
    }

    draw();
}

// Shared canvas text helper; labels are translated each frame.
function canvasLabel(ctx, text, x, y, { align = 'center', color = '#e0e6ed', size = 12 } = {}) {
    ctx.fillStyle = color;
    ctx.font = `${size}px 'Segoe UI', system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.fillText(text, x, y);
    ctx.textAlign = 'start';
}
function sizeCanvas(canvas) {
    canvas.width = canvas.offsetWidth || 600;
    canvas.height = canvas.offsetHeight || 400;
}
// Zoom ladder drawing for compositionLevel. Schematic, not to scale (the caption says so).
function animateComposition(canvas) {
    const ctx = canvas.getContext('2d');
    sizeCanvas(canvas);
    let time = 0;
    const quarkColors = ['#ff5c7a', '#5cff9d', '#5c9dff'];
    function circle(x, y, r, fill) {
        ctx.fillStyle = fill;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    function spring(x1, y1, x2, y2, phase) {
        const length = Math.hypot(x2 - x1, y2 - y1);
        const angle = Math.atan2(y2 - y1, x2 - x1);
        ctx.save();
        ctx.translate(x1, y1);
        ctx.rotate(angle);
        ctx.strokeStyle = 'rgba(255, 207, 105, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let s = 0; s <= length; s += 2) ctx.lineTo(s, Math.sin(s / 5 + phase) * 5);
        ctx.stroke();
        ctx.restore();
    }
    // Time follows the clock, not the frame rate, so throttled or fast displays agree.
    function draw(now = 0) {
        time = now / 1000;
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const r = Math.min(w, h) * 0.36;
        ctx.clearRect(0, 0, w, h);
        if (compositionLevel === 'atom') {
            const cloud = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
            cloud.addColorStop(0, 'rgba(0, 212, 255, 0.45)');
            cloud.addColorStop(0.6, 'rgba(0, 212, 255, 0.15)');
            cloud.addColorStop(1, 'rgba(0, 212, 255, 0)');
            circle(cx, cy, r, cloud);
            // Flickering dots: where an electron might be found, not a path.
            for (let i = 0; i < 70; i++) {
                const a = i * 2.4 + Math.floor(time * 3 + i) * 1.7;
                const d = r * Math.abs(Math.sin(i * 12.9898 + Math.floor(time * 3 + i * 0.3))) ** 0.8;
                circle(cx + Math.cos(a) * d, cy + Math.sin(a) * d, 1.6, 'rgba(160, 235, 255, 0.8)');
            }
            circle(cx, cy, 4, '#ff006e');
            canvasLabel(ctx, t('ui.compositionCanvas.atom.cloud'), cx, cy - r - 12);
            canvasLabel(ctx, t('ui.compositionCanvas.atom.nucleus'), cx, cy + 22, { color: '#ff8fb8' });
        } else if (compositionLevel === 'nucleus') {
            const nucleons = [[-1, -1, 'p'], [1, 1, 'p'], [1, -1, 'n'], [-1, 1, 'n']];
            const unit = r * 0.32;
            const points = nucleons.map(([dx, dy, kind], i) => [cx + dx * unit * 0.75 + Math.sin(time * 2 + i) * 4, cy + dy * unit * 0.75 + Math.cos(time * 2.3 + i) * 4, kind]);
            // Pion exchange between neighbours: the residual strong force.
            points.forEach(([x1, y1], i) => {
                const [x2, y2] = points[(i + 1) % points.length];
                const f = (time * 0.6 + i * 0.25) % 1;
                ctx.strokeStyle = 'rgba(255, 207, 105, 0.25)';
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
                circle(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 3, '#ffcf69');
            });
            points.forEach(([x, y, kind]) => {
                circle(x, y, unit * 0.62, kind === 'p' ? '#d6336c' : '#3a6fd8');
                canvasLabel(ctx, kind, x, y + 6, { size: 18 });
            });
            canvasLabel(ctx, t('ui.compositionCanvas.nucleus.title'), cx, 28);
            canvasLabel(ctx, t('ui.compositionCanvas.nucleus.exchange'), cx, h - 26, { color: '#ffcf69' });
        } else if (compositionLevel === 'nucleon') {
            ctx.strokeStyle = 'rgba(214, 51, 108, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
            circle(cx, cy, r, 'rgba(214, 51, 108, 0.08)');
            // Short-lived sea pairs appear and vanish.
            for (let i = 0; i < 6; i++) {
                const life = (time * 0.7 + i / 6) % 1;
                const a = i * 1.9 + Math.floor(time * 0.7 + i / 6) * 2.2;
                const d = r * (0.3 + 0.55 * ((i * 0.37) % 1));
                const x = cx + Math.cos(a) * d;
                const y = cy + Math.sin(a) * d;
                ctx.globalAlpha = Math.sin(life * Math.PI) * 0.7;
                circle(x - 5, y, 3, '#c3cddd');
                circle(x + 5, y, 3, '#8892b0');
                ctx.globalAlpha = 1;
            }
            const quarks = ['u', 'u', 'd'].map((flavor, i) => {
                const a = (Math.PI * 2 / 3) * i + time * 0.4;
                const d = r * (0.42 + 0.12 * Math.sin(time * 1.7 + i * 2));
                return [cx + Math.cos(a) * d, cy + Math.sin(a) * d, flavor, i];
            });
            quarks.forEach(([x, y], i) => {
                const [x2, y2] = quarks[(i + 1) % 3];
                spring(x, y, x2, y2, time * 6);
            });
            const colorShift = Math.floor(time * 0.8);
            quarks.forEach(([x, y, flavor, i]) => {
                circle(x, y, 13, quarkColors[(i + colorShift) % 3]);
                canvasLabel(ctx, flavor, x, y + 5, { color: '#0a0e27', size: 15 });
            });
            canvasLabel(ctx, t('ui.compositionCanvas.nucleon.valence'), cx, 24);
            canvasLabel(ctx, t('ui.compositionCanvas.nucleon.gluons'), cx, h - 44, { color: '#ffcf69' });
            canvasLabel(ctx, t('ui.compositionCanvas.nucleon.sea'), cx, h - 26, { color: '#c3cddd' });
        } else {
            // Shrinking rings: resolution reached by probes, with no structure found.
            for (let i = 0; i < 4; i++) {
                const f = 1 - ((time * 0.25 + i / 4) % 1);
                ctx.strokeStyle = `rgba(0, 212, 255, ${0.6 * (1 - f) + 0.1})`;
                ctx.lineWidth = 1.5;
                ctx.beginPath(); ctx.arc(cx, cy, 8 + f * r, 0, Math.PI * 2); ctx.stroke();
            }
            circle(cx, cy, 3, '#ffffff');
            canvasLabel(ctx, t('ui.compositionCanvas.elementary.point'), cx, cy - 18);
            canvasLabel(ctx, t('ui.compositionCanvas.elementary.limit'), cx, h - 26, { color: '#83e6ff' });
        }
        canvasLabel(ctx, t('ui.compositionCanvas.notToScale'), w - 10, h - 6, { align: 'right', color: '#8892b0', size: 10 });
        requestAnimationFrame(draw);
    }
    draw();
}
// Collision animation for selectedProduction at collisionEnergy: beams meet, a flash, the
// products fly apart and decay. Below threshold the beams only scatter.
function animateCreation(canvas) {
    const ctx = canvas.getContext('2d');
    sizeCanvas(canvas);
    let time = 0;
    function dot(x, y, r, color) {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }
    // Time follows the clock, not the frame rate, so throttled or fast displays agree.
    function draw(now = 0) {
        time = now / 1000;
        const w = canvas.width;
        const h = canvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const reach = Math.min(w, h) * 0.42;
        const channel = PRODUCTION_CHANNELS.find(c => c.key === selectedProduction);
        const open = productionThreshold(channel) <= collisionEnergy;
        const incoming = channel.key === 'electronPair' ? ['γ', 'γ'] : ['e⁻', 'e⁺'];
        const cycle = 4.2;
        const phase = time % cycle;
        const seed = Math.floor(time / cycle);
        ctx.clearRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(136, 146, 176, 0.25)';
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
        ctx.setLineDash([]);
        if (phase < 1) {
            const x = (cx - 20) * phase;
            dot(x, cy, 6, '#00d4ff'); canvasLabel(ctx, incoming[0], x, cy - 14, { color: '#83e6ff' });
            dot(w - x, cy, 6, '#ff82b6'); canvasLabel(ctx, incoming[1], w - x, cy - 14, { color: '#ff82b6' });
        } else if (!open) {
            const f = Math.min((phase - 1) / 1.6, 1);
            dot(cx - 20 - f * cx * 0.7, cy - f * 60, 6, '#00d4ff');
            dot(cx + 20 + f * cx * 0.7, cy + f * 60, 6, '#ff82b6');
            if (phase < 1.25) dot(cx, cy, 10 * (1.25 - phase) * 4, 'rgba(255, 255, 255, 0.5)');
            canvasLabel(ctx, t('ui.creationCanvas.tooLow'), cx, 28, { color: '#ffcf69', size: 14 });
        } else {
            const flash = phase - 1;
            if (flash < 0.35) {
                dot(cx, cy, 10 + flash * 120, `rgba(255, 240, 200, ${0.9 - flash * 2.4})`);
                canvasLabel(ctx, `E = ${formatEnergy(collisionEnergy)}`, cx, cy - 40, { color: '#fff3c4', size: 14 });
            }
            // Keep products near the beam plane so labels stay clear of the reaction caption.
            const baseAngle = ((seed * 0.77) % 1.2) - 0.6;
            const count = channel.symbols.length;
            channel.symbols.forEach((symbol, i) => {
                const angle = baseAngle + (count === 1 ? Math.PI / 2 : i * Math.PI);
                const travel = count === 1 ? 0.25 : 1;
                const out = Math.min(flash / 1.2, 1) * reach * 0.55 * travel;
                const x = cx + Math.cos(angle) * out;
                const y = cy + Math.sin(angle) * out;
                const decays = channel.decays[i];
                if (!decays || flash < 1.3) {
                    const along = Math.min(flash / 1.2, 1);
                    ctx.strokeStyle = 'rgba(255, 207, 105, 0.6)';
                    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
                    dot(x, y, 7, '#ffcf69');
                    canvasLabel(ctx, symbol, x, y - 12, { color: '#ffcf69', size: 15 });
                    if (!decays && along >= 1) canvasLabel(ctx, t('ui.creationCanvas.stable'), x, y + 22, { color: '#b0bfd0', size: 11 });
                } else {
                    ctx.strokeStyle = 'rgba(255, 207, 105, 0.6)';
                    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
                    canvasLabel(ctx, symbol, x, y - 12, { color: 'rgba(255, 207, 105, 0.7)', size: 12 });
                    const spread = Math.min((flash - 1.3) / 1.2, 1) * reach * 0.45;
                    decays.forEach((daughter, j) => {
                        const a = angle + (j - (decays.length - 1) / 2) * 0.7;
                        const dx = x + Math.cos(a) * spread;
                        const dy = y + Math.sin(a) * spread;
                        const neutrino = daughter.includes('ν');
                        ctx.strokeStyle = neutrino ? 'rgba(136, 146, 176, 0.6)' : 'rgba(6, 255, 165, 0.8)';
                        ctx.setLineDash(neutrino ? [3, 4] : []);
                        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(dx, dy); ctx.stroke();
                        ctx.setLineDash([]);
                        dot(dx, dy, 4, neutrino ? '#8892b0' : '#06ffa5');
                        canvasLabel(ctx, daughter, dx, dy - 9, { color: neutrino ? '#b0bfd0' : '#7dffcf', size: 12 });
                    });
                }
            });
            canvasLabel(ctx, channel.reaction, cx, 28, { color: '#e0e6ed', size: 14 });
        }
        canvasLabel(ctx, t('ui.creationCanvas.legend'), w - 10, h - 8, { align: 'right', color: '#8892b0', size: 10 });
        requestAnimationFrame(draw);
    }
    draw();
}

// Hero animation: particles fly out of a collision point and leave fading tracks.
function createParticleCollision() {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 400;
    const ctx = canvas.getContext('2d');

    const particles = [];
    const tracks = [];

    // Create collision
    function collision() {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;

        // Create outgoing particles
        for (let i = 0; i < 20; i++) {
            const angle = (Math.PI * 2 / 20) * i + Math.random() * 0.2;
            const speed = 2 + Math.random() * 3;

            particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                color: `hsl(${Math.random() * 360}, 100%, 50%)`,
                life: 1
            });
        }
    }

    function animate() {
        ctx.fillStyle = 'rgba(10, 14, 39, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Update and draw particles
        particles.forEach((p, index) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.01;

            if (p.life > 0) {
                ctx.fillStyle = p.color;
                ctx.globalAlpha = p.life;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
                ctx.fill();

                // Add to tracks
                tracks.push({ x: p.x, y: p.y, color: p.color, alpha: p.life * 0.5 });
            } else {
                particles.splice(index, 1);
            }
        });

        // Draw tracks
        tracks.forEach((track, index) => {
            track.alpha -= 0.005;
            if (track.alpha > 0) {
                ctx.fillStyle = track.color;
                ctx.globalAlpha = track.alpha;
                ctx.fillRect(track.x, track.y, 1, 1);
            } else {
                tracks.splice(index, 1);
            }
        });

        ctx.globalAlpha = 1;

        // Restart collision
        if (particles.length === 0 && tracks.length === 0) {
            collision();
        }

        requestAnimationFrame(animate);
    }

    collision();
    animate();

    return canvas;
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Translate static markup before explorers render; they render once below.
    setLanguage(preferredLanguage(), { rerender: false });
    initParticleExplorers();
    initVisualizations();

    // Add particle collision to hero section
    const heroDemo = document.querySelector('.hero .interactive-demo');
    if (heroDemo) {
        const collisionCanvas = createParticleCollision();
        collisionCanvas.style.width = '100%';
        collisionCanvas.style.height = '200px';
        collisionCanvas.style.borderRadius = '15px';
        collisionCanvas.style.marginTop = '2rem';
        heroDemo.appendChild(collisionCanvas);
    }

    // A shared link to a story block: open its disclosure, then jump to it. Repeat once
    // after images and fonts load, since the hero canvas and icons shift the layout.
    if (revealFragmentTarget(window.location.hash)) {
        const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
        const jump = () => target.scrollIntoView({ behavior: 'instant' });
        jump();
        window.addEventListener('load', jump, { once: true });
    }

    // Console Easter egg
    console.log(`%c${t('ui.console.welcome')}`, 'font-size: 20px; color: #00d4ff; font-weight: bold;');
    console.log(`%c${t('ui.console.intro')}`, 'color: #06ffa5;');
    [0, 1, 2].forEach(i => console.log(`%c• ${t(`ui.console.facts.${i}`)}`, 'color: #8892b0;'));
});
