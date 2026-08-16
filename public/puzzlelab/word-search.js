(function attachWordSearchEngine(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.PuzzleLabWordSearch = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function createWordSearchEngine() {
  'use strict';

  const MAX_WORD_LENGTH = 15;
  const MAX_PLACEMENT_ATTEMPTS = 500;
  const DEFAULT_GRID_SIZE = 20;

  const directions = [
    { name: 'East', rowStep: 0, colStep: 1 },
    { name: 'West', rowStep: 0, colStep: -1 },
    { name: 'South', rowStep: 1, colStep: 0 },
    { name: 'North', rowStep: -1, colStep: 0 },
    { name: 'SouthEast', rowStep: 1, colStep: 1 },
    { name: 'SouthWest', rowStep: 1, colStep: -1 },
    { name: 'NorthEast', rowStep: -1, colStep: 1 },
    { name: 'NorthWest', rowStep: -1, colStep: -1 }
  ];

  const directionRecipes = {
    'Very Easy': [0, 2],
    Easy: [0, 0, 0, 0, 2, 2, 2, 2, 4, 6],
    Medium: [0, 0, 0, 2, 2, 2, 4, 4, 6, 6, 1, 1, 3, 5, 7, 7],
    Hard: [0, 1, 2, 3, 4, 5, 6, 7],
    Expert: [0, 1, 2, 3, 4, 5, 6, 7]
  };

  const overlapWeights = {
    'Very Easy': .25,
    Easy: 1,
    Medium: 4,
    Hard: 8,
    Expert: 12
  };

  function cleanWord(value) {
    return String(value ?? '').trim().toUpperCase().replace(/[^A-Z]/g, '');
  }

  function normalizeDifficulty(value) {
    const normalized = String(value ?? '').trim().toLocaleLowerCase();
    if (normalized === 'super easy' || normalized === 'very easy' || normalized === 'beginner') return 'Very Easy';
    if (normalized === 'easy') return 'Easy';
    if (normalized === 'hard') return 'Hard';
    if (normalized === 'expert' || normalized === 'advanced' || normalized === 'challenge') return 'Expert';
    return 'Medium';
  }

  function hashSeed(value) {
    let hash = 2166136261;
    for (const character of String(value ?? '')) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0 || 0x6d2b79f5;
  }

  function createRandom(seed) {
    let state = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
    return function random() {
      state += 0x6d2b79f5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function randomIndex(length, random) {
    return Math.floor(random() * length);
  }

  function shuffle(values, random) {
    for (let index = values.length - 1; index > 0; index -= 1) {
      const replacement = randomIndex(index + 1, random);
      [values[index], values[replacement]] = [values[replacement], values[index]];
    }
    return values;
  }

  function makeGrid(size) {
    return Array.from({ length: size }, () => Array(size).fill(''));
  }

  function inspectPlacement(grid, word, startRow, startCol, rowStep, colStep) {
    let overlapCount = 0;
    for (let offset = 0; offset < word.length; offset += 1) {
      const row = startRow + offset * rowStep;
      const col = startCol + offset * colStep;
      if (row < 0 || row >= grid.length || col < 0 || col >= grid.length) return null;
      const current = grid[row][col];
      if (current && current !== word[offset]) return null;
      if (current === word[offset]) overlapCount += 1;
    }
    return overlapCount === word.length ? null : overlapCount;
  }

  function placeWord(grid, placement) {
    for (let offset = 0; offset < placement.word.length; offset += 1) {
      const row = placement.startRow + offset * placement.rowStep;
      const col = placement.startCol + offset * placement.colStep;
      grid[row][col] = placement.word[offset];
    }
  }

  function tryPlaceWord(grid, word, difficulty, random) {
    const recipe = directionRecipes[difficulty];
    const weight = overlapWeights[difficulty];
    let best = null;

    for (let attempt = 0; attempt < MAX_PLACEMENT_ATTEMPTS; attempt += 1) {
      const direction = directions[recipe[randomIndex(recipe.length, random)]];
      const startRow = randomIndex(grid.length, random);
      const startCol = randomIndex(grid.length, random);
      const overlapCount = inspectPlacement(
        grid, word, startRow, startCol, direction.rowStep, direction.colStep);
      if (overlapCount === null) continue;

      const candidate = {
        word,
        startRow,
        startCol,
        rowStep: direction.rowStep,
        colStep: direction.colStep,
        direction: direction.name,
        overlapCount,
        score: overlapCount * weight + random()
      };
      if (!best || candidate.score > best.score) best = candidate;
    }

    if (best) placeWord(grid, best);
    return best;
  }

  function validateWords(values, gridSize) {
    const seen = new Set();
    return values.map(value => {
      const word = cleanWord(value);
      if (word.length < 2) throw new Error(`\"${value}\" needs at least two letters.`);
      if (word.length > MAX_WORD_LENGTH) {
        throw new Error(`\"${value}\" is longer than ${MAX_WORD_LENGTH} letters after spaces and punctuation are removed.`);
      }
      if (word.length > gridSize) throw new Error(`\"${value}\" is too long for a ${gridSize} by ${gridSize} grid.`);
      if (seen.has(word)) throw new Error(`\"${value}\" duplicates another selected word after cleanup.`);
      seen.add(word);
      return word;
    });
  }

  function sortWordBank(words) {
    return [...words].sort((left, right) =>
      left.length - right.length || left.localeCompare(right));
  }

  function generateWordSearch(options) {
    const gridSize = Number(options?.gridSize ?? DEFAULT_GRID_SIZE);
    if (!Number.isInteger(gridSize) || gridSize < 10 || gridSize > 30) {
      throw new Error('Grid size must be a whole number from 10 through 30.');
    }

    const requestedWords = Array.isArray(options?.words) ? options.words : [];
    if (!requestedWords.length) throw new Error('Select at least one word.');
    const words = validateWords(requestedWords, gridSize);
    const difficulty = normalizeDifficulty(options?.difficulty);
    const seed = typeof options?.seed === 'undefined'
      ? hashSeed(words.join('|'))
      : options.seed;
    const random = createRandom(seed);
    const grid = makeGrid(gridSize);

    const placementOrder = shuffle([...words], random)
      .sort((left, right) => right.length - left.length);
    const placements = [];
    const failedWords = [];

    for (const word of placementOrder) {
      const placement = tryPlaceWord(grid, word, difficulty, random);
      if (placement) placements.push(placement);
      else failedWords.push(word);
    }

    for (const row of grid) {
      for (let column = 0; column < row.length; column += 1) {
        if (!row[column]) row[column] = String.fromCharCode(65 + randomIndex(26, random));
      }
    }

    return {
      title: 'WORD SEARCH',
      answerTitle: 'WORD SEARCH — ANSWER KEY',
      difficulty,
      gridSize,
      grid,
      placements,
      failedWords,
      wordBank: sortWordBank(placements.map(placement => placement.word)),
      seed: typeof seed === 'number' ? seed >>> 0 : hashSeed(seed)
    };
  }

  function placementCoordinates(placement) {
    return {
      word: placement.word,
      startX: placement.startCol + 1,
      startY: placement.startRow + 1,
      endX: placement.startCol + (placement.word.length - 1) * placement.colStep + 1,
      endY: placement.startRow + (placement.word.length - 1) * placement.rowStep + 1
    };
  }

  return Object.freeze({
    MAX_WORD_LENGTH,
    cleanWord,
    normalizeDifficulty,
    generateWordSearch,
    placementCoordinates
  });
}));
