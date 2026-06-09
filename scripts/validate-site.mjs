#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

const checks = [];

function assert(condition, message) {
  checks.push({ ok: Boolean(condition), message });
}

const pkg = JSON.parse(read('package.json'));
const indexHtml = read('index.html');
const app = read('src/App.jsx');
const registry = read('src/engine/GameRegistry.js');
const readme = exists('README.md') ? read('README.md') : '';

assert(pkg.scripts?.build === 'vite build', 'build script exists');
assert(pkg.scripts?.test && !pkg.scripts.test.includes('no test specified'), 'truthful test script configured');
assert(indexHtml.includes('PalabraCade'), 'index title/branding present');
assert(readme.includes('PalabraCade'), 'README documents the project');
assert(readme.includes('npm run dev') && readme.includes('npm run build'), 'README includes local run instructions');
assert(app.includes('/games/conjugation-castle'), 'Conjugation Castle route registered');
assert(app.includes('/games/radar-relay'), 'Radar Relay route registered');
assert(app.includes('/games/phrase-forge'), 'Phrase Forge route registered');
assert(registry.includes('castleMeta') && registry.includes('radarMeta') && registry.includes('phraseMeta'), 'game registry includes new games');
assert(exists('src/games/conjugation-castle/ConjugationCastle.jsx'), 'Conjugation Castle game file exists');
assert(exists('src/games/radar-relay/RadarRelay.jsx'), 'Radar Relay game file exists');
assert(exists('src/games/phrase-forge/PhraseForge.jsx'), 'Phrase Forge game file exists');

const failed = checks.filter(check => !check.ok);

for (const check of checks) {
  console.log(`${check.ok ? 'PASS' : 'FAIL'}: ${check.message}`);
}

if (failed.length > 0) {
  console.error(`\n${failed.length} validation checks failed.`);
  process.exit(1);
}

console.log(`\n${checks.length} checks passed.`);
