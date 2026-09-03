const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pagePath = path.join(root, 'public', 'puzzlelab', 'index.html');
const homePath = path.join(root, 'public', 'index.html');
const removedPrototypePath = path.join(root, 'public', 'puzzlelab', 'word-search.js');
const html = fs.readFileSync(pagePath, 'utf8');
const home = fs.readFileSync(homePath, 'utf8');
const normalized = html.toLocaleLowerCase();

assert.equal(
  normalized.includes(['wiki', 'pedia'].join('')),
  false,
  'the deployed PuzzleLab page must not reference the retired public evidence provider'
);
assert.doesNotMatch(html, /<script\b/i, 'the static launcher must not execute discovery code');
assert.doesNotMatch(html, /\bfetch\s*\(/i, 'the static launcher must not call a content API');
assert.equal(
  fs.existsSync(removedPrototypePath),
  false,
  'the retired browser-side generator and discovery bundle must stay removed'
);

const absoluteLinks = [...html.matchAll(/href="(https?:\/\/[^\"]+)"/gi)]
  .map(match => match[1]);
assert.deepEqual(
  absoluteLinks,
  ['http://127.0.0.1:5199/'],
  'the only absolute link must open the guarded local PuzzleLab host'
);

for (const engine of [
  'Word Search',
  'Matching',
  'Word Scramble',
  'Scramble + Clues',
  'Fill-In',
  'Cryptogram',
  'Cipher Challenge',
  'Crossword',
  'Coded Words'
]) {
  assert.ok(html.includes(`<strong>${engine}</strong>`), `${engine} must remain visible`);
}

assert.match(html, /public page is the doorway—not the generator/i);
assert.match(html, /no public-web candidate discovery/i);
assert.match(home, /operational local workbench/i);
assert.doesNotMatch(home, /migration preview/i);

console.log('PuzzleLab deployment boundary checks passed.');
