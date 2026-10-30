const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'elementaryparticles.html'), 'utf8');
const modelSource = html.match(/<script id="physics-model">([\s\S]*?)<\/script>/)[1];
const context = vm.createContext({});
vm.runInContext(`${modelSource}\nthis.model = { PARTICLES, selectParticles, massRatio, addToQuantumState, PROCESSES, chargeBalance, DETECTOR_SIGNATURES };`, context);
const { PARTICLES, selectParticles, massRatio, addToQuantumState, PROCESSES, chargeBalance, DETECTOR_SIGNATURES } = context.model;
const particle = id => PARTICLES.find(p => p.id === id);

test('catalog distinguishes matter, carriers, and the scalar Higgs', () => {
  assert.equal(new Set(PARTICLES.map(p => p.id)).size, 17);
  for (const p of PARTICLES) {
    assert.equal(p.spin, ['quark', 'lepton'].includes(p.family) ? '1/2' : p.id === 'higgs' ? '0' : '1');
    assert.ok(p.example && p.massNote && p.interactions.length);
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
