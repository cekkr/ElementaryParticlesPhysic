const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { Script } = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'elementaryparticles.html'), 'utf8');
const sections = [...html.matchAll(/<section\b([^>]*)>([\s\S]*?)<\/section>/g)];
const attribute = (attributes, name) => attributes.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

test('every listed topic links to a unique section containing learning material', () => {
  const nav = html.match(/<nav\b[^>]*>([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav, 'section navigation exists');
  const links = [...nav.matchAll(/<a\b([^>]*)>/g)];
  const expected = [
    'introduction', 'scale', 'matter', 'particle-zoo', 'fermions', 'forces',
    'higgs', 'quantum', 'interactions', 'detection', 'mathematics', 'beyond', 'summary',
  ];
  assert.deepEqual(links.map(link => attribute(link[1], 'href')), expected.map(id => `#${id}`));

  const allIds = [...html.matchAll(/\bid="([^"]*)"/g)].map(match => match[1]);
  assert.equal(new Set(allIds).size, allIds.length, 'HTML IDs must be unique');
  assert.equal(sections.length, links.length, 'every content section is listed');
  for (const link of links) {
    assert.ok(attribute(link[1], 'aria-label'), 'each navigation link has an accessible name');
    const id = attribute(link[1], 'href').slice(1);
    const targets = sections.filter(section => attribute(section[1], 'id') === id);
    assert.equal(targets.length, 1, `#${id} must target content, not a navigation control`);
    assert.match(targets[0][2], /<h[12]\b/, `#${id} needs a heading`);
    assert.match(targets[0][2], /<p\b/, `#${id} needs learning material`);
  }
});

test('each detail button controls an existing expandable panel', () => {
  const buttons = [...html.matchAll(/<button\b([^>]*\bclass="expand-btn"[^>]*)>/g)];
  assert.ok(buttons.length > 0);
  for (const button of buttons) {
    assert.equal(attribute(button[1], 'aria-expanded'), 'false');
    const id = attribute(button[1], 'aria-controls');
    assert.ok(id, 'detail buttons must identify their panel');
    assert.match(html, new RegExp(`<div class="expandable" id="${id}" inert>`));
  }
});

test('the standalone page has syntactically valid inline JavaScript', () => {
  const scripts = [...html.matchAll(/<script\b(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)];
  assert.ok(scripts.length > 0);
  for (const script of scripts) {
    assert.doesNotThrow(() => new Script(script[1], { filename: 'elementaryparticles.html' }));
  }
});
