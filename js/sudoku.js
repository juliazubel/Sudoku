/*
 * Sudoku engine — solver, generator and helpers.
 *
 * A board is a flat array of 81 numbers (row by row), where 0 means "empty".
 * Candidates are stored as 9-bit masks: bit (d - 1) is set when digit d is allowed.
 *
 * Works in the browser (window.SudokuEngine) and in Node (module.exports).
 */
(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.SudokuEngine = engine;
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const ALL = 0x1ff; // digits 1..9

  // ---------- Precomputed geometry ----------
  const ROW_OF = new Uint8Array(81);
  const COL_OF = new Uint8Array(81);
  const BOX_OF = new Uint8Array(81);
  const UNITS = []; // 27 units: 9 rows, 9 columns, 9 boxes
  const PEERS = []; // 20 peers for every cell

  for (let i = 0; i < 81; i++) {
    ROW_OF[i] = (i / 9) | 0;
    COL_OF[i] = i % 9;
    BOX_OF[i] = ((ROW_OF[i] / 3) | 0) * 3 + ((COL_OF[i] / 3) | 0);
  }
  for (let u = 0; u < 9; u++) {
    const row = [], col = [], box = [];
    for (let k = 0; k < 9; k++) {
      row.push(u * 9 + k);
      col.push(k * 9 + u);
      box.push((((u / 3) | 0) * 3 + ((k / 3) | 0)) * 9 + (u % 3) * 3 + (k % 3));
    }
    UNITS.push(row, col, box);
  }
  for (let i = 0; i < 81; i++) {
    const set = new Set();
    for (let j = 0; j < 81; j++) {
      if (j !== i && (ROW_OF[j] === ROW_OF[i] || COL_OF[j] === COL_OF[i] || BOX_OF[j] === BOX_OF[i])) set.add(j);
    }
    PEERS.push(Array.from(set));
  }

  // ---------- Bit helpers ----------
  const POPCOUNT = new Uint8Array(512);
  for (let m = 1; m < 512; m++) POPCOUNT[m] = POPCOUNT[m >> 1] + (m & 1);

  const bit = (d) => 1 << (d - 1);

  function digitsOf(mask) {
    const out = [];
    for (let d = 1; d <= 9; d++) if (mask & bit(d)) out.push(d);
    return out;
  }

  // ---------- Randomness ----------
  /** Small, fast, seedable PRNG (mulberry32). Returns floats in [0, 1). */
  function createRandom(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Turns any string (e.g. "2026-10-12") into a 32-bit seed. */
  function seedFromString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function shuffle(arr, rand) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  // ---------- Validation ----------
  /** Returns a Set with indices of cells that clash with another cell in a row, column or box. */
  function findConflicts(board) {
    const conflicts = new Set();
    for (const unit of UNITS) {
      const seen = new Map();
      for (const i of unit) {
        const v = board[i];
        if (!v) continue;
        if (seen.has(v)) {
          conflicts.add(i);
          conflicts.add(seen.get(v));
        } else {
          seen.set(v, i);
        }
      }
    }
    return conflicts;
  }

  function isValidBoard(board) {
    if (!Array.isArray(board) || board.length !== 81) return false;
    for (const v of board) if (!Number.isInteger(v) || v < 0 || v > 9) return false;
    return findConflicts(board).size === 0;
  }

  /** Candidate mask for cell i, based only on the digits currently on the board. */
  function candidates(board, i) {
    if (board[i]) return 0;
    let used = 0;
    for (const p of PEERS[i]) if (board[p]) used |= bit(board[p]);
    return ALL & ~used;
  }

  // ---------- Backtracking solver ----------
  /**
   * Depth-first search with the "minimum remaining values" heuristic and bitmasks.
   * Stops after `limit` solutions or `maxNodes` visited nodes.
   * Returns { count, solution, aborted }.
   */
  function search(board, { limit = 1, rand = null, maxNodes = 2e6 } = {}) {
    const g = board.slice();
    const rows = new Uint16Array(9), cols = new Uint16Array(9), boxes = new Uint16Array(9);

    for (let i = 0; i < 81; i++) {
      const v = g[i];
      if (!v) continue;
      const b = bit(v);
      if ((rows[ROW_OF[i]] | cols[COL_OF[i]] | boxes[BOX_OF[i]]) & b) return { count: 0, solution: null, aborted: false };
      rows[ROW_OF[i]] |= b; cols[COL_OF[i]] |= b; boxes[BOX_OF[i]] |= b;
    }

    let count = 0, solution = null, nodes = 0, aborted = false;

    function rec() {
      if (++nodes > maxNodes) { aborted = true; return true; }

      let best = -1, bestMask = 0, bestCount = 10;
      for (let i = 0; i < 81; i++) {
        if (g[i]) continue;
        const m = ALL & ~(rows[ROW_OF[i]] | cols[COL_OF[i]] | boxes[BOX_OF[i]]);
        const c = POPCOUNT[m];
        if (c === 0) return false; // dead end
        if (c < bestCount) { best = i; bestMask = m; bestCount = c; if (c === 1) break; }
      }

      if (best === -1) {
        count++;
        if (!solution) solution = g.slice();
        return count >= limit;
      }

      const digits = digitsOf(bestMask);
      if (rand) shuffle(digits, rand);
      const r = ROW_OF[best], c = COL_OF[best], bx = BOX_OF[best];
      for (const d of digits) {
        const b = bit(d);
        g[best] = d; rows[r] |= b; cols[c] |= b; boxes[bx] |= b;
        if (rec()) return true;
        g[best] = 0; rows[r] &= ~b; cols[c] &= ~b; boxes[bx] &= ~b;
      }
      return false;
    }

    rec();
    return { count, solution, aborted };
  }

  /** Returns a solved copy of the board, or null if there is no solution. */
  function solve(board) {
    const { solution } = search(board, { limit: 1 });
    return solution;
  }

  /** Counts solutions, stopping at `limit` (2 is enough to test uniqueness). */
  function countSolutions(board, limit = 2) {
    return search(board, { limit }).count;
  }

  function hasUniqueSolution(board) {
    const r = search(board, { limit: 2 });
    return r.count === 1 && !r.aborted;
  }

  // ---------- Human-style solver (used to grade difficulty) ----------
  /**
   * Solves using only "naked singles" (a cell with one candidate) and, optionally,
   * "hidden singles" (a digit with one possible place in a unit).
   * Returns { solved, board }.
   */
  function solveWithSingles(board, { hidden = true } = {}) {
    const g = board.slice();
    let progress = true;
    while (progress) {
      progress = false;
      for (let i = 0; i < 81; i++) {
        if (g[i]) continue;
        const m = candidates(g, i);
        if (m === 0) return { solved: false, board: g };
        if (POPCOUNT[m] === 1) { g[i] = digitsOf(m)[0]; progress = true; }
      }
      if (progress || !hidden) continue;
      for (const unit of UNITS) {
        for (let d = 1; d <= 9; d++) {
          let spot = -1, n = 0, present = false;
          for (const i of unit) {
            if (g[i] === d) { present = true; break; }
            if (!g[i] && (candidates(g, i) & bit(d))) { spot = i; n++; }
          }
          if (!present && n === 1) { g[spot] = d; progress = true; }
        }
      }
    }
    return { solved: g.every(Boolean), board: g };
  }

  // ---------- Generator ----------
  const DIFFICULTIES = {
    easy:   { clues: 40, technique: 'naked',  attempts: 1 },  // naked singles are enough
    medium: { clues: 32, technique: 'hidden', attempts: 1 },  // naked + hidden singles
    hard:   { clues: 27, technique: 'any',    attempts: 3 },
    expert: { clues: 22, technique: 'any',    attempts: 10, beyondSingles: true, singleCellPass: true },
  };

  function generateSolved(rand = Math.random) {
    return search(new Array(81).fill(0), { limit: 1, rand }).solution;
  }

  function fitsTechnique(puzzle, technique) {
    if (technique === 'naked') return solveWithSingles(puzzle, { hidden: false }).solved;
    if (technique === 'hidden') return solveWithSingles(puzzle, { hidden: true }).solved;
    return true;
  }

  function carve(solution, config, rand) {
    const puzzle = solution.slice();
    let clues = 81;
    const tryRemove = (cells) => {
      const keep = cells.map((i) => puzzle[i]);
      for (const i of cells) puzzle[i] = 0;
      if (hasUniqueSolution(puzzle) && fitsTechnique(puzzle, config.technique)) {
        clues -= cells.length;
      } else {
        cells.forEach((i, k) => { puzzle[i] = keep[k]; });
      }
    };
    // Remove cells in symmetric pairs (180° rotation) — classic, nicer-looking puzzles.
    for (const i of shuffle(Array.from({ length: 41 }, (_, k) => k), rand)) {
      if (clues <= config.clues) break;
      tryRemove(i === 40 ? [40] : [i, 80 - i]);
    }
    // Optionally squeeze out a few more clues one cell at a time.
    if (config.singleCellPass) {
      for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k), rand)) {
        if (clues <= config.clues) break;
        if (puzzle[i]) tryRemove([i]);
      }
    }
    return { puzzle, clues };
  }

  /**
   * Generates a puzzle with exactly one solution.
   * @param {'easy'|'medium'|'hard'|'expert'} difficulty
   * @param {() => number} rand  random source in [0, 1) — pass createRandom(seed) for reproducible puzzles
   */
  function generate(difficulty = 'medium', rand = Math.random) {
    const config = DIFFICULTIES[difficulty] || DIFFICULTIES.medium;
    let best = null, bestScore = Infinity;
    for (let a = 0; a < config.attempts; a++) {
      const solution = generateSolved(rand);
      const { puzzle, clues } = carve(solution, config, rand);
      // Lower score = harder. For expert, puzzles that need more than singles win.
      let score = clues;
      if (config.beyondSingles && solveWithSingles(puzzle).solved) score += 100;
      if (score < bestScore) { best = { puzzle, solution, clues, difficulty }; bestScore = score; }
    }
    return best;
  }

  // ---------- Serialization ----------
  function toString(board) {
    return board.map((v) => (v ? String(v) : '.')).join('');
  }

  function fromString(str) {
    const clean = String(str).replace(/\s+/g, '');
    if (clean.length !== 81) return null;
    const out = [];
    for (const ch of clean) {
      if (ch >= '1' && ch <= '9') out.push(Number(ch));
      else if (ch === '0' || ch === '.' || ch === '-' || ch === '_') out.push(0);
      else return null;
    }
    return out;
  }

  return {
    ALL, ROW_OF, COL_OF, BOX_OF, UNITS, PEERS, POPCOUNT, DIFFICULTIES,
    bit, digitsOf, candidates,
    createRandom, seedFromString, shuffle,
    findConflicts, isValidBoard,
    search, solve, countSolutions, hasUniqueSolution, solveWithSingles,
    generateSolved, generate,
    toString, fromString,
  };
});
