/* =========================================================
   Sudoku — game UI
   Depends on: SudokuEngine (sudoku.js), I18n (i18n.js)
   ========================================================= */
(function () {
  'use strict';

  const S = window.SudokuEngine;
  const I18n = window.I18n;
  const t = I18n.t;

  // ---------- Constants ----------
  const STORAGE = {
    game: 'sudoku.game.v1',
    settings: 'sudoku.settings.v1',
    stats: 'sudoku.stats.v1',
    create: 'sudoku.create.v1',
  };
  const LEVELS = ['easy', 'medium', 'hard', 'expert'];
  const STAT_KEYS = [...LEVELS, 'daily'];
  const MAX_MISTAKES = 3;
  const MAX_HISTORY = 400;
  // Daily challenge difficulty by weekday (0 = Sunday).
  const DAILY_LEVELS = ['expert', 'easy', 'medium', 'medium', 'hard', 'medium', 'hard'];

  const DEFAULT_SETTINGS = {
    showMistakes: true,
    mistakeLimit: false,
    highlightArea: true,
    highlightSame: true,
    autoNotes: true,
    showTimer: true,
    theme: 'auto',
    lang: null,
  };

  // ---------- Storage (fails gracefully, e.g. in private mode) ----------
  const store = {
    get(key, fallback) {
      try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : fallback; } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* ignore */ }
    },
    remove(key) {
      try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
    },
  };

  // ---------- State ----------
  let settings = Object.assign({}, DEFAULT_SETTINGS, store.get(STORAGE.settings, {}));
  let stats = normalizeStats(store.get(STORAGE.stats, {}));
  let game = null;                 // current game (persisted)
  let view = 'game';               // 'game' | 'create'
  let draft = normalizeDraft(store.get(STORAGE.create, null)); // create-mode board
  let selected = -1;
  let highlightDigit = 0;
  let notesMode = false;
  let paused = false;
  let lastTick = 0;
  const transient = new Map();     // cell index -> Set of short-lived animation classes

  // ---------- DOM ----------
  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  const els = {
    board: $('#board'),
    numpad: $('#numpad'),
    modeLabel: $('#mode-label'),
    mistakes: $('#mistakes'),
    mistakesLimit: $('#mistakes-limit'),
    infoMistakes: $('#info-mistakes'),
    timer: $('#timer'),
    timerWrap: $('#timer-wrap'),
    pauseBtn: $('#btn-pause'),
    pauseOverlay: $('#pause-overlay'),
    notesBtn: $('#btn-notes'),
    notesBadge: $('#notes-badge'),
    hintBtn: $('#btn-hint'),
    hintBadge: $('#hint-badge'),
    undoBtn: $('#btn-undo'),
    eraseBtn: $('#btn-erase'),
    createPanel: $('#create-panel'),
    createStatus: $('#create-status'),
    gameButtons: $('#game-buttons'),
    createButtons: $('#create-buttons'),
    toast: $('#toast'),
    confetti: $('#confetti'),
    dailyCheck: $('.daily-check'),
  };
  const cells = [];

  // =========================================================
  // Helpers
  // =========================================================
  function todayKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function formatTime(ms) {
    const total = Math.floor(ms / 1000);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const mm = String(m).padStart(2, '0');
    const ss = String(s).padStart(2, '0');
    return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
  }

  function normalizeStats(raw) {
    const out = { dailyWon: [], dailyStarted: [] };
    for (const k of STAT_KEYS) {
      const s = (raw && raw[k]) || {};
      out[k] = { played: s.played || 0, won: s.won || 0, best: s.best || 0, total: s.total || 0 };
    }
    if (raw && Array.isArray(raw.dailyWon)) out.dailyWon = raw.dailyWon.slice(-400);
    if (raw && Array.isArray(raw.dailyStarted)) out.dailyStarted = raw.dailyStarted.slice(-400);
    return out;
  }

  function normalizeDraft(raw) {
    if (raw && Array.isArray(raw.values) && raw.values.length === 81) return { values: raw.values, solved: null };
    return { values: new Array(81).fill(0), solved: null };
  }

  function isValidGame(g) {
    return g && Array.isArray(g.puzzle) && g.puzzle.length === 81 && Array.isArray(g.solution) &&
      Array.isArray(g.values) && Array.isArray(g.notes) && Array.isArray(g.hinted);
  }

  function saveGame() { if (game) store.set(STORAGE.game, game); }
  function saveSettings() { store.set(STORAGE.settings, settings); }
  function saveStats() { store.set(STORAGE.stats, stats); }
  function saveDraft() { store.set(STORAGE.create, { values: draft.values }); }

  const isLocked = (i) => game.puzzle[i] !== 0 || game.hinted[i] === 1;
  const isPlaying = () => view === 'game' && game && game.status === 'playing' && !paused;
  const modalOpen = () => !!document.querySelector('dialog[open]');

  function hasProgress() {
    return game && game.status === 'playing' && (game.history.length > 0 || game.elapsed > 15000);
  }

  function levelLabel(level) { return t('mode.' + level); }

  function currentBoard() {
    return view === 'create' ? draft.values : game.values;
  }

  // =========================================================
  // Game lifecycle
  // =========================================================
  function createGame({ mode, difficulty, puzzle, solution, date = null }) {
    return {
      mode, difficulty, date,
      puzzle: puzzle.slice(),
      solution: solution.slice(),
      values: puzzle.slice(),
      notes: new Array(81).fill(0),
      hinted: new Array(81).fill(0),
      mistakes: 0,
      hints: 0,
      elapsed: 0,
      status: 'playing',
      history: [],
      future: [],
      counted: false,
    };
  }

  function startGame(newGame) {
    game = newGame;
    view = 'game';
    selected = -1;
    highlightDigit = 0;
    notesMode = false;
    paused = false;
    transient.clear();
    saveGame();
    renderAll();
    animateBoardIn();
  }

  function newLevelGame(level) {
    const { puzzle, solution } = S.generate(level);
    const g = createGame({ mode: level, difficulty: level, puzzle, solution });
    stats[level].played++;
    saveStats();
    startGame(g);
  }

  function newDailyGame() {
    const date = todayKey();
    const level = DAILY_LEVELS[new Date().getDay()];
    const rand = S.createRandom(S.seedFromString('sudoku-daily-' + date));
    const { puzzle, solution } = S.generate(level, rand);
    const g = createGame({ mode: 'daily', difficulty: level, puzzle, solution, date });
    if (!stats.dailyStarted.includes(date)) {
      stats.dailyStarted.push(date);
      stats.daily.played++;
      saveStats();
    }
    startGame(g);
  }

  function restartGame() {
    if (!game) return;
    startGame(Object.assign(createGame(game), { counted: game.counted }));
  }

  async function guardProgress(title, text) {
    if (!hasProgress()) return true;
    return confirmDialog(title || t('confirm.title'), text || t('confirm.text'));
  }

  // =========================================================
  // Moves (with undo/redo)
  // =========================================================
  /** Runs `mutate`, records which cells changed, and pushes a history entry. */
  function commit(mutate) {
    const bv = game.values.slice(), bn = game.notes.slice(), bh = game.hinted.slice();
    mutate();
    const diff = [];
    for (let i = 0; i < 81; i++) {
      if (bv[i] !== game.values[i] || bn[i] !== game.notes[i] || bh[i] !== game.hinted[i]) {
        diff.push([i, bv[i], bn[i], bh[i], game.values[i], game.notes[i], game.hinted[i]]);
      }
    }
    if (diff.length) {
      game.history.push(diff);
      if (game.history.length > MAX_HISTORY) game.history.shift();
      game.future = [];
    }
    return diff.length > 0;
  }

  function applyDiff(diff, useAfter) {
    for (const [i, bv, bn, bh, av, an, ah] of diff) {
      game.values[i] = useAfter ? av : bv;
      game.notes[i] = useAfter ? an : bn;
      game.hinted[i] = useAfter ? ah : bh;
    }
  }

  function undo() {
    if (!isPlaying() || !game.history.length) return;
    const diff = game.history.pop();
    applyDiff(diff, false);
    game.future.push(diff);
    selected = diff[0][0];
    afterChange();
  }

  function redo() {
    if (!isPlaying() || !game.future.length) return;
    const diff = game.future.pop();
    applyDiff(diff, true);
    game.history.push(diff);
    selected = diff[0][0];
    afterChange();
  }

  function removeNotesFromPeers(i, d) {
    const b = S.bit(d);
    for (const p of S.PEERS[i]) game.notes[p] &= ~b;
  }

  function placeDigit(i, d) {
    if (game.values[i] === d) return;
    const correct = game.solution[i] === d;
    commit(() => {
      game.values[i] = d;
      game.notes[i] = 0;
      // With mistake highlighting on, only correct digits clean up notes (otherwise a wrong
      // digit would wipe useful notes). With it off we can't reveal correctness, so always clean.
      if (settings.autoNotes && (correct || !settings.showMistakes)) removeNotesFromPeers(i, d);
    });
    addTransient(i, 'placed', 250);

    if (!correct && settings.showMistakes) {
      game.mistakes++;
      if (settings.mistakeLimit && game.mistakes >= MAX_MISTAKES) {
        afterChange();
        return lose();
      }
    }
    if (correct) flashCompletedUnits(i);
    afterChange();
    checkFinished();
  }

  function toggleNote(i, d) {
    if (game.values[i]) return;
    commit(() => { game.notes[i] ^= S.bit(d); });
    afterChange();
  }

  function eraseCell(i) {
    if (isLocked(i)) { toast(t('toast.given')); return; }
    if (!game.values[i] && !game.notes[i]) return;
    commit(() => {
      if (game.values[i]) game.values[i] = 0;
      else game.notes[i] = 0;
    });
    afterChange();
  }

  function giveHint() {
    if (!isPlaying()) return;
    let target = -1;
    if (selected >= 0 && !isLocked(selected) && game.values[selected] !== game.solution[selected]) {
      target = selected;
    } else {
      // Pick the empty (or wrong) cell with the fewest candidates — the most "logical" next step.
      const board = game.values.map((v, i) => (v === game.solution[i] ? v : 0));
      let best = 10;
      for (let i = 0; i < 81; i++) {
        if (board[i]) continue;
        const n = S.POPCOUNT[S.candidates(board, i)];
        if (n < best) { best = n; target = i; }
      }
    }
    if (target < 0) { toast(t('toast.hintNoCell')); return; }

    const d = game.solution[target];
    commit(() => {
      game.values[target] = d;
      game.notes[target] = 0;
      game.hinted[target] = 1;
      if (settings.autoNotes) removeNotesFromPeers(target, d);
    });
    game.hints++;
    selected = target;
    highlightDigit = 0;
    addTransient(target, 'hint-reveal', 900);
    flashCompletedUnits(target);
    afterChange();
    checkFinished();
  }

  function flashCompletedUnits(i) {
    // UNITS is ordered row0, col0, box0, row1, col1, box1, ...
    const units = [S.UNITS[S.ROW_OF[i] * 3], S.UNITS[S.COL_OF[i] * 3 + 1], S.UNITS[S.BOX_OF[i] * 3 + 2]];
    for (const unit of units) {
      if (unit.every((c) => game.values[c] === game.solution[c])) {
        unit.forEach((c, k) => setTimeout(() => addTransient(c, 'flash', 700), k * 35));
      }
    }
  }

  function checkFinished() {
    if (game.values.every((v, i) => v === game.solution[i])) return win();
    if (game.values.every(Boolean) && !settings.showMistakes) toast(t('toast.fullWrong'));
  }

  function win() {
    game.status = 'won';
    selected = -1;
    highlightDigit = 0;
    let record = false;
    const key = game.mode === 'daily' ? 'daily' : (LEVELS.includes(game.mode) ? game.mode : null);
    const alreadyCountedDaily = game.mode === 'daily' && stats.dailyWon.includes(game.date);
    if (key && !game.counted && !alreadyCountedDaily) {
      const s = stats[key];
      s.won++;
      s.total += game.elapsed;
      if (!s.best || game.elapsed < s.best) { record = s.won > 1; s.best = game.elapsed; }
      if (game.mode === 'daily') stats.dailyWon.push(game.date);
      saveStats();
    }
    game.counted = true;
    saveGame();
    renderAll();

    $('#win-time').textContent = formatTime(game.elapsed);
    $('#win-mistakes').textContent = game.mistakes;
    $('#win-hints').textContent = game.hints;
    $('#win-record').hidden = !record;
    $('#win-daily').hidden = game.mode !== 'daily';

    // Let the last flash play, then celebrate.
    setTimeout(() => { confetti(); openDialog('#dlg-win'); }, 650);
  }

  function lose() {
    game.status = 'lost';
    saveGame();
    renderAll();
    setTimeout(() => openDialog('#dlg-lost'), 300);
  }

  function afterChange() {
    saveGame();
    render();
  }

  // =========================================================
  // Input handling
  // =========================================================
  function inputDigit(d, asNote = false) {
    if (view === 'create') return createInput(d);
    if (!game || game.status !== 'playing' || paused) return;

    if (selected < 0 || isLocked(selected)) {
      highlightDigit = highlightDigit === d ? 0 : d;
      if (selected >= 0) selected = -1;
      render();
      return;
    }
    highlightDigit = 0;
    if (asNote || notesMode) toggleNote(selected, d);
    else placeDigit(selected, d);
  }

  function erase() {
    if (view === 'create') return createInput(0);
    if (!isPlaying() || selected < 0) return;
    eraseCell(selected);
  }

  function selectCell(i) {
    if (paused) return;
    selected = i;
    highlightDigit = 0;
    render();
  }

  function moveSelection(dr, dc) {
    if (selected < 0) { selectCell(40); return; }
    const r = (S.ROW_OF[selected] + dr + 9) % 9;
    const c = (S.COL_OF[selected] + dc + 9) % 9;
    selectCell(r * 9 + c);
  }

  function toggleNotesMode() {
    if (view !== 'game') return;
    notesMode = !notesMode;
    render();
  }

  function setPaused(value) {
    if (!game || game.status !== 'playing' || view !== 'game') value = false;
    paused = value;
    saveGame();
    render();
  }

  function onKeyDown(e) {
    if (modalOpen()) return;
    const ctrl = e.ctrlKey || e.metaKey;
    const code = e.code || '';
    const key = (e.key || '').toLowerCase();

    if (ctrl && key === 'z' && !e.shiftKey) { e.preventDefault(); return undo(); }
    if (ctrl && (key === 'y' || (key === 'z' && e.shiftKey))) { e.preventDefault(); return redo(); }
    if (ctrl || e.altKey) return;

    const digitMatch = code.match(/^(?:Digit|Numpad)([0-9])$/);
    const digit = digitMatch ? Number(digitMatch[1]) : (/^[0-9]$/.test(e.key) ? Number(e.key) : -1);

    if (digit >= 1) { e.preventDefault(); return inputDigit(digit, e.shiftKey); }
    if (digit === 0 || key === 'backspace' || key === 'delete') { e.preventDefault(); return erase(); }

    switch (key) {
      case 'arrowup': e.preventDefault(); return moveSelection(-1, 0);
      case 'arrowdown': e.preventDefault(); return moveSelection(1, 0);
      case 'arrowleft': e.preventDefault(); return moveSelection(0, -1);
      case 'arrowright': e.preventDefault(); return moveSelection(0, 1);
      case 'n': return toggleNotesMode();
      case 'h': return giveHint();
      case 'p': return setPaused(!paused);
      case 'escape': selected = -1; highlightDigit = 0; return render();
      default:
    }
  }

  // =========================================================
  // Create / solver mode
  // =========================================================
  function createInput(d) {
    if (selected < 0) return;
    draft.values[selected] = d;
    draft.solved = null;
    if (d) addTransient(selected, 'placed', 250);
    saveDraft();
    render();
  }

  let analyzeCache = { key: '', lang: '', result: null };

  function analyzeDraft() {
    const key = S.toString(draft.values);
    if (analyzeCache.key === key && analyzeCache.lang === I18n.language) return analyzeCache.result;
    const result = analyzeBoard(draft.values);
    analyzeCache = { key, lang: I18n.language, result };
    return result;
  }

  function analyzeBoard(v) {
    const clues = v.filter(Boolean).length;
    if (S.findConflicts(v).size) return { kind: 'bad', text: t('create.status.conflict') };
    if (clues === 0) return { kind: '', text: t('create.status.empty') };
    if (clues < 17) return { kind: '', text: t('create.status.few', { n: clues }) };
    const r = S.search(v, { limit: 2, maxNodes: 300000 });
    if (r.aborted && r.count < 2) return { kind: 'bad', text: t('create.status.timeout') };
    if (r.count === 0) return { kind: 'bad', text: t('create.status.none'), unsolvable: true };
    if (r.count > 1) return { kind: 'bad', text: t('create.status.multiple'), solution: r.solution };
    return { kind: 'ok', text: t('create.status.unique'), unique: true, solution: r.solution };
  }

  function solveDraft() {
    const a = analyzeDraft();
    if (!a.solution) { toast(a.text); return; }
    draft.solved = a.solution;
    selected = -1;
    // Reveal the solution with a little cascade.
    let k = 0;
    for (let i = 0; i < 81; i++) if (!draft.values[i]) cells[i].style.animationDelay = (k++) * 12 + 'ms';
    render();
    setTimeout(() => cells.forEach((c) => { c.style.animationDelay = ''; }), 400 + k * 12);
    toast(t('create.solved'));
  }

  async function playDraft() {
    const a = analyzeDraft();
    if (!a.unique) { toast(a.text); return; }
    if (!(await guardProgress())) return;
    startGame(createGame({ mode: 'custom', difficulty: 'custom', puzzle: draft.values, solution: a.solution }));
  }

  function clearDraft() {
    draft = { values: new Array(81).fill(0), solved: null };
    selected = -1;
    saveDraft();
    render();
  }

  // =========================================================
  // Rendering
  // =========================================================
  function buildBoard() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 81; i++) {
      const cell = document.createElement('div');
      cell.setAttribute('role', 'gridcell');
      cell.dataset.index = i;
      cell.addEventListener('pointerdown', (e) => { e.preventDefault(); els.board.focus({ preventScroll: true }); selectCell(i); });
      cells.push(cell);
      frag.appendChild(cell);
    }
    els.board.appendChild(frag);
    els.board.tabIndex = 0;
  }

  function buildNumpad() {
    for (let d = 1; d <= 9; d++) {
      const b = document.createElement('button');
      b.className = 'num';
      b.dataset.digit = d;
      b.innerHTML = `<span>${d}</span><small></small>`;
      b.addEventListener('click', () => inputDigit(d));
      els.numpad.appendChild(b);
    }
  }

  function addTransient(i, cls, ms) {
    if (!transient.has(i)) transient.set(i, new Set());
    transient.get(i).add(cls);
    paintCell(i);
    setTimeout(() => {
      const set = transient.get(i);
      if (!set) return;
      set.delete(cls);
      if (!set.size) transient.delete(i);
      paintCell(i);
    }, ms);
  }

  let renderCtx = null;

  function computeRenderCtx() {
    const board = currentBoard();
    const inCreate = view === 'create';
    const selVal = selected >= 0 ? (board[selected] || (inCreate && draft.solved ? draft.solved[selected] : 0)) : 0;
    const digit = selVal || highlightDigit;
    const conflicts = inCreate ? S.findConflicts(board) : null;
    return { board, inCreate, digit, conflicts };
  }

  function paintCell(i) {
    if (!renderCtx) return;
    const { board, inCreate, digit, conflicts } = renderCtx;
    const cell = cells[i];
    const r = S.ROW_OF[i], c = S.COL_OF[i];
    const cls = ['cell'];
    if (c === 2 || c === 5) cls.push('b-right');
    if (r === 2 || r === 5) cls.push('b-bottom');

    let value = board[i];
    let notes = 0;

    if (inCreate) {
      if (value) cls.push('given');
      else if (draft.solved) { value = draft.solved[i]; cls.push('solved-fill'); }
      if (conflicts.has(i)) cls.push('error');
    } else {
      notes = game.notes[i];
      if (game.puzzle[i]) cls.push('given');
      else if (game.hinted[i]) cls.push('hinted');
      if (value && !game.puzzle[i] && settings.showMistakes && value !== game.solution[i]) cls.push('error');
    }

    if (selected >= 0) {
      if (i === selected) cls.push('selected');
      else if (settings.highlightArea && (S.ROW_OF[selected] === r || S.COL_OF[selected] === c || S.BOX_OF[selected] === S.BOX_OF[i])) cls.push('area');
    }
    if (settings.highlightSame && digit && value === digit && i !== selected) cls.push('same');

    const extra = transient.get(i);
    if (extra) extra.forEach((x) => cls.push(x));

    cell.className = Array.from(new Set(cls)).join(' ');

    // Content
    let html = '';
    if (value) {
      html = String(value);
    } else if (notes) {
      html = '<div class="notes">';
      for (let d = 1; d <= 9; d++) {
        const on = notes & S.bit(d);
        const hl = on && settings.highlightSame && d === digit;
        html += `<span${hl ? ' class="hl"' : ''}>${on ? d : ''}</span>`;
      }
      html += '</div>';
    }
    if (cell._html !== html) { cell.innerHTML = html; cell._html = html; }

    let label = t('cell.label', { r: r + 1, c: c + 1 }) + ', ' + (value ? value : t('cell.empty'));
    if (cls.includes('given')) label += ` (${t('cell.given')})`;
    cell.setAttribute('aria-label', label);
    cell.setAttribute('aria-selected', i === selected ? 'true' : 'false');
  }

  function render() {
    if (!game) return;
    renderCtx = computeRenderCtx();
    for (let i = 0; i < 81; i++) paintCell(i);

    const inCreate = view === 'create';
    const board = renderCtx.board;

    // Numpad: remaining count per digit
    const counts = new Array(10).fill(0);
    for (let i = 0; i < 81; i++) {
      const v = board[i];
      if (!v) continue;
      if (!inCreate && settings.showMistakes && v !== game.solution[i]) continue;
      counts[v]++;
    }
    els.numpad.querySelectorAll('.num').forEach((b) => {
      const d = Number(b.dataset.digit);
      const left = Math.max(0, 9 - counts[d]);
      b.querySelector('small').textContent = left || '';
      b.classList.toggle('is-done', left === 0);
      b.classList.toggle('is-active', !!highlightDigit && highlightDigit === d);
      b.disabled = !inCreate && (game.status !== 'playing' || paused);
    });
    els.numpad.classList.toggle('notes-mode', notesMode && !inCreate);
    $('#actions').classList.toggle('is-create', inCreate);

    // Actions
    const playing = !inCreate && game.status === 'playing' && !paused;
    els.undoBtn.disabled = !playing || !game.history.length;
    els.eraseBtn.disabled = inCreate ? false : !playing;
    els.notesBtn.disabled = !playing;
    els.hintBtn.disabled = !playing;
    els.notesBtn.setAttribute('aria-pressed', notesMode && !inCreate ? 'true' : 'false');
    els.notesBadge.textContent = notesMode && !inCreate ? t('action.on') : t('action.off');
    els.hintBadge.hidden = inCreate || !game.hints;
    els.hintBadge.textContent = game.hints;

    // Info bar
    if (inCreate) {
      els.modeLabel.textContent = t('mode.create');
    } else if (game.mode === 'daily') {
      els.modeLabel.textContent = `${t('mode.daily')} · ${levelLabel(game.difficulty)}`;
    } else if (game.mode === 'custom') {
      els.modeLabel.textContent = t('mode.custom');
    } else {
      els.modeLabel.textContent = levelLabel(game.difficulty);
    }
    els.infoMistakes.hidden = inCreate || !settings.showMistakes;
    els.mistakes.textContent = game.mistakes;
    els.mistakesLimit.textContent = settings.mistakeLimit ? ` / ${MAX_MISTAKES}` : '';
    els.infoMistakes.classList.toggle('is-danger', settings.mistakeLimit && game.mistakes >= MAX_MISTAKES - 1 && game.mistakes > 0);
    els.timerWrap.hidden = inCreate;
    els.timer.hidden = !settings.showTimer;
    els.timer.textContent = formatTime(game.elapsed);
    els.pauseBtn.disabled = game.status !== 'playing';
    els.pauseBtn.querySelector('use').setAttribute('href', paused ? '#i-play' : '#i-pause');
    els.pauseBtn.dataset.i18nTitle = paused ? 'action.resume' : 'action.pause';
    els.pauseBtn.title = t(els.pauseBtn.dataset.i18nTitle);

    // Pause overlay
    const showPause = paused && !inCreate && game.status === 'playing';
    els.board.classList.toggle('is-paused', showPause);
    els.pauseOverlay.hidden = !showPause;

    // Panels
    els.createPanel.hidden = !inCreate;
    els.createButtons.hidden = !inCreate;
    els.gameButtons.hidden = inCreate;
    if (inCreate) {
      const a = analyzeDraft();
      els.createStatus.textContent = a.text;
      els.createStatus.className = 'create-status' + (a.kind ? ' ' + a.kind : '');
      $('#btn-play-custom').disabled = !a.unique;
      $('#btn-solve').disabled = !a.solution;
    }

    // Mode tabs
    const activeMode = inCreate ? 'create' : game.mode;
    $$('.modes .seg').forEach((b) => b.classList.toggle('is-active', b.dataset.mode === activeMode));
    els.dailyCheck.hidden = !stats.dailyWon.includes(todayKey());
  }

  function renderAll() {
    I18n.setLanguage(settings.lang || I18n.detectLanguage());
    $('#btn-lang').textContent = I18n.language === 'pl' ? 'EN' : 'PL';
    applyTheme();
    render();
  }

  function animateBoardIn() {
    for (let i = 0; i < 81; i++) if (game.values[i]) addTransient(i, 'placed', 300);
  }

  // =========================================================
  // Timer
  // =========================================================
  function tick() {
    const now = performance.now();
    const dt = now - lastTick;
    lastTick = now;
    if (!isPlaying() || modalOpen() || document.hidden) return;
    const before = Math.floor(game.elapsed / 1000);
    game.elapsed += Math.min(dt, 1000);
    const after = Math.floor(game.elapsed / 1000);
    if (after !== before) {
      els.timer.textContent = formatTime(game.elapsed);
      if (after % 5 === 0) saveGame();
    }
  }

  // =========================================================
  // Theme
  // =========================================================
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

  function effectiveTheme() {
    if (settings.theme === 'light' || settings.theme === 'dark') return settings.theme;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }

  function applyTheme() {
    if (settings.theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = settings.theme;
    const dark = effectiveTheme() === 'dark';
    $('#btn-theme use').setAttribute('href', dark ? '#i-sun' : '#i-moon');
    $$('[data-theme-choice]').forEach((b) => b.classList.toggle('is-active', b.dataset.themeChoice === settings.theme));
    $$('[data-lang-choice]').forEach((b) => b.classList.toggle('is-active', b.dataset.langChoice === I18n.language));
  }

  // =========================================================
  // Dialogs, toast, confetti
  // =========================================================
  function openDialog(sel) {
    const d = $(sel);
    if (!d.open) {
      if (typeof d.showModal === 'function') d.showModal();
      else d.setAttribute('open', '');
    }
  }

  function closeDialog(d) {
    if (typeof d.close === 'function') d.close();
    else d.removeAttribute('open');
  }

  function confirmDialog(title, text) {
    return new Promise((resolve) => {
      const dlg = $('#dlg-confirm');
      $('#confirm-title').textContent = title;
      $('#confirm-text').textContent = text;
      const ok = $('#confirm-ok'), cancel = $('#confirm-cancel');
      const done = (result) => {
        ok.removeEventListener('click', onOk);
        cancel.removeEventListener('click', onCancel);
        dlg.removeEventListener('close', onCancel);
        if (dlg.open) closeDialog(dlg);
        resolve(result);
      };
      const onOk = () => done(true);
      const onCancel = () => done(false);
      ok.addEventListener('click', onOk);
      cancel.addEventListener('click', onCancel);
      dlg.addEventListener('close', onCancel);
      openDialog('#dlg-confirm');
    });
  }

  let toastTimer = 0;
  function toast(msg, ms = 2400) {
    els.toast.textContent = msg;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), ms);
  }

  function confetti() {
    const colors = ['#5fb4f5', '#8fd0ff', '#b4dafb', '#2f8fdc', '#d7edff', '#c3cedc'];
    const frag = document.createDocumentFragment();
    for (let k = 0; k < 90; k++) {
      const p = document.createElement('i');
      const dur = 1.8 + Math.random() * 1.6;
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[k % colors.length];
      p.style.animationDuration = dur + 's';
      p.style.animationDelay = Math.random() * 0.4 + 's';
      p.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px');
      p.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
      p.style.transform = `rotate(${Math.random() * 360}deg)`;
      frag.appendChild(p);
    }
    els.confetti.appendChild(frag);
    setTimeout(() => { els.confetti.innerHTML = ''; }, 4000);
  }

  // =========================================================
  // Statistics dialog
  // =========================================================
  function dailyStreak() {
    const won = new Set(stats.dailyWon);
    const d = new Date();
    if (!won.has(todayKey(d))) d.setDate(d.getDate() - 1);
    let streak = 0;
    while (won.has(todayKey(d))) { streak++; d.setDate(d.getDate() - 1); }
    return streak;
  }

  function renderStats() {
    let played = 0, won = 0;
    for (const k of STAT_KEYS) { played += stats[k].played; won += stats[k].won; }
    const rate = played ? Math.round((won / played) * 100) + '%' : '–';
    $('#stats-summary').innerHTML = `
      <div><b>${won}</b><span>${t('stats.won')}</span></div>
      <div><b>${rate}</b><span>${t('stats.winRate')}</span></div>
      <div><b>${dailyStreak()}</b><span>${t('stats.dailyStreak')}</span></div>`;

    const rows = STAT_KEYS.map((k) => {
      const s = stats[k];
      const avg = s.won ? formatTime(s.total / s.won) : '–';
      const best = s.best ? formatTime(s.best) : '–';
      return `<tr><th scope="row">${t('mode.' + k)}</th><td>${s.played}</td><td>${s.won}</td><td>${best}</td><td>${avg}</td></tr>`;
    }).join('');
    $('#stats-table').innerHTML = `
      <thead><tr><th></th><th>${t('stats.played')}</th><th>${t('stats.won')}</th><th>${t('stats.best')}</th><th>${t('stats.avg')}</th></tr></thead>
      <tbody>${rows}</tbody>`;
  }

  // =========================================================
  // Settings dialog
  // =========================================================
  function syncSettingsForm() {
    $$('[data-setting]').forEach((input) => { input.checked = !!settings[input.dataset.setting]; });
    applyTheme();
  }

  // =========================================================
  // Wiring
  // =========================================================
  function bindEvents() {
    document.addEventListener('keydown', onKeyDown);

    $$('.modes .seg').forEach((b) => b.addEventListener('click', () => onModeClick(b.dataset.mode)));

    els.undoBtn.addEventListener('click', undo);
    els.eraseBtn.addEventListener('click', erase);
    els.notesBtn.addEventListener('click', toggleNotesMode);
    els.hintBtn.addEventListener('click', giveHint);
    els.pauseBtn.addEventListener('click', () => setPaused(!paused));
    $('#btn-resume').addEventListener('click', () => setPaused(false));

    $('#btn-new').addEventListener('click', async () => {
      if (!(await guardProgress())) return;
      newLevelGame(LEVELS.includes(game.mode) ? game.mode : (LEVELS.includes(game.difficulty) ? game.difficulty : 'medium'));
    });
    $('#btn-restart').addEventListener('click', async () => {
      if (hasProgress() && !(await confirmDialog(t('confirm.restartTitle'), t('confirm.restartText')))) return;
      restartGame();
    });

    $('#btn-play-custom').addEventListener('click', playDraft);
    $('#btn-solve').addEventListener('click', solveDraft);
    $('#btn-clear').addEventListener('click', clearDraft);

    $('#win-new').addEventListener('click', () => {
      closeDialog($('#dlg-win'));
      const level = LEVELS.includes(game.mode) ? game.mode : (LEVELS.includes(game.difficulty) ? game.difficulty : 'medium');
      newLevelGame(level);
    });
    $('#lost-retry').addEventListener('click', () => { closeDialog($('#dlg-lost')); restartGame(); });
    $('#lost-new').addEventListener('click', () => {
      closeDialog($('#dlg-lost'));
      newLevelGame(LEVELS.includes(game.difficulty) ? game.difficulty : 'medium');
    });

    // Top bar
    $('#btn-help').addEventListener('click', () => openDialog('#dlg-help'));
    $('#btn-stats').addEventListener('click', () => { renderStats(); openDialog('#dlg-stats'); });
    $('#btn-settings').addEventListener('click', () => { syncSettingsForm(); openDialog('#dlg-settings'); });
    $('#btn-theme').addEventListener('click', () => {
      settings.theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
      saveSettings();
      applyTheme();
    });
    $('#btn-lang').addEventListener('click', () => {
      settings.lang = I18n.language === 'pl' ? 'en' : 'pl';
      saveSettings();
      renderAll();
    });

    // Settings form
    $$('[data-setting]').forEach((input) => input.addEventListener('change', () => {
      settings[input.dataset.setting] = input.checked;
      saveSettings();
      render();
    }));
    $$('[data-theme-choice]').forEach((b) => b.addEventListener('click', () => {
      settings.theme = b.dataset.themeChoice;
      saveSettings();
      applyTheme();
    }));
    $$('[data-lang-choice]').forEach((b) => b.addEventListener('click', () => {
      settings.lang = b.dataset.langChoice;
      saveSettings();
      renderAll();
    }));
    if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', applyTheme);

    $('#stats-reset').addEventListener('click', async () => {
      closeDialog($('#dlg-stats'));
      if (await confirmDialog(t('stats.reset'), t('stats.resetConfirm'))) {
        stats = normalizeStats({});
        saveStats();
        render();
      }
    });

    // Dialog closing: [data-close] buttons and clicks on the backdrop.
    $$('dialog').forEach((d) => {
      d.addEventListener('click', (e) => {
        if (e.target.closest('[data-close]')) closeDialog(d);
        else if (e.target === d && !['dlg-win', 'dlg-lost'].includes(d.id)) closeDialog(d);
      });
    });

    // Auto-pause when the tab is hidden; always save.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        if (isPlaying() && game.history.length) setPaused(true);
        saveGame();
      }
    });
    window.addEventListener('pagehide', saveGame);
  }

  async function onModeClick(mode) {
    if (mode === 'create') {
      view = 'create';
      selected = -1;
      highlightDigit = 0;
      paused = false;
      render();
      return;
    }

    // Returning from "Create" to the game that is still in progress.
    const sameGame = game && game.status === 'playing' &&
      (game.mode === mode && (mode !== 'daily' || game.date === todayKey()));
    if (view === 'create' && sameGame) {
      view = 'game';
      selected = -1;
      render();
      return;
    }
    if (mode === 'daily' && sameGame) return;

    if (!(await guardProgress())) return;
    if (mode === 'daily') newDailyGame();
    else newLevelGame(mode);
  }

  // =========================================================
  // Boot
  // =========================================================
  function init() {
    buildBoard();
    buildNumpad();
    bindEvents();

    const saved = store.get(STORAGE.game, null);
    I18n.setLanguage(settings.lang || I18n.detectLanguage());
    if (isValidGame(saved) && saved.status === 'playing') {
      game = Object.assign(createGame(saved), saved);
      renderAll();
    } else if (isValidGame(saved) && LEVELS.includes(saved.difficulty)) {
      newLevelGame(saved.difficulty);
    } else {
      newLevelGame('easy');
    }

    lastTick = performance.now();
    setInterval(tick, 250);

    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => {});
    }
  }

  init();
})();
