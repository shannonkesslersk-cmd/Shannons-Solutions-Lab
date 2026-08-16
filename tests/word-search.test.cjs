const assert = require('node:assert/strict');
const engine = require('../public/puzzlelab/word-search.js');

const words = [
  'Hill', 'Skiing', 'Summit', 'Bedrock', 'Erosion',
  'Hawaii', 'Mining', 'Plateau', 'Himalayas', 'Weathering',
  'Sea level', 'Volcanism', 'Mass wasting', 'Mauna Kea', 'Mount Everest',
  'Mountain', 'Olympus Mons', 'Rock Climbing', 'Appalachian', 'Atlas Mountains'
];

const first = engine.generateWordSearch({
  words,
  gridSize: 20,
  difficulty: 'Medium',
  seed: 'mountains-medium-1'
});
const second = engine.generateWordSearch({
  words,
  gridSize: 20,
  difficulty: 'Medium',
  seed: 'mountains-medium-1'
});

assert.deepEqual(first.grid, second.grid, 'same seed must reproduce the same grid');
assert.equal(first.placements.length, 20, 'all selected words must be placed');
assert.equal(first.failedWords.length, 0, 'the fixture must not lose a selected word');
assert.equal(first.grid.length, 20);
assert.ok(first.grid.every(row => row.length === 20 && row.every(letter => /^[A-Z]$/.test(letter))));

for (const placement of first.placements) {
  const letters = [];
  for (let offset = 0; offset < placement.word.length; offset += 1) {
    letters.push(first.grid[
      placement.startRow + offset * placement.rowStep
    ][
      placement.startCol + offset * placement.colStep
    ]);
  }
  assert.equal(letters.join(''), placement.word, `${placement.word} must read correctly in the grid`);

  const coordinates = engine.placementCoordinates(placement);
  assert.ok(coordinates.startX >= 1 && coordinates.startX <= 20);
  assert.ok(coordinates.startY >= 1 && coordinates.startY <= 20);
  assert.ok(coordinates.endX >= 1 && coordinates.endX <= 20);
  assert.ok(coordinates.endY >= 1 && coordinates.endY <= 20);
}

const easy = engine.generateWordSearch({
  words: words.slice(0, 8),
  gridSize: 20,
  difficulty: 'Super Easy',
  seed: 'very-easy-directions'
});
assert.ok(easy.placements.every(placement =>
  (placement.rowStep === 0 && placement.colStep === 1) ||
  (placement.rowStep === 1 && placement.colStep === 0)),
'Super Easy must use only east and south placements');

assert.equal(engine.cleanWord('Mount Everest!'), 'MOUNTEVEREST');
assert.throws(() => engine.generateWordSearch({ words: ['Mountain', 'MOUNTAIN'] }), /duplicates/i);
assert.throws(() => engine.generateWordSearch({ words: ['A word that is far too long'] }), /longer than 15/i);

console.log('Word Search contract checks passed.');
