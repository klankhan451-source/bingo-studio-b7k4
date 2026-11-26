/*
 * ============================================================
 *  Bingo Card Generator Pro — core engine (pure logic)
 * ============================================================
 *  No DOM access in this file: everything here is deterministic
 *  and unit-testable in Node (see tests/). The same seed +
 *  settings always regenerate the exact same set — that is
 *  what makes reprints and the Card Checker possible.
 *
 *  Modes:
 *   - 'word'    : grid (3x3 / 4x4 / 5x5) of words from a pool
 *   - 'picture' : same grid, cells carry { word, emoji }
 *   - 'ball75'  : US 75-ball, 5x5, B/I/N/G/O column ranges
 *   - 'ball90'  : UK 90-ball tickets, 3 rows x 9 cols, built in
 *                 proper 6-ticket strips covering 1..90 once
 * ============================================================
 */
'use strict';

/* ---------------- seeded RNG ---------------- */

/* xmur3-style string hash -> 32-bit int */
function hashSeedString(str) {
  var h = 1779033703 ^ str.length;
  for (var i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/* mulberry32 PRNG */
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeRng(seedString) {
  return mulberry32(hashSeedString(String(seedString)));
}

function rngInt(rng, n) { return Math.floor(rng() * n); }

function shuffle(arr, rng) {
  var a = arr.slice();
  for (var i = a.length - 1; i > 0; i--) {
    var j = rngInt(rng, i + 1);
    var t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

function sample(arr, n, rng) {
  return shuffle(arr, rng).slice(0, n);
}

/* Short readable set id from a seed, e.g. "K7P2X" */
function setIdFromSeed(seed) {
  var h = hashSeedString('setid:' + seed);
  var chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  var out = '';
  for (var i = 0; i < 5; i++) { out += chars[h % 32]; h = Math.floor(h / 32) + i * 7919; }
  return out;
}

function cardId(setId, index) {
  var n = String(index + 1);
  while (n.length < 3) n = '0' + n;
  return setId + '-' + n;
}

/* ---------------- word / picture grids ---------------- */

function generateGridCards(cfg, rng) {
  var grid = cfg.grid;                       // 3, 4 or 5
  var cellsPerCard = grid * grid;
  var poolSize = cfg.items.length;
  var free = !!cfg.freeSpace && grid % 2 === 1;
  var centre = Math.floor(cellsPerCard / 2);
  var needed = free ? cellsPerCard - 1 : cellsPerCard;
  if (poolSize < needed) {
    throw new Error('pool_too_small');
  }
  var seen = {};
  var cards = [];
  var guard = 0;
  while (cards.length < cfg.count) {
    if (++guard > cfg.count * 200 + 1000) throw new Error('uniqueness_failed');
    var picks = sample(cfg.items.map(function (_, i) { return i; }), needed, rng);
    var cells = [];
    var p = 0;
    for (var i = 0; i < cellsPerCard; i++) {
      if (free && i === centre) cells.push(-1);       // -1 = free space
      else cells.push(picks[p++]);
    }
    var key = cells.join(',');
    if (seen[key]) continue;
    seen[key] = true;
    cards.push(cells);
  }
  return cards;
}

/* ---------------- 75-ball ---------------- */

var BALL75_RANGES = [[1, 15], [16, 30], [31, 45], [46, 60], [61, 75]];

function generate75Cards(cfg, rng) {
  var seen = {};
  var cards = [];
  var guard = 0;
  while (cards.length < cfg.count) {
    if (++guard > cfg.count * 200 + 1000) throw new Error('uniqueness_failed');
    var cols = BALL75_RANGES.map(function (r) {
      var nums = [];
      for (var n = r[0]; n <= r[1]; n++) nums.push(n);
      return sample(nums, 5, rng);                    // order = top..bottom
    });
    var cells = [];
    for (var row = 0; row < 5; row++) {
      for (var col = 0; col < 5; col++) {
        if (cfg.freeSpace && row === 2 && col === 2) cells.push(-1);
        else cells.push(cols[col][row]);
      }
    }
    var key = cells.join(',');
    if (seen[key]) continue;
    seen[key] = true;
    cards.push(cells);
  }
  return cards;
}

/* ---------------- 90-ball (proper UK strips) ---------------- */

var BALL90_RANGES = [[1, 9], [10, 19], [20, 29], [30, 39], [40, 49],
                     [50, 59], [60, 69], [70, 79], [80, 90]];

/*
 * counts[c][t] = how many numbers column c contributes to
 * ticket t. Every count is 1 or 2; each column sums to its
 * range size (9, 10 x7, 11) and each ticket sums to 15.
 */
function stripCounts(rng) {
  var colTotals = BALL90_RANGES.map(function (r) { return r[1] - r[0] + 1; });
  for (var attempt = 0; attempt < 500; attempt++) {
    var counts = [];
    var colNeed = [];
    var t;
    for (var c = 0; c < 9; c++) {
      counts.push([1, 1, 1, 1, 1, 1]);
      colNeed.push(colTotals[c] - 6);
    }
    var ticketNeed = [6, 6, 6, 6, 6, 6];
    var stuck = false;
    while (colNeed.some(function (n) { return n > 0; })) {
      var cols = [];
      colNeed.forEach(function (n, ci) { if (n > 0) cols.push(ci); });
      var cc = cols[rngInt(rng, cols.length)];
      var candidates = [];
      for (t = 0; t < 6; t++) {
        if (ticketNeed[t] > 0 && counts[cc][t] === 1) candidates.push(t);
      }
      if (!candidates.length) { stuck = true; break; }
      var tt = candidates[rngInt(rng, candidates.length)];
      counts[cc][tt] = 2;
      colNeed[cc]--; ticketNeed[tt]--;
    }
    if (stuck) continue;
    if (ticketNeed.some(function (n) { return n !== 0; })) continue;
    return counts;
  }
  throw new Error('strip_counts_failed');
}

/*
 * For one ticket: given its 9 column counts (each 1..2, sum 15),
 * choose which rows each column fills so every row totals 5.
 * Returns array of 9 arrays of row indexes (ascending).
 */
function ticketPattern(colCounts, rng) {
  for (var attempt = 0; attempt < 4000; attempt++) {
    var rows = [0, 0, 0];
    var placement = [];
    var ok = true;
    for (var c = 0; c < 9; c++) {
      var picked = sample([0, 1, 2], colCounts[c], rng);
      picked.sort();
      placement.push(picked);
      picked.forEach(function (r) { rows[r]++; });
      if (rows.some(function (n) { return n > 5; })) { ok = false; break; }
    }
    if (ok && rows[0] === 5 && rows[1] === 5 && rows[2] === 5) return placement;
  }
  throw new Error('ticket_pattern_failed');
}

/* One full strip: 6 tickets covering 1..90 exactly once. */
function generate90Strip(rng) {
  var counts = stripCounts(rng);
  var tickets = [];
  var t, c, r;
  for (t = 0; t < 6; t++) {
    var colCounts = [];
    for (c = 0; c < 9; c++) colCounts.push(counts[c][t]);
    var placement = ticketPattern(colCounts, rng);
    var cells = new Array(27).fill(null);
    tickets.push({ cells: cells, placement: placement });
  }
  // Deal each column's numbers across the strip's tickets.
  for (c = 0; c < 9; c++) {
    var range = [];
    for (var n = BALL90_RANGES[c][0]; n <= BALL90_RANGES[c][1]; n++) range.push(n);
    var dealt = shuffle(range, rng);
    var pos = 0;
    var order = shuffle([0, 1, 2, 3, 4, 5], rng);
    for (var oi = 0; oi < 6; oi++) {
      t = order[oi];
      var k = counts[c][t];
      var nums = dealt.slice(pos, pos + k).sort(function (a, b) { return a - b; });
      pos += k;
      var rowsPicked = tickets[t].placement[c];   // ascending rows
      for (var j = 0; j < k; j++) {
        r = rowsPicked[j];
        tickets[t].cells[r * 9 + c] = nums[j];     // ascending top..bottom
      }
    }
  }
  return tickets.map(function (tk) { return tk.cells; });
}

function generate90Cards(cfg, rng) {
  var seen = {};
  var cards = [];
  var guard = 0;
  while (cards.length < cfg.count) {
    if (++guard > 500) throw new Error('uniqueness_failed');
    var strip = generate90Strip(rng);
    for (var i = 0; i < strip.length && cards.length < cfg.count; i++) {
      var key = strip[i].map(function (v) { return v === null ? '.' : v; }).join(',');
      if (seen[key]) continue;
      seen[key] = true;
      cards.push(strip[i]);
    }
  }
  return cards;
}

/* ---------------- set generation ---------------- */

/*
 * cfg: {
 *   mode, items (pool for word/picture: [{w, e}]), grid,
 *   freeSpace, count, seed
 * }
 * Returns { setId, seed, mode, grid, cards: [{id, cells}],
 *           callOrder } — callOrder holds pool indexes for
 *           word/picture, or ball numbers for 75/90.
 */
function generateSet(cfg) {
  if (!cfg || !cfg.mode) throw new Error('missing_mode');
  if (!cfg.count || cfg.count < 1 || cfg.count > 500) throw new Error('bad_count');
  var seed = String(cfg.seed == null || cfg.seed === '' ? 'BINGO' : cfg.seed);
  var rng = makeRng(seed + '|' + cfg.mode + '|' + (cfg.grid || '') + '|' +
                     (cfg.freeSpace ? 'F' : '-') + '|' +
                     (cfg.items ? cfg.items.map(function (i) { return i.w; }).join('~') : ''));
  var raw;
  if (cfg.mode === 'word' || cfg.mode === 'picture') raw = generateGridCards(cfg, rng);
  else if (cfg.mode === 'ball75') raw = generate75Cards(cfg, rng);
  else if (cfg.mode === 'ball90') raw = generate90Cards(cfg, rng);
  else throw new Error('unknown_mode');

  var setId = setIdFromSeed(seed);
  var cards = raw.map(function (cells, i) {
    return { id: cardId(setId, i), cells: cells };
  });

  /* The EFFECTIVE free-space flag: an even grid has no centre cell,
     so a requested free space cannot exist there (generateGridCards
     applies the same rule), and 90-ball tickets never have one.
     The book renderer's How-to-Play wording keys off this flag, so
     it must describe the cards as they actually are. */
  var effectiveFree = !!cfg.freeSpace;
  if (cfg.mode === 'word' || cfg.mode === 'picture') {
    effectiveFree = effectiveFree && (cfg.grid % 2 === 1);
  } else if (cfg.mode === 'ball90') {
    effectiveFree = false;
  }

  var callOrder;
  if (cfg.mode === 'word' || cfg.mode === 'picture') {
    callOrder = shuffle(cfg.items.map(function (_, i) { return i; }), rng);
  } else if (cfg.mode === 'ball75') {
    callOrder = shuffle(range(1, 75), rng);
  } else {
    callOrder = shuffle(range(1, 90), rng);
  }

  return {
    setId: setId, seed: seed, mode: cfg.mode,
    grid: cfg.mode === 'ball90' ? 9 : (cfg.mode === 'ball75' ? 5 : cfg.grid),
    freeSpace: effectiveFree,
    cards: cards, callOrder: callOrder
  };
}

function range(a, b) {
  var out = [];
  for (var n = a; n <= b; n++) out.push(n);
  return out;
}

/* ---------------- win checking ---------------- */

/*
 * linesFor(mode, grid) -> array of lines; each line is an array
 * of cell indexes. For ball90 a "line" is one full row of 5.
 */
function linesFor(mode, grid) {
  var lines = [];
  var r, c;
  if (mode === 'ball90') {
    for (r = 0; r < 3; r++) {
      var line = [];
      for (c = 0; c < 9; c++) line.push(r * 9 + c);
      lines.push(line);
    }
    return lines;
  }
  var n = grid; // 3, 4, 5 (word/picture) or 5 (ball75)
  for (r = 0; r < n; r++) {
    var row = [], col = [];
    for (c = 0; c < n; c++) { row.push(r * n + c); col.push(c * n + r); }
    lines.push(row); lines.push(col);
  }
  var d1 = [], d2 = [];
  for (r = 0; r < n; r++) { d1.push(r * n + r); d2.push(r * n + (n - 1 - r)); }
  lines.push(d1); lines.push(d2);
  return lines;
}

/*
 * checkCard(set, card, called) — `called` is a Set (or array) of
 * called values in the same units as the cells (pool indexes
 * for word/picture, ball numbers for 75/90). Free cells (-1)
 * and blanks (null) always count as covered.
 * Returns { lineCount, lines: [lineIdx...], fullHouse }.
 */
function checkCard(set, card, called) {
  var calledSet = called instanceof Set ? called : new Set(called);
  function covered(idx) {
    var v = card.cells[idx];
    if (v === -1 || v === null) return true;
    return calledSet.has(v);
  }
  var lines = linesFor(set.mode, set.grid);
  var won = [];
  lines.forEach(function (line, li) {
    if (line.every(covered)) won.push(li);
  });
  var fullHouse = card.cells.every(function (_, idx) { return covered(idx); });
  return { lineCount: won.length, lines: won, fullHouse: fullHouse };
}

/*
 * earliestWin(set, card) — walk the set's call order and find
 * the first call count at which the card completes a line and
 * a full house. Returns { lineAt: n|null, fullAt: n|null }
 * (1-based call numbers).
 */
function earliestWin(set, card) {
  var called = new Set();
  var lineAt = null, fullAt = null;
  for (var i = 0; i < set.callOrder.length; i++) {
    called.add(set.callOrder[i]);
    var res = checkCard(set, card, called);
    if (lineAt === null && res.lineCount > 0) lineAt = i + 1;
    if (res.fullHouse) { fullAt = i + 1; break; }
  }
  return { lineAt: lineAt, fullAt: fullAt };
}

/* Find a card in a set by its printed Card ID. */
function findCard(set, id) {
  var wanted = String(id || '').trim().toUpperCase();
  for (var i = 0; i < set.cards.length; i++) {
    if (set.cards[i].id.toUpperCase() === wanted) return set.cards[i];
  }
  return null;
}

/* ---------------- custom lists with clues ---------------- */

/*
 * Parse a buyer's pasted list. One item per line; commas also
 * separate items when a line has no pipe. Formats:
 *   word
 *   word | clue        (clue is shown on calling materials
 *                       instead of the word — classroom Q&A)
 *   word | clue | emoji  (optional custom emoji for the tile)
 * Blank lines are skipped; duplicates are dropped (first wins).
 * Returns [{ w, e, c }] with c = '' when no clue was given.
 */
function parseCustomList(text) {
  var items = [];
  var seen = {};
  String(text == null ? '' : text).split(/\r?\n/).forEach(function (line) {
    var parts = line.split('|').map(function (s) { return s.trim(); });
    var chunks;
    if (parts.length > 1) chunks = [parts];
    else chunks = line.split(',').map(function (s) { return [s.trim()]; });
    chunks.forEach(function (p) {
      var w = (p[0] || '').trim();
      if (!w) return;
      var key = w.toLowerCase();
      if (seen[key]) return;
      seen[key] = true;
      items.push({ w: w, c: (p[1] || '').trim(), e: (p[2] || '').trim() });
    });
  });
  return items;
}

/* ---------------- live caller ---------------- */

/*
 * The Live Caller consumes the set's call order one step at a
 * time. This is THE SAME array the printed call sheet and
 * calling cards are rendered from — one source of truth, so
 * the screen caller can never drift from the printed set.
 */
function callerSequence(set) {
  return set.callOrder.slice();
}

/* ---------------- winning patterns ---------------- */

var WIN_PATTERNS = [
  { id: 'line', name: 'Any line (row, column or diagonal)' },
  { id: 'corners', name: 'Four corners' },
  { id: 'x', name: 'X (both diagonals)' },
  { id: 'blackout', name: 'Blackout (full card)' }
];

/* Cell indexes that make up a pattern (playable cells only). */
function patternCells(set, patternId) {
  if (set.mode === 'ball90') {
    // UK tickets play lines / full house; corners & X do not apply.
    return null;
  }
  var n = set.grid;
  if (patternId === 'corners') {
    return [0, n - 1, n * (n - 1), n * n - 1];
  }
  if (patternId === 'x') {
    var cells = [];
    for (var i = 0; i < n; i++) {
      cells.push(i * n + i);
      cells.push(i * n + (n - 1 - i));
    }
    return cells.filter(function (v, idx) { return cells.indexOf(v) === idx; });
  }
  return null; // 'line' and 'blackout' are handled by checkCard
}

/*
 * checkPattern(set, card, called, patternId) ->
 *   { won, applicable } — applicable=false when the pattern
 *   does not exist for this mode (corners/X on 90-ball).
 */
function checkPattern(set, card, called, patternId) {
  var calledSet = called instanceof Set ? called : new Set(called);
  if (patternId === 'blackout') {
    return { won: checkCard(set, card, calledSet).fullHouse, applicable: true };
  }
  if (patternId === 'line' || !patternId) {
    return { won: checkCard(set, card, calledSet).lineCount > 0, applicable: true };
  }
  var cells = patternCells(set, patternId);
  if (!cells) return { won: false, applicable: false };
  var won = cells.every(function (idx) {
    var v = card.cells[idx];
    return v === -1 || v === null || calledSet.has(v);
  });
  return { won: won, applicable: true };
}

var BingoEngine = {
  hashSeedString: hashSeedString,
  makeRng: makeRng,
  shuffle: shuffle,
  sample: sample,
  setIdFromSeed: setIdFromSeed,
  cardId: cardId,
  generateSet: generateSet,
  generate90Strip: generate90Strip,
  BALL75_RANGES: BALL75_RANGES,
  BALL90_RANGES: BALL90_RANGES,
  linesFor: linesFor,
  checkCard: checkCard,
  earliestWin: earliestWin,
  findCard: findCard,
  parseCustomList: parseCustomList,
  callerSequence: callerSequence,
  WIN_PATTERNS: WIN_PATTERNS,
  patternCells: patternCells,
  checkPattern: checkPattern
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BingoEngine;
}
