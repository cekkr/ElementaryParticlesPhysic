const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'elementaryparticles.html'), 'utf8');
const modelSource = html.match(/<script id="physics-model">([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({});
vm.runInContext(`${modelSource}\nthis.model = { PARTICLES, selectParticles, massRatio, pairInteraction, PAIR_CHANNELS, addToQuantumState, PROCESSES, chargeBalance, DETECTOR_SIGNATURES, HISTORY_ANCHORS, DISCOVERY_TIMELINE, I18N, chargeThirds, formatChargeThirds, probeEnergy, COMPOSITION_LEVELS, COMPOSITES, compositeSummary, PRODUCTION_CHANNELS, productionThreshold, availableProductions, COLLIDER_PRESETS, generationChargeThirds };`, context);
const { PARTICLES, selectParticles, massRatio, pairInteraction, PAIR_CHANNELS, addToQuantumState, PROCESSES, chargeBalance, DETECTOR_SIGNATURES, HISTORY_ANCHORS, DISCOVERY_TIMELINE, I18N, chargeThirds, formatChargeThirds, probeEnergy, COMPOSITION_LEVELS, COMPOSITES, compositeSummary, PRODUCTION_CHANNELS, productionThreshold, availableProductions, COLLIDER_PRESETS, generationChargeThirds } = context.model;
const particle = id => PARTICLES.find(p => p.id === id);

test('catalog distinguishes matter, carriers, and the scalar Higgs', () => {
  assert.equal(new Set(PARTICLES.map(p => p.id)).size, 17);
  for (const p of PARTICLES) {
    assert.equal(p.spin, ['quark', 'lepton'].includes(p.family) ? '1/2' : p.id === 'higgs' ? '0' : '1');
    assert.ok(p.example && p.massNote && p.interactions.length);
    assert.ok(p.role && p.origin && p.fate, `${p.id} explains its role, origin, and fate`);
  }
  assert.equal(particle('higgs').family, 'scalar');
  assert.equal(particle('electron').charge, '−1');
  assert.equal(particle('photon').mass, 0);
  assert.equal(particle('gluon').mass, 0);
  assert.equal(particle('w_boson').mass > particle('tau').mass, true);
});

test('neutrino flavor mass is unknown rather than a measured zero', () => {
  for (const id of ['e_neutrino', 'mu_neutrino', 'tau_neutrino']) {
    assert.equal(particle(id).mass, null);
    assert.match(particle(id).massLabel, /Flavor mixture/);
  }
  assert.equal(massRatio(particle('electron'), particle('photon')), null);
  assert.equal(massRatio(particle('electron'), particle('e_neutrino')), null);
  assert.equal(massRatio(particle('photon'), particle('electron')), 0);
  assert.ok(Math.abs(massRatio(particle('muon'), particle('electron')) - 207) < 1);
});

test('combined filters respect color, electric charge, family, and search', () => {
  const strong = selectParticles({ interaction: 'strong' });
  assert.equal(strong.length, 7);
  assert.ok(strong.every(p => p.family === 'quark' || p.id === 'gluon'));
  const emLeptons = selectParticles({ family: 'lepton', interaction: 'em' });
  assert.equal(emLeptons.length, 3);
  assert.ok(emLeptons.every(p => p.charge === '−1'));
  assert.equal(selectParticles({ query: '  PHOTON  ' })[0].id, 'photon');
  assert.equal(selectParticles({ family: 'quark', interaction: 'higgs' }).length, 0);
  assert.equal(selectParticles({ query: 'no-such-particle' }).length, 0);
});

test('mass sorting handles mixed units and puts unknown neutrino flavors last', () => {
  const ordered = selectParticles({ sort: 'mass' });
  const known = ordered.filter(p => p.mass !== null);
  assert.ok(ordered.slice(-3).every(p => p.mass === null));
  assert.ok(known.every((p, i) => i === 0 || p.mass >= known[i - 1].mass));
  assert.equal(known.at(-1).id, 'top');
  assert.equal(PARTICLES[0].id, 'up', 'sorting must not mutate the canonical catalog');
});

test('pair matrix covers both ordered axes consistently, including self-pairs', () => {
  for (const a of PARTICLES) {
    for (const b of PARTICLES) {
      const pair = pairInteraction(a.id, b.id);
      const reverse = pairInteraction(b.id, a.id);
      assert.ok(pair.explanation && pair.channels.length);
      assert.ok(pair.channels.every(channel => PAIR_CHANNELS[channel]));
      assert.equal(new Set(pair.channels).size, pair.channels.length);
      assert.equal(pair.channels.join(','), reverse.channels.join(','), `${a.id} × ${b.id} must be symmetric`);
      assert.equal(pair.treeLevel, reverse.treeLevel);
      assert.equal(pair.treeLevel, !pair.channels.includes('loop'));
      assert.equal(pair.sameFermion, a.id === b.id && ['quark', 'lepton'].includes(a.family));
    }
  }
  assert.throws(() => pairInteraction('unknown', 'electron'), /Unknown particle pair/);
});

test('pair routes distinguish charge, color, weak currents, and Higgs vertices', () => {
  const channels = (a, b) => pairInteraction(a, b).channels.join(',');
  assert.equal(channels('electron', 'photon'), 'em', 'Compton scattering needs no photon charge');
  assert.equal(channels('up', 'gluon'), 'strong');
  assert.equal(channels('gluon', 'gluon'), 'strong', 'gluon self-couplings are tree-level');
  assert.equal(channels('e_neutrino', 'mu_neutrino'), 'weak');
  assert.equal(channels('electron', 'e_neutrino'), 'weak', 'neutral does not mean non-interacting');
  assert.equal(channels('electron', 'electron'), 'em,weak,higgs');
  assert.equal(channels('higgs', 'electron'), 'higgs');
  assert.equal(channels('higgs', 'higgs'), 'higgs');
  assert.equal(channels('z_boson', 'z_boson'), 'higgs', 'no three-Z or four-Z gauge vertex');
  assert.equal(channels('w_boson', 'photon'), 'em');
  assert.equal(channels('w_boson', 'z_boson'), 'weak,higgs');
});

test('no tree-level route does not label higher-order scattering impossible', () => {
  for (const [a, b] of [['photon', 'photon'], ['photon', 'higgs'], ['gluon', 'higgs'], ['electron', 'gluon'], ['e_neutrino', 'photon'], ['e_neutrino', 'higgs']]) {
    const pair = pairInteraction(a, b);
    assert.equal(pair.treeLevel, false);
    assert.equal(pair.channels.join(','), 'loop');
    assert.match(pair.status, /higher order/);
    assert.doesNotMatch(pair.status, /impossible|forbidden/i);
  }
  assert.match(pairInteraction('photon', 'photon').explanation, /charged-particle loops/);
});

test('Pauli exclusion checks the complete state and leaves rejected counts unchanged', () => {
  const empty = [0, 0];
  const first = addToQuantumState('electron', empty, 0);
  assert.equal(first.accepted, true);
  assert.equal(empty[0], 0, 'input must not be mutated');
  const rejected = addToQuantumState('electron', first.counts, 0);
  assert.equal(rejected.accepted, false);
  assert.equal(rejected.counts[0], 1);
  const opposite = addToQuantumState('electron', first.counts, 1);
  assert.equal(opposite.accepted, true);
  assert.equal(opposite.counts[1], 1);
  let bosons = [0, 0];
  for (let i = 0; i < 5; i++) bosons = addToQuantumState('photon', bosons, 0).counts;
  assert.equal(bosons[0], 5);
  assert.equal(addToQuantumState('e_neutrino', [1, 0], 0).accepted, false);
});

test('reaction charge checks distinguish an allowed example from a forbidden one', () => {
  for (const key of ['beta', 'annihilation', 'higgs']) {
    const charge = chargeBalance(PROCESSES[key]);
    assert.equal(charge.before, charge.after);
  }
  const charge = chargeBalance(PROCESSES.forbidden);
  assert.notEqual(charge.before, charge.after);
  for (const process of Object.values(PROCESSES)) {
    assert.ok(process.particles.every(id => particle(id)), 'process links must reference catalog entries');
  }
});

test('detector signatures distinguish a photon shower, electron track, and missing signal', () => {
  assert.notEqual(DETECTOR_SIGNATURES.electron.layers[0], DETECTOR_SIGNATURES.photon.layers[0]);
  assert.equal(DETECTOR_SIGNATURES.muon.layers[3], 'Muon track');
  assert.equal(DETECTOR_SIGNATURES.neutrino.layers[1], 'No deposit');
  for (const signature of Object.values(DETECTOR_SIGNATURES)) {
    assert.equal(signature.layers.length, 4);
    assert.ok(particle(signature.particle));
  }
});

test('cross-topic links resolve to real anchors and particle catalog entries', () => {
  const markup = html.split('<body>')[1].split('<script id="physics-model">')[0];
  const ids = new Set([...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  for (const [, fragment] of markup.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(fragment), fragment);
  for (const [, id] of markup.matchAll(/data-particle="([^"]+)"/g)) assert.ok(particle(id), id);
});

test('history steps are distributed in reading order and every history link has a target', () => {
  const markup = html.split('<body>')[1].split('<script id="physics-model">')[0];
  const ids = new Set([...markup.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  // Steps follow the page: their numbers increase from the first section to the summary.
  const steps = [...markup.matchAll(/<article class="concept-card history-step" id="([^"]+)"/g)].map(match => match[1]);
  assert.equal(steps.length, 18);
  assert.equal(steps[0], 'history-intro');
  assert.equal(steps.at(-1), 'history-chain');
  const sectionOf = id => markup.slice(0, markup.indexOf(`id="${id}"`)).match(/<section id="([^"]+)"/g).at(-1);
  assert.ok(new Set(steps.map(sectionOf)).size >= 10, 'history is spread through the sections');
  // Locale fragments are inserted at runtime, so check their links against the static ids too.
  for (const table of Object.values(I18N)) {
    for (const text of Object.values(table)) {
      for (const [, fragment] of text.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(fragment), fragment);
      for (const [, id] of text.matchAll(/data-particle="([^"]+)"/g)) assert.ok(particle(id), id);
    }
  }
  for (const p of PARTICLES) {
    assert.match(p.discovered, /^\d{4}(–\d{4})?$/, p.id);
    assert.ok(p.discovery, p.id);
    assert.ok(ids.has(HISTORY_ANCHORS.particles[p.id]), p.id);
  }
  for (const anchor of [...Object.values(HISTORY_ANCHORS.families), ...Object.values(HISTORY_ANCHORS.topics)]) assert.ok(ids.has(anchor), anchor);
  for (const entry of DISCOVERY_TIMELINE) {
    assert.ok(entry.id ? particle(entry.id) : ids.has(entry.anchor), JSON.stringify(entry));
    if (entry.predicted) assert.ok(entry.predicted < entry.observed);
  }
  assert.equal(DISCOVERY_TIMELINE.find(entry => entry.id === 'higgs').observed - 1964, 48);
});

test('composites add valence charges exactly and contrast binding with field energy', () => {
  assert.equal(chargeThirds('+2/3'), 2);
  assert.equal(chargeThirds('−1/3'), -1);
  assert.equal(chargeThirds('−1'), -3);
  assert.equal(chargeThirds('0'), 0);
  const charges = { hydrogen: '0', helium4: '+2', proton: '+1', neutron: '0', lambda: '0', omega: '−1', pion: '+1', kaon: '+1', dmeson: '0', jpsi: '0', bmeson: '+1', upsilon: '0' };
  assert.deepEqual(Object.keys(COMPOSITES).sort(), Object.keys(charges).sort());
  for (const [key, charge] of Object.entries(charges)) {
    const summary = compositeSummary(key);
    assert.equal(formatChargeThirds(summary.chargeThirds), charge, key);
    assert.ok(COMPOSITES[key].name && COMPOSITES[key].lifetime && COMPOSITES[key].note, key);
    // Atoms and nuclei weigh less than their parts; hadrons weigh more than their valence quarks.
    if (summary.bound) assert.ok(summary.massDifference < 0, `${key} is bound`);
    else assert.ok(summary.massDifference > 0, `${key} has field energy`);
    for (const part of summary.parts) if (!part.composite) assert.ok(particle(part.id), part.id);
  }
  assert.ok(Math.abs(compositeSummary('hydrogen').massDifference + 13.6e-6) < 1e-9, 'hydrogen binding is 13.6 eV');
  assert.ok(Math.abs(compositeSummary('helium4').massDifference + 28.3) < 0.1, 'helium-4 binding is about 28.3 MeV');
  assert.ok(compositeSummary('proton').partsShare < 0.02, 'valence quarks are about 1% of the proton mass');
  assert.ok(compositeSummary('upsilon').partsShare > 0.8, 'heavy quarks dominate the Upsilon mass');
  assert.equal(compositeSummary('pion').parts[1].symbol, 'd\u0304');
  assert.throws(() => compositeSummary('nothing'), /Unknown composite/);
});

test('creation thresholds are rest-energy sums and match the historical energy frontier', () => {
  const threshold = key => productionThreshold(PRODUCTION_CHANNELS.find(c => c.key === key));
  assert.ok(Math.abs(threshold('electronPair') - 1.022) < 0.001);
  assert.ok(Math.abs(threshold('muonPair') - 211.3) < 0.1);
  assert.equal(threshold('charm'), COMPOSITES.jpsi.mass);
  assert.equal(threshold('topPair'), 2 * particle('top').mass);
  const thresholds = PRODUCTION_CHANNELS.map(productionThreshold);
  assert.ok(thresholds.every((value, i) => i === 0 || value > thresholds[i - 1]), 'recipes are listed by threshold');
  const lep2 = COLLIDER_PRESETS.find(p => p.key === 'lep2').energy;
  const atLep2 = availableProductions(lep2).map(c => c.key);
  assert.ok(atLep2.includes('wPair'), 'LEP2 made W pairs');
  assert.ok(!atLep2.includes('higgs') && !atLep2.includes('topPair'), 'LEP2 was below Z + H and top pairs');
  assert.equal(availableProductions(0.5).length, 0);
  assert.equal(availableProductions(COLLIDER_PRESETS.at(-1).energy).length, PRODUCTION_CHANNELS.length);
  for (const channel of PRODUCTION_CHANNELS) {
    assert.equal(channel.symbols.length, channel.decays.length, channel.key);
    assert.ok(channel.particles.every(id => particle(id)), channel.key);
    assert.ok(!channel.composite || COMPOSITES[channel.composite], channel.key);
    assert.ok(channel.label && channel.first && channel.fate, channel.key);
  }
});

test('zoom ladder probes smaller layers with more energy; generations are charge-neutral', () => {
  assert.equal(COMPOSITION_LEVELS.map(level => level.key).join(','), 'atom,nucleus,nucleon,elementary');
  const energies = COMPOSITION_LEVELS.map(level => probeEnergy(level.size));
  assert.ok(energies.every((value, i) => i === 0 || value > energies[i - 1]));
  assert.ok(Math.abs(probeEnergy(1e-10) - 12398.4) < 1, 'an atom-sized wavelength is an X-ray of about 12.4 keV');
  for (const level of COMPOSITION_LEVELS) {
    assert.ok(level.name && level.inside && level.glue && level.breakIt && level.evidence && level.takeaway, level.key);
    assert.ok(level.particles.every(id => particle(id)), level.key);
  }
  for (const generation of [1, 2, 3]) assert.equal(generationChargeThirds(generation), 0, `generation ${generation}`);
});
