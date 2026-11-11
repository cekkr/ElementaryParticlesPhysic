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
// Text fields (name, massLabel, example, massNote, discovery) come from model.particles.<id>.*.
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
].map(p => withText(p, `model.particles.${p.id}`, ['name', 'massLabel', 'example', 'massNote', 'discovery']));
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
