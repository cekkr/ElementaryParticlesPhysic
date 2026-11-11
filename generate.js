#!/usr/bin/env node
// Builds the self-contained, multilingual elementaryparticles.html from src/.
//
//   node generate.js           write elementaryparticles.html
//   node generate.js --check   exit 1 if elementaryparticles.html is out of date
//
// Inputs:
//   src/template.html    page structure with {{key}} placeholders and include directives
//   src/styles.css       inlined into <style>
//   src/physics-model.js inlined into <script id="physics-model">, receives every locale
//   src/app.js           inlined into the browser behavior <script>
//   src/i18n/*.json      one file per language; en.json is the reference and default
//
// The output contains English text in the static markup (readable without JavaScript)
// plus every locale as data, so the page can switch language at runtime.
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const LOCALE_DIR = path.join(SRC, 'i18n');
const OUTPUT = path.join(ROOT, 'elementaryparticles.html');
const DEFAULT_LANGUAGE = 'en';
const KEY = '[A-Za-z0-9_.]+';

// Nested locale JSON → { 'page.scale.title': '...' }. Arrays become numeric path segments.
function flatten(value, prefix = '', out = {}) {
    if (typeof value === 'string') {
        out[prefix] = value;
    } else if (value && typeof value === 'object') {
        for (const [key, child] of Object.entries(value)) {
            flatten(child, prefix ? `${prefix}.${key}` : key, out);
        }
    } else {
        throw new Error(`Translation "${prefix}" must be a string, object, or array`);
    }
    return out;
}

// Returns { en: {...}, it: {...} } with the default language first.
function loadLocales(directory = LOCALE_DIR) {
    const files = fs.readdirSync(directory).filter(file => file.endsWith('.json')).sort();
    const languages = files.map(file => path.basename(file, '.json'))
        .sort((a, b) => (a === DEFAULT_LANGUAGE ? -1 : b === DEFAULT_LANGUAGE ? 1 : a.localeCompare(b)));
    if (!languages.includes(DEFAULT_LANGUAGE)) throw new Error(`Missing ${DEFAULT_LANGUAGE}.json in ${directory}`);
    const locales = {};
    for (const language of languages) {
        const file = path.join(directory, `${language}.json`);
        try {
            locales[language] = flatten(JSON.parse(fs.readFileSync(file, 'utf8')));
        } catch (error) {
            throw new Error(`${path.relative(ROOT, file)}: ${error.message}`);
        }
    }
    return locales;
}

// Structural parts of a translation that must not change between languages.
const sorted = values => [...values].sort().join(' | ');
function structure(text) {
    return {
        variables: sorted([...text.matchAll(/\{(\w+)\}/g)].map(m => m[1])),
        links: sorted([...text.matchAll(/\b(href|data-particle)="([^"]*)"/g)].map(m => `${m[1]}=${m[2]}`)),
        tags: sorted([...text.matchAll(/<\/?([a-zA-Z][\w-]*)/g)].map(m => m[0]))
    };
}

// Every language must have exactly the English keys, non-empty values, and the same
// placeholders, link targets, and HTML tags as English.
function validateLocales(locales) {
    const reference = locales[DEFAULT_LANGUAGE];
    const errors = [];
    for (const [language, table] of Object.entries(locales)) {
        for (const key of Object.keys(reference)) {
            if (!(key in table)) { errors.push(`${language}: missing "${key}"`); continue; }
            if (!table[key].trim()) errors.push(`${language}: empty "${key}"`);
            if (language === DEFAULT_LANGUAGE) continue;
            const expected = structure(reference[key]);
            const actual = structure(table[key]);
            for (const part of Object.keys(expected)) {
                if (expected[part] !== actual[part]) {
                    errors.push(`${language}: "${key}" ${part} differ from ${DEFAULT_LANGUAGE} (expected "${expected[part]}", found "${actual[part]}")`);
                }
            }
        }
        for (const key of Object.keys(table)) {
            if (!(key in reference)) errors.push(`${language}: "${key}" is not in ${DEFAULT_LANGUAGE}.json`);
        }
        if (!table['meta.languageName']) errors.push(`${language}: meta.languageName is required`);
    }
    if (errors.length) throw new Error(`Translation errors:\n  ${errors.join('\n  ')}`);
}

const escapeAttribute = text => text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// Translations are HTML fragments; only escape ampersands that do not start an entity.
const contentHtml = html => html.replace(/&(?!#?\w+;)/g, '&amp;');
const indent = (text, spaces) => text.replace(/\n$/, '').split('\n').map(line => (line ? ' '.repeat(spaces) + line : line)).join('\n');
const readSource = file => fs.readFileSync(path.join(SRC, file), 'utf8');

function translateTemplate(template, locales) {
    const english = locales[DEFAULT_LANGUAGE];
    const lookup = key => {
        if (!(key in english)) throw new Error(`src/template.html uses unknown key "${key}"`);
        return english[key];
    };
    let html = template.replace(/<!---[\s\S]*?--->\n?/g, '');
    // 1. <tag ...>{{key}}</tag> → content plus data-i18n.
    html = html.replace(new RegExp(`<([a-zA-Z][\\w-]*)((?:[^<>"]|"[^"]*")*)>\\{\\{(${KEY})\\}\\}</\\1>`, 'g'),
        (match, tag, attributes, key) => `<${tag}${attributes} data-i18n="${key}">${contentHtml(lookup(key))}</${tag}>`);
    // 2. attribute="{{key}}" → plain text plus data-i18n-attr="attribute:key;...".
    html = html.replace(/<([a-zA-Z][\w-]*)((?:[^<>"]|"[^"]*")*)>/g, (match, tag, attributes) => {
        if (!attributes.includes('{{')) return match;
        const pairs = [];
        const rewritten = attributes.replace(new RegExp(`([\\w:-]+)="\\{\\{(${KEY})\\}\\}"`, 'g'), (whole, attribute, key) => {
            pairs.push(`${attribute}:${key}`);
            return `${attribute}="${escapeAttribute(lookup(key))}"`;
        });
        return `<${tag}${rewritten} data-i18n-attr="${pairs.join(';')}">`;
    });
    const leftover = html.match(/.{0,60}\{\{.{0,60}/);
    if (leftover) throw new Error(`Unsupported placeholder position in src/template.html (a placeholder must be an element's only content or a whole attribute value): ${leftover[0].trim()}`);
    return html;
}

function build() {
    const locales = loadLocales();
    validateLocales(locales);
    let html = translateTemplate(readSource('template.html'), locales);

    const languageOptions = Object.entries(locales)
        .map(([language, table]) => `<option value="${language}" lang="${language}">${escapeAttribute(table['meta.languageName'])}</option>`).join('');
    html = html.replace('<!-- @languages -->', () => languageOptions);

    // Escape "<" so translations can never close the surrounding <script>.
    const i18nJson = JSON.stringify(locales, null, 4).replace(/</g, '\\u003c');
    const sources = { 'physics-model.js': readSource('physics-model.js').replace('/* @inject:i18n */ { en: {} }', () => i18nJson) };
    if (!sources['physics-model.js'].includes('"meta.languageName"')) throw new Error('src/physics-model.js lost its I18N injection marker');

    html = html.replace(/^<!-- @include:([\w.-]+) -->$/gm, (match, file) => indent(sources[file] ?? readSource(file), 8));
    if (/@include:|@languages/.test(html)) throw new Error('Unresolved directive in src/template.html');

    return html.replace('<!DOCTYPE html>\n', '<!DOCTYPE html>\n<!-- Generated by generate.js from src/. Do not edit this file; edit src/ and run `node generate.js`. -->\n');
}

if (require.main === module) {
    try {
        const html = build();
        if (process.argv.includes('--check')) {
            const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, 'utf8') : '';
            if (current !== html) {
                console.error('elementaryparticles.html is out of date. Run `node generate.js`.');
                process.exitCode = 1;
            } else {
                console.log('elementaryparticles.html is up to date.');
            }
        } else {
            fs.writeFileSync(OUTPUT, html);
            console.log(`Wrote ${path.relative(process.cwd(), OUTPUT) || OUTPUT} (${Object.keys(loadLocales()).join(', ')}).`);
        }
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    }
}

module.exports = { build, flatten, loadLocales, validateLocales, translateTemplate, DEFAULT_LANGUAGE };
