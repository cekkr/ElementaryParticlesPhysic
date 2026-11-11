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
        { key: 'quarks', families: ['quark'] },
        { key: 'leptons', families: ['lepton'] },
        { key: 'bosons', families: ['gauge', 'scalar'] }
    ];
    document.getElementById('particle-grid').innerHTML = groups.map(group => {
        const members = visible.filter(p => group.families.includes(p.family));
        if (!members.length) return '';
        return `<div class="family-group"><h4>${t(`ui.catalog.groups.${group.key}.title`)}</h4><p class="hint">${t(`ui.catalog.groups.${group.key}.subtitle`)}</p><div class="particle-grid">${members.map(p => `<button type="button" class="particle-tile ${p.family}" data-particle="${p.id}" aria-controls="particle-inspector" aria-pressed="${p.id === selectedParticle}"><span class="particle-symbol">${p.symbol}</span><span class="particle-name">${p.name}</span><span class="tile-mass">${p.mass === null ? t('ui.catalog.mixedMass') : p.massLabel}</span><span class="tile-meta">${p.generation ? `${t('ui.catalog.generationShort', { generation: p.generation })} · ` : ''}Q ${p.charge} · ${t('ui.catalog.spin')} ${p.spin}</span></button>`).join('')}</div></div>`;
    }).join('');
    document.getElementById('particle-rows').innerHTML = visible.map(p => `<tr><th scope="row"><button type="button" class="table-particle" data-particle="${p.id}" aria-controls="particle-inspector" aria-pressed="${p.id === selectedParticle}">${p.symbol} ${p.name}</button></th><td>${FAMILY_NAMES[p.family]}</td><td>${p.generation || '—'}</td><td>${p.massLabel}</td><td>${p.charge}</td><td>${p.spin}</td><td>${interactionText(p)}</td></tr>`).join('');
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
    document.getElementById('particle-detail').innerHTML = `<div class="property-grid"><div><strong>${t('ui.properties.type')}</strong><span>${FAMILY_NAMES[p.family]}</span></div><div><strong>${t('ui.properties.restMass')}</strong><span>${p.massLabel}</span></div><div><strong>${t('ui.properties.electricCharge')}</strong><span>${p.charge} e</span></div><div><strong>${t('ui.properties.spin')}</strong><span>${t('ui.inspector.spinValue', { spin: p.spin })}</span></div></div><p class="particle-example">${p.example}</p><dl class="detail-list"><dt>${t('ui.inspector.massOrigin')}</dt><dd>${p.massNote} ${higgsNote}</dd><dt>${t('ui.properties.interactions')}</dt><dd>${interactionText(p)}. ${chargeNote}</dd><dt>${t('ui.inspector.quantumRule')}</dt><dd>${statisticsText(p)}</dd></dl><div class="learning-paths"><a href="#${isFermion(p) ? 'fermions' : 'forces'}">${t(isFermion(p) ? 'ui.inspector.paths.matter' : 'ui.inspector.paths.forces')}</a><a href="#higgs">${t('ui.inspector.paths.higgs')}</a><a href="#quantum">${t('ui.inspector.paths.quantum')}</a><a href="#interactions">${t('ui.inspector.paths.reaction')}</a><a href="#detection">${t('ui.inspector.paths.detection')}</a></div><p class="source-note"><a href="https://pdg.lbl.gov/2025/tables/rpp2025-sum-${source}.pdf">${t('ui.inspector.pdgReference')}</a> · <a href="#references">${t('ui.inspector.conventions')}</a></p>`;
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
function renderAllExplorers() {
    renderParticleExplorer();
    showParticleDetail(selectedParticle);
    renderComparisonOptions();
    renderInteractionMatrix();
    renderComparison();
    renderQuantumState();
    renderProcess();
    renderDetector();
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

    // Console Easter egg
    console.log(`%c${t('ui.console.welcome')}`, 'font-size: 20px; color: #00d4ff; font-weight: bold;');
    console.log(`%c${t('ui.console.intro')}`, 'color: #06ffa5;');
    [0, 1, 2].forEach(i => console.log(`%c• ${t(`ui.console.facts.${i}`)}`, 'color: #8892b0;'));
});
