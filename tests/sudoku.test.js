// Run with:  npm test   (or: node --test)
const test = require('node:test');
const assert = require('node:assert/strict');
const S = require('../js/sudoku.js');

const PUZZLE = '53..7....6..195....98....6.8...6...34..8.3..17...2...6.6....28....419..5....8..79';
const SOLUTION = '534678912672195348198342567859761423426853791713924856961537284287419635345286179';

test('parses and serializes boards', () => {
  const board = S.fromString(PUZZLE);
  assert.equal(board.length, 81);
  assert.equal(S.toString(board), PUZZLE);
  assert.equal(S.fromString('123'), null);
  assert.equal(S.fromString('x'.repeat(81)), null);
});

test('solves a classic puzzle', () => {
  const solved = S.solve(S.fromString(PUZZLE));
  assert.equal(S.toString(solved), SOLUTION);
});

test('detects conflicts', () => {
  const board = S.fromString(PUZZLE);
  assert.equal(S.findConflicts(board).size, 0);
  board[2] = 5; // same row as the 5 in the corner
  assert.deepEqual([...S.findConflicts(board)].sort((a, b) => a - b), [0, 2]);
  assert.equal(S.isValidBoard(board), false);
  assert.equal(S.solve(board), null);
});

test('counts solutions', () => {
  assert.equal(S.countSolutions(S.fromString(PUZZLE)), 1);
  assert.equal(S.countSolutions(new Array(81).fill(0)), 2); // capped at the limit
  assert.equal(S.hasUniqueSolution(new Array(81).fill(0)), false);
});

test('singles solver handles easy puzzles', () => {
  assert.equal(S.solveWithSingles(S.fromString(PUZZLE)).solved, true);
});

for (const level of ['easy', 'medium', 'hard', 'expert']) {
  test(`generates a valid, unique ${level} puzzle`, () => {
    const { puzzle, solution, clues } = S.generate(level);
    assert.equal(puzzle.filter(Boolean).length, clues);
    assert.ok(S.isValidBoard(solution) && solution.every(Boolean), 'solution is complete and valid');
    puzzle.forEach((v, i) => { if (v) assert.equal(v, solution[i]); });
    assert.ok(S.hasUniqueSolution(puzzle), 'exactly one solution');
    assert.deepEqual(S.solve(puzzle), solution);
  });
}

test('difficulty levels are ordered by number of clues', () => {
  const avg = (level) => {
    let sum = 0;
    for (let k = 0; k < 5; k++) sum += S.generate(level).clues;
    return sum / 5;
  };
  const [e, m, h, x] = ['easy', 'medium', 'hard', 'expert'].map(avg);
  assert.ok(e > m && m > h && h > x, `${e} > ${m} > ${h} > ${x}`);
});

test('easy puzzles need only naked singles, medium only singles', () => {
  assert.ok(S.solveWithSingles(S.generate('easy').puzzle, { hidden: false }).solved);
  assert.ok(S.solveWithSingles(S.generate('medium').puzzle).solved);
});

test('seeded generation is reproducible (daily challenge)', () => {
  const seed = S.seedFromString('sudoku-daily-2026-10-12');
  const a = S.generate('medium', S.createRandom(seed));
  const b = S.generate('medium', S.createRandom(seed));
  const c = S.generate('medium', S.createRandom(seed + 1));
  assert.equal(S.toString(a.puzzle), S.toString(b.puzzle));
  assert.notEqual(S.toString(a.puzzle), S.toString(c.puzzle));
});

test('search respects the node budget', () => {
  const r = S.search(new Array(81).fill(0), { limit: 1e9, maxNodes: 500 });
  assert.equal(r.aborted, true);
});
