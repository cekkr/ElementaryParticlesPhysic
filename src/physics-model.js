// ============================================
// Pure physics teaching model (no DOM access).
// generate.js inlines this file into the physics-model script element and replaces the
// I18N placeholder below with every locale from src/i18n/*.json. The tests run
// this script in an isolated node:vm context, so it must never touch `document`.
// ============================================

// Flattened translation tables keyed by language code, e.g. I18N.en['model.pair.status.tree'].
const I18N = /* @inject:i18n */ { en: {} };
const DEFAULT_LANGUAGE = 'en';
let currentLanguage = DEFAULT_LANGUAGE;

// Look up a translated string; missing keys fall back to English, then to the key itself.
// `{name}` placeholders are replaced from `vars`.
function t(key, vars) {
    const table = I18N[currentLanguage] || I18N[DEFAULT_LANGUAGE];
    let text = table[key] ?? I18N[DEFAULT_LANGUAGE][key] ?? key;
    if (vars) text = text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
    return text;
}
function setModelLanguage(language) {
    currentLanguage = I18N[language] ? language : DEFAULT_LANGUAGE;
    return currentLanguage;
}
// Attach read-only text getters so records always report the active language.
function withText(record, prefix, fields) {
    for (const field of fields) {
        Object.defineProperty(record, field, { enumerable: true, get: () => t(`${prefix}.${field}`) });
    }
    return record;
}
function textMap(prefix, keys) {
    return withText({}, prefix, keys);
}

// Rounded teaching values from the PDG 2025 summary tables; masses in MeV/c².
// Null means a flavor state has no single mass, never a measured zero.
// Text fields (name, massLabel, example, massNote, discovery, role, origin, fate) come from model.particles.<id>.*.
// `discovered` is the year (or span) of the first observation, from the history steps.
const PARTICLES = [
    { id: 'up', symbol: 'u', family: 'quark', generation: 1, mass: 2.16, charge: '+2/3', spin: '1/2', interactions: ['strong', 'em', 'weak'], discovered: '1968' },
    { id: 'down', symbol: 'd', family: 'quark', generation: 1, mass: 4.70, charge: '−1/3', spin: '1/2', interactions: ['strong', 'em', 'weak'], discovered: '1968' },
    { id: 'charm', symbol: 'c', family: 'quark', generation: 2, mass: 1273, charge: '+2/3', spin: '1/2', interactions: ['strong', 'em', 'weak'], discovered: '1974' },
    { id: 'strange', symbol: 's', family: 'quark', generation: 2, mass: 93.5, charge: '−1/3', spin: '1/2', interactions: ['strong', 'em', 'weak'], discovered: '1947' },
    { id: 'top', symbol: 't', family: 'quark', generation: 3, mass: 172560, charge: '+2/3', spin: '1/2', interactions: ['strong', 'em', 'weak'], discovered: '1995' },
    { id: 'bottom', symbol: 'b', family: 'quark', generation: 3, mass: 4183, charge: '−1/3', spin: '1/2', interactions: ['strong', 'em', 'weak'], discovered: '1977' },
    { id: 'electron', symbol: 'e⁻', family: 'lepton', generation: 1, mass: 0.510999, charge: '−1', spin: '1/2', interactions: ['em', 'weak'], discovered: '1897' },
    { id: 'muon', symbol: 'μ⁻', family: 'lepton', generation: 2, mass: 105.658, charge: '−1', spin: '1/2', interactions: ['em', 'weak'], discovered: '1936' },
    { id: 'tau', symbol: 'τ⁻', family: 'lepton', generation: 3, mass: 1776.93, charge: '−1', spin: '1/2', interactions: ['em', 'weak'], discovered: '1975' },
    { id: 'e_neutrino', symbol: 'νₑ', family: 'lepton', generation: 1, mass: null, charge: '0', spin: '1/2', interactions: ['weak'], discovered: '1956' },
    { id: 'mu_neutrino', symbol: 'νμ', family: 'lepton', generation: 2, mass: null, charge: '0', spin: '1/2', interactions: ['weak'], discovered: '1962' },
    { id: 'tau_neutrino', symbol: 'ντ', family: 'lepton', generation: 3, mass: null, charge: '0', spin: '1/2', interactions: ['weak'], discovered: '2000' },
    { id: 'photon', symbol: 'γ', family: 'gauge', generation: null, mass: 0, charge: '0', spin: '1', interactions: ['em'], discovered: '1905–1923' },
    { id: 'gluon', symbol: 'g', family: 'gauge', generation: null, mass: 0, charge: '0', spin: '1', interactions: ['strong'], discovered: '1979' },
    { id: 'w_boson', symbol: 'W±', family: 'gauge', generation: null, mass: 80369, charge: '±1', spin: '1', interactions: ['em', 'weak'], discovered: '1983' },
    { id: 'z_boson', symbol: 'Z⁰', family: 'gauge', generation: null, mass: 91187.6, charge: '0', spin: '1', interactions: ['weak'], discovered: '1983' },
    { id: 'higgs', symbol: 'H', family: 'scalar', generation: null, mass: 125200, charge: '0', spin: '0', interactions: ['higgs'], discovered: '2012' }
].map(p => withText(p, `model.particles.${p.id}`, ['name', 'massLabel', 'example', 'massNote', 'discovery', 'role', 'origin', 'fate']));
// Link targets (element ids) inside the history steps distributed through the page.
// particles: the block telling each discovery; families/topics: where a label was learned.
const HISTORY_ANCHORS = {
    particles: {
        up: 'history-partons', down: 'history-partons', charm: 'history-charm', strange: 'history-strangeness',
        top: 'history-top', bottom: 'history-bottom', electron: 'history-electron', muon: 'history-muon',
        tau: 'history-tau', e_neutrino: 'history-neutrino-detection', mu_neutrino: 'history-two-neutrinos',
        tau_neutrino: 'history-tau-neutrino', photon: 'history-photon', gluon: 'history-gluon',
        w_boson: 'history-wz', z_boson: 'history-wz', higgs: 'history-higgs-boson'
    },
    families: { quark: 'history-quarks', lepton: 'history-hadron-names', gauge: 'history-gauge', scalar: 'history-higgs' },
    topics: { spin: 'history-spin', antimatter: 'history-antimatter', generations: 'history-families' }
};
// Prediction/observation years for the summary timeline. Entries without `id` are
// composite or antimatter milestones labelled by page.history.extra.timeline.<label>.
const DISCOVERY_TIMELINE = [
    { id: 'electron', observed: 1897 },
    { id: 'photon', predicted: 1905, observed: 1923 },
    { label: 'positron', symbol: 'e⁺', anchor: 'history-antimatter', predicted: 1931, observed: 1932 },
    { id: 'e_neutrino', predicted: 1930, observed: 1956 },
    { id: 'muon', observed: 1936 },
    { label: 'pion', symbol: 'π', anchor: 'history-pion', predicted: 1935, observed: 1947 },
    { id: 'strange', observed: 1947 },
    { id: 'mu_neutrino', observed: 1962 },
    { label: 'omega', symbol: 'Ω⁻', anchor: 'history-quarks', predicted: 1962, observed: 1964 },
    { id: 'up', predicted: 1964, observed: 1968 },
    { id: 'down', predicted: 1964, observed: 1968 },
    { id: 'charm', predicted: 1970, observed: 1974 },
    { id: 'tau', observed: 1975 },
    { id: 'bottom', predicted: 1973, observed: 1977 },
    { id: 'gluon', predicted: 1973, observed: 1979 },
    { id: 'w_boson', predicted: 1961, observed: 1983 },
    { id: 'z_boson', predicted: 1961, observed: 1983 },
    { id: 'top', predicted: 1973, observed: 1995 },
    { id: 'tau_neutrino', predicted: 1975, observed: 2000 },
    { id: 'higgs', predicted: 1964, observed: 2012 }
];
const INTERACTION_NAMES = textMap('model.interactions', ['strong', 'em', 'weak', 'higgs']);
const FAMILY_NAMES = textMap('model.families', ['quark', 'lepton', 'gauge', 'scalar']);

function selectParticles({ family = 'all', interaction = 'all', query = '', sort = 'model' } = {}) {
    const term = query.trim().toLowerCase();
    const result = PARTICLES.filter(p => (family === 'all' || p.family === family)
        && (interaction === 'all' || p.interactions.includes(interaction))
        && `${p.name} ${p.symbol} ${p.example}`.toLowerCase().includes(term));
    if (sort === 'mass') result.sort((a, b) => (a.mass ?? Infinity) - (b.mass ?? Infinity));
    if (sort === 'name') result.sort((a, b) => a.name.localeCompare(b.name, currentLanguage));
    return result;
}
function massRatio(a, b) {
    if (a.mass === null || b.mass === null || b.mass === 0) return null;
    return a.mass / b.mass;
}
const PAIR_CHANNELS = {
    strong: withText({ code: 'S' }, 'model.channels.strong', ['label']),
    em: withText({ code: 'E' }, 'model.channels.em', ['label']),
    weak: withText({ code: 'W' }, 'model.channels.weak', ['label']),
    higgs: withText({ code: 'H' }, 'model.channels.higgs', ['label']),
    loop: withText({ code: 'L' }, 'model.channels.loop', ['label'])
};
// Qualitative A+B → A+B channels, not an intersection of the catalog's filter tags.
// Neutrino Yukawa couplings are omitted in the minimal-SM approximation.
// Explanations are keys under model.pair.explanation.*.
function pairInteraction(aId, bId) {
    const a = PARTICLES.find(p => p.id === aId);
    const b = PARTICLES.find(p => p.id === bId);
    if (!a || !b) throw new Error('Unknown particle pair');
    const fermion = p => ['quark', 'lepton'].includes(p.family);
    const charged = p => p.charge !== '0';
    const channels = [];
    let explanation;
    if (fermion(a) && fermion(b)) {
        if (a.family === 'quark' && b.family === 'quark') channels.push('strong');
        if (charged(a) && charged(b)) channels.push('em');
        channels.push('weak');
        if (charged(a) && charged(b)) channels.push('higgs');
        explanation = 'fermionPair';
    } else if (fermion(a) || fermion(b)) {
        const f = fermion(a) ? a : b;
        const boson = fermion(a) ? b : a;
        if (boson.id === 'photon' && charged(f)) {
            channels.push('em');
            explanation = 'compton';
        } else if (boson.id === 'gluon' && f.family === 'quark') {
            channels.push('strong');
            explanation = 'quarkGluon';
        } else if (['w_boson', 'z_boson'].includes(boson.id)) {
            if (boson.id === 'w_boson' && charged(f)) channels.push('em');
            channels.push('weak');
            if (charged(f)) channels.push('higgs');
            explanation = 'fermionVector';
        } else if (boson.id === 'higgs' && charged(f)) {
            channels.push('higgs');
            explanation = 'yukawa';
        }
    } else {
        const ids = [a.id, b.id].sort().join(':');
        const bosonChannels = {
            'gluon:gluon': ['strong'], 'photon:w_boson': ['em'],
            'w_boson:w_boson': ['em', 'weak', 'higgs'],
            'w_boson:z_boson': ['weak', 'higgs'], 'z_boson:z_boson': ['higgs'],
            'higgs:w_boson': ['higgs'], 'higgs:z_boson': ['higgs'], 'higgs:higgs': ['higgs']
        };
        channels.push(...(bosonChannels[ids] || []));
        explanation = channels.includes('strong') ? 'gluonGluon'
            : ids === 'photon:w_boson' ? 'photonW'
            : ids === 'z_boson:z_boson' ? 'zz'
            : ids === 'higgs:higgs' ? 'higgsHiggs'
            : channels.length ? 'gaugeHiggs' : undefined;
    }
    const treeLevel = channels.length > 0;
    if (!treeLevel) {
        channels.push('loop');
        explanation = a.id === 'photon' && b.id === 'photon' ? 'lightByLight' : 'higherOrder';
    }
    return {
        channels, treeLevel, status: t(treeLevel ? 'model.pair.status.tree' : 'model.pair.status.loop'),
        explanation: t(`model.pair.explanation.${explanation}`), sameFermion: a.id === b.id && fermion(a)
    };
}
// One fixed spatial mode; indices distinguish spin states or photon polarizations.
function addToQuantumState(particleId, counts, state) {
    const particle = PARTICLES.find(p => p.id === particleId);
    if (!particle || ![0, 1].includes(state) || counts.length !== 2) throw new Error('Invalid state');
    const next = [...counts];
    const fermion = ['quark', 'lepton'].includes(particle.family);
    if (fermion && next[state] > 0) return { accepted: false, counts: next };
    next[state] += 1;
    return { accepted: true, counts: next };
}
// Equations and charge lists are language-neutral; label/explanation come from model.processes.<key>.*.
const PROCESSES = {
    beta: { equation: 'n → p + e⁻ + ν̄ₑ', before: [0], after: [1, -1, 0], particles: ['down', 'up', 'w_boson', 'electron', 'e_neutrino'] },
    annihilation: { equation: 'e⁻ + e⁺ → γ + γ', before: [-1, 1], after: [0, 0], particles: ['electron', 'photon'] },
    higgs: { equation: 'H → γ + γ', before: [0], after: [0, 0], particles: ['higgs', 'photon', 'w_boson', 'top'] },
    forbidden: { equation: 'e⁻ → γ + γ', before: [-1], after: [0, 0], particles: ['electron', 'photon'] }
};
for (const [key, process] of Object.entries(PROCESSES)) withText(process, `model.processes.${key}`, ['label', 'explanation']);
function chargeBalance(process) {
    return { before: process.before.reduce((a, b) => a + b, 0), after: process.after.reduce((a, b) => a + b, 0) };
}
// Four qualitative layer responses: tracker, EM calorimeter, hadronic calorimeter, muon chambers.
const DETECTOR_SIGNATURES = {
    electron: { particle: 'electron' },
    photon: { particle: 'photon' },
    muon: { particle: 'muon' },
    hadron: { particle: 'up' },
    neutrino: { particle: 'e_neutrino' }
};
for (const [key, signature] of Object.entries(DETECTOR_SIGNATURES)) {
    withText(signature, `model.detector.${key}`, ['name', 'why', 'catalogLabel']);
    Object.defineProperty(signature, 'layers', { enumerable: true, get: () => [0, 1, 2, 3].map(i => t(`model.detector.${key}.layers.${i}`)) });
}

// ---------- Inside matter: layers, composites, and particle creation ----------
// Charge strings from the catalog ('+2/3', '−1', '0') as integers in units of e/3.
function chargeThirds(charge) {
    const sign = /^[−-]/.test(charge) ? -1 : 1;
    const [numerator, denominator] = charge.replace(/^[+−-]/, '').split('/');
    return sign * Number(numerator) * (denominator ? 3 / Number(denominator) : 3);
}
// Language-neutral display of a charge in units of e, using the catalog's minus sign.
function formatChargeThirds(thirds) {
    if (thirds === 0) return '0';
    const sign = thirds < 0 ? '−' : '+';
    const size = Math.abs(thirds);
    return size % 3 === 0 ? `${sign}${size / 3}` : `${sign}${size}/3`;
}
// Probe resolution: a wavelength comparable to a size needs E ≈ hc/λ (hc ≈ 1239.84 eV·nm).
const HC_EV_METRE = 1239.84e-9;
function probeEnergy(sizeMetres) {
    return HC_EV_METRE / sizeMetres;
}
// Zoom ladder from an atom to the elementary limit; sizes are rounded orders of magnitude.
// Text comes from model.levels.<key>.*.
const COMPOSITION_LEVELS = [
    { key: 'atom', size: 1e-10, particles: ['electron'] },
    { key: 'nucleus', size: 5e-15, particles: ['up', 'down', 'gluon'] },
    { key: 'nucleon', size: 1.7e-15, particles: ['up', 'down', 'gluon'] },
    { key: 'elementary', size: 1e-19, particles: ['up', 'down', 'electron', 'gluon'] }
];
for (const level of COMPOSITION_LEVELS) withText(level, `model.levels.${level.key}`, ['name', 'inside', 'glue', 'breakIt', 'evidence', 'takeaway']);
// Bound systems and hadrons with their valence content. Masses in MeV/c² (PDG 2025 /
// CODATA, rounded; hydrogen is p + e⁻ minus 13.6 eV of binding). 'anti:' marks an antiparticle; parts may be other composites.
// Text (name, lifetime, note) comes from model.composites.<key>.*.
const COMPOSITES = {
    hydrogen: { kind: 'atom', symbol: 'H', mass: 938.7829854, parts: ['proton', 'electron'] },
    helium4: { kind: 'nucleus', symbol: '⁴He²⁺', mass: 3727.379, parts: ['proton', 'proton', 'neutron', 'neutron'] },
    proton: { kind: 'baryon', symbol: 'p', mass: 938.272, parts: ['up', 'up', 'down'] },
    neutron: { kind: 'baryon', symbol: 'n', mass: 939.565, parts: ['up', 'down', 'down'] },
    lambda: { kind: 'baryon', symbol: 'Λ⁰', mass: 1115.683, parts: ['up', 'down', 'strange'] },
    omega: { kind: 'baryon', symbol: 'Ω⁻', mass: 1672.45, parts: ['strange', 'strange', 'strange'] },
    pion: { kind: 'meson', symbol: 'π⁺', mass: 139.570, parts: ['up', 'anti:down'] },
    kaon: { kind: 'meson', symbol: 'K⁺', mass: 493.677, parts: ['up', 'anti:strange'] },
    dmeson: { kind: 'meson', symbol: 'D⁰', mass: 1864.84, parts: ['charm', 'anti:up'] },
    jpsi: { kind: 'meson', symbol: 'J/ψ', mass: 3096.900, parts: ['charm', 'anti:charm'] },
    bmeson: { kind: 'meson', symbol: 'B⁺', mass: 5279.41, parts: ['up', 'anti:bottom'] },
    upsilon: { kind: 'meson', symbol: 'Υ', mass: 9460.40, parts: ['bottom', 'anti:bottom'] }
};
for (const [key, composite] of Object.entries(COMPOSITES)) withText(composite, `model.composites.${key}`, ['name', 'lifetime', 'note']);
// One constituent reference → symbol, mass, and charge (antiparticles flip charge, keep mass).
function resolvePart(ref) {
    const anti = ref.startsWith('anti:');
    const id = anti ? ref.slice(5) : ref;
    if (COMPOSITES[id]) {
        if (anti) throw new Error('Composite antiparticles are not modelled as parts');
        return { id, composite: true, anti, symbol: COMPOSITES[id].symbol, mass: COMPOSITES[id].mass, chargeThirds: compositeSummary(id).chargeThirds };
    }
    const particle = PARTICLES.find(p => p.id === id);
    if (!particle || particle.mass === null) throw new Error(`Unknown constituent ${ref}`);
    return { id, composite: false, anti, symbol: anti ? `${particle.symbol}̄` : particle.symbol, mass: particle.mass, chargeThirds: (anti ? -1 : 1) * chargeThirds(particle.charge) };
}
// Atoms and nuclei weigh less than their parts (binding energy); light hadrons weigh far
// more than their valence-quark rest masses (field and motion energy). Quark masses are
// scheme-dependent running masses, so `partsShare` is a teaching comparison only.
function compositeSummary(key) {
    const composite = COMPOSITES[key];
    if (!composite) throw new Error('Unknown composite');
    const parts = composite.parts.map(resolvePart);
    const partsMass = parts.reduce((sum, part) => sum + part.mass, 0);
    return {
        key, kind: composite.kind, parts, partsMass, mass: composite.mass,
        chargeThirds: parts.reduce((sum, part) => sum + part.chargeThirds, 0),
        massDifference: composite.mass - partsMass,
        partsShare: partsMass / composite.mass,
        bound: ['atom', 'nucleus'].includes(composite.kind)
    };
}
// Creating particles from collision energy. Thresholds are the minimum centre-of-mass
// energy (sum of final rest energies) for the listed reaction; e⁺e⁻ annihilation makes
// all of it available. Rates, widths, and hadron-collider parton fractions are ignored.
// `decays` lists one typical decay per product (null = stable); text in model.production.<key>.*.
const PRODUCTION_CHANNELS = [
    { key: 'electronPair', reaction: 'γ + γ → e⁻ + e⁺', products: ['electron', 'anti:electron'], symbols: ['e⁻', 'e⁺'], decays: [null, null], particles: ['electron', 'photon'] },
    { key: 'muonPair', reaction: 'e⁻ + e⁺ → μ⁻ + μ⁺', products: ['muon', 'anti:muon'], symbols: ['μ⁻', 'μ⁺'], decays: [['e⁻', 'ν̄ₑ', 'νμ'], ['e⁺', 'νₑ', 'ν̄μ']], particles: ['muon'] },
    { key: 'pionPair', reaction: 'e⁻ + e⁺ → π⁻ + π⁺', products: ['pion', 'pion'], symbols: ['π⁻', 'π⁺'], decays: [['μ⁻', 'ν̄μ'], ['μ⁺', 'νμ']], particles: ['up', 'down'], composite: 'pion' },
    { key: 'kaonPair', reaction: 'e⁻ + e⁺ → K⁻ + K⁺', products: ['kaon', 'kaon'], symbols: ['K⁻', 'K⁺'], decays: [['μ⁻', 'ν̄μ'], ['μ⁺', 'νμ']], particles: ['strange'], composite: 'kaon' },
    { key: 'protonPair', reaction: 'e⁻ + e⁺ → p + p̄', products: ['proton', 'proton'], symbols: ['p', 'p̄'], decays: [null, null], particles: ['up', 'down'], composite: 'proton' },
    { key: 'charm', reaction: 'e⁻ + e⁺ → J/ψ (c c̄)', products: ['jpsi'], symbols: ['J/ψ'], decays: [['μ⁻', 'μ⁺']], particles: ['charm'], composite: 'jpsi' },
    { key: 'tauPair', reaction: 'e⁻ + e⁺ → τ⁻ + τ⁺', products: ['tau', 'anti:tau'], symbols: ['τ⁻', 'τ⁺'], decays: [['μ⁻', 'ν̄μ', 'ντ'], ['e⁺', 'νₑ', 'ν̄τ']], particles: ['tau', 'tau_neutrino'] },
    { key: 'bottom', reaction: 'e⁻ + e⁺ → Υ (b b̄)', products: ['upsilon'], symbols: ['Υ'], decays: [['μ⁻', 'μ⁺']], particles: ['bottom'], composite: 'upsilon' },
    { key: 'zBoson', reaction: 'e⁻ + e⁺ → Z⁰', products: ['z_boson'], symbols: ['Z⁰'], decays: [['e⁻', 'e⁺']], particles: ['z_boson'] },
    { key: 'wPair', reaction: 'e⁻ + e⁺ → W⁻ + W⁺', products: ['w_boson', 'w_boson'], symbols: ['W⁻', 'W⁺'], decays: [['e⁻', 'ν̄ₑ'], ['μ⁺', 'νμ']], particles: ['w_boson'] },
    { key: 'higgs', reaction: 'e⁻ + e⁺ → Z⁰ + H', products: ['z_boson', 'higgs'], symbols: ['Z⁰', 'H'], decays: [['μ⁻', 'μ⁺'], ['b', 'b̄']], particles: ['higgs', 'z_boson'] },
    { key: 'topPair', reaction: 'e⁻ + e⁺ → t + t̄', products: ['top', 'anti:top'], symbols: ['t', 't̄'], decays: [['b', 'W⁺'], ['b̄', 'W⁻']], particles: ['top', 'bottom', 'w_boson'] }
];
for (const channel of PRODUCTION_CHANNELS) withText(channel, `model.production.${channel.key}`, ['label', 'first', 'fate']);
function productionThreshold(channel) {
    return channel.products.reduce((sum, ref) => sum + resolvePart(ref).mass, 0);
}
function availableProductions(energyMeV) {
    return PRODUCTION_CHANNELS.filter(channel => productionThreshold(channel) <= energyMeV);
}
// Rounded maximum collision energies (MeV) for the energy slider; labels in model.presets.<key>.
// Hadron colliders share their energy among quarks and gluons, so their values overstate
// what one elementary collision receives.
const COLLIDER_PRESETS = [
    { key: 'radioactivity', energy: 1 },
    { key: 'spear', energy: 8000 },
    { key: 'lep1', energy: 91200 },
    { key: 'lep2', energy: 209000 },
    { key: 'tevatron', energy: 1960000 },
    { key: 'lhc', energy: 13600000 }
];
for (const preset of COLLIDER_PRESETS) withText(preset, `model.presets.${preset.key}`, ['label']);
// Sum of electric charges in one generation: three colors of each quark plus the two leptons.
// It vanishes for every generation (a condition tied to gauge-anomaly cancellation).
function generationChargeThirds(generation) {
    return PARTICLES.filter(p => p.generation === generation && ['quark', 'lepton'].includes(p.family))
        .reduce((sum, p) => sum + (p.family === 'quark' ? 3 : 1) * chargeThirds(p.charge), 0);
}
