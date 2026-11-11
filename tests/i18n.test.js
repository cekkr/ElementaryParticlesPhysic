const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const { build, loadLocales, validateLocales, DEFAULT_LANGUAGE } = require('../generate.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'elementaryparticles.html'), 'utf8');
const locales = loadLocales();
const languages = Object.keys(locales);

test('elementaryparticles.html is generated from the current src/ files', () => {
  assert.equal(html, build(), 'run `node generate.js` after editing src/');
});

test('every supported language translates every key with the same structure', () => {
  assert.ok(languages.includes('en') && languages.includes('it'));
  assert.doesNotThrow(() => validateLocales(locales));
  const broken = JSON.parse(JSON.stringify(locales));
  delete broken.it['nav.summary'];
  broken.it['page.scale.details.math.text'] = 'senza link';
  assert.throws(() => validateLocales(broken), /missing "nav\.summary"[\s\S]*links differ/);
});

test('literal translation keys used by the scripts exist in the reference language', () => {
  const sources = ['physics-model.js', 'app.js'].map(file => fs.readFileSync(path.join(root, 'src', file), 'utf8')).join('\n');
  const keys = [...sources.matchAll(/'((?:ui|model|page|nav)\.[\w.]+)'/g)].map(match => match[1]);
  assert.ok(keys.length > 20);
  const reference = Object.keys(locales[DEFAULT_LANGUAGE]);
  // A literal is either a full key or a prefix completed by textMap/withText.
  for (const key of keys) assert.ok(reference.some(k => k === key || k.startsWith(`${key}.`)), key);
});

test('static markup is annotated so runtime language switching reaches it', () => {
  const markup = html.split('<body>')[1].split('<script id="physics-model">')[0];
  for (const [, key] of markup.matchAll(/data-i18n="([^"]+)"/g)) assert.ok(key in locales.en, key);
  for (const [, pairs] of markup.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    for (const pair of pairs.split(';')) assert.ok(pair.split(':')[1] in locales.en, pair);
  }
  assert.doesNotMatch(html, /\{\{/);
  for (const language of languages) assert.match(markup, new RegExp(`<option value="${language}" lang="${language}">`));
});

test('the pure model reports text in the active language and falls back to English', () => {
  const source = html.match(/<script id="physics-model">([\s\S]*?)<\/script>/)[1];
  const context = vm.createContext({});
  vm.runInContext(`${source}\nthis.model = { PARTICLES, PROCESSES, DETECTOR_SIGNATURES, INTERACTION_NAMES, pairInteraction, setModelLanguage, t };`, context);
  const { PARTICLES, PROCESSES, DETECTOR_SIGNATURES, INTERACTION_NAMES, pairInteraction, setModelLanguage, t } = context.model;
  for (const language of languages) {
    assert.equal(setModelLanguage(language), language);
    const texts = [
      ...PARTICLES.flatMap(p => [p.name, p.massLabel, p.example, p.massNote]),
      ...Object.values(PROCESSES).flatMap(p => [p.label, p.explanation]),
      ...Object.values(DETECTOR_SIGNATURES).flatMap(s => [s.name, s.why, s.catalogLabel, ...s.layers]),
      ...Object.values(INTERACTION_NAMES),
      ...PARTICLES.flatMap(a => PARTICLES.map(b => pairInteraction(a.id, b.id))).flatMap(pair => [pair.status, pair.explanation])
    ];
    for (const text of texts) assert.doesNotMatch(text, /^(model|ui)\./, `${language}: untranslated ${text}`);
  }
  setModelLanguage('it');
  assert.equal(PARTICLES.find(p => p.id === 'electron').name, 'Elettrone');
  assert.match(pairInteraction('photon', 'photon').status, /ordine superiore/);
  assert.equal(t('ui.catalog.count', { shown: 3, total: 17 }), '3 di 17 voci di particelle mostrate.');
  assert.equal(setModelLanguage('xx'), 'en', 'unknown languages fall back to English');
  assert.equal(PARTICLES.find(p => p.id === 'electron').name, 'Electron');
});
