/*
 * ============================================================
 *  Bingo Card Generator Pro — print book renderer
 * ============================================================
 *  Pure string building (no DOM): renders a generated set
 *  into print-ready pages — cover, instructions, card pages,
 *  calling cards, master call sheet and cut-out slips.
 *  Used by the browser app (print preview / window.print)
 *  AND by the offline PDF builder (WeasyPrint), so the free
 *  sample and DFY packs look exactly like the tool's output.
 * ============================================================
 */
'use strict';

/* ---------- small helpers ---------- */

function esc(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

var PAPER = {
  letter: { w: '8.5in', h: '11in', label: 'US Letter' },
  a4: { w: '210mm', h: '297mm', label: 'A4' }
};

/* ---------- CSS (single source of truth for book styling) ---------- */

function bookCss(design, opts) {
  var d = design;
  var pageMargin = opts.largePrint ? '10mm' : '12mm';
  return '' +
  '@page { size: ' + PAPER[opts.paper].w + ' ' + PAPER[opts.paper].h + '; margin: ' + pageMargin + '; }' +
  '.bk-page { page-break-after: always; break-after: page; font-family: ' + d.cellFont + '; color: ' + d.cellText + '; }' +
  '.bk-page:last-child { page-break-after: auto; break-after: auto; }' +
  /* cover */
  '.bk-cover { text-align: center; padding-top: 16mm; }' +
  '.bk-cover .cov-frame { border: 3px ' + d.borderStyle + ' ' + d.accent + '; border-radius: ' + d.radius + 'px; padding: 12mm 8mm; background: ' + d.cardBg + '; }' +
  '.bk-cover h1 { font-family: ' + d.headerFont + '; font-size: 34pt; margin: 0 0 4mm; color: ' + d.headerBg + '; }' +
  '.bk-cover h2 { font-family: ' + d.headerFont + '; font-size: 15pt; font-weight: normal; margin: 0 0 8mm; }' +
  '.bk-cover .cov-meta { font-size: 12pt; line-height: 1.9; }' +
  '.bk-cover .cov-inc { margin-top: 7mm; font-size: 11pt; color: ' + d.accent + '; }' +
  '.bk-cover .cov-mini { width: 92mm; margin: 8mm auto 0; }' +
  '.bk-cover .cov-mini table { table-layout: fixed; }' +
  /* the cover miniature gets a compact type scale so words
     never crush letter-by-letter at thumbnail size */
  '.bk-cover .cov-mini .bcard { padding: 2mm; }' +
  '.bk-cover .cov-mini .bc-head { font-size: 8.5pt; padding: 1mm; margin: -2mm -2mm 1.5mm; }' +
  '.bk-cover .cov-mini .bc-head .bc-set { display: none; }' +
  '.bk-cover .cov-mini td { padding: 0.3mm; }' +
  '.bk-cover .cov-mini .cell-word { font-size: 5.9pt; }' +
  '.bk-cover .cov-mini .cell-num { font-size: 7.5pt; }' +
  '.bk-cover .cov-mini .cell-emoji { font-size: 10pt; }' +
  '.bk-cover .cov-mini .cell-piclabel { font-size: 5.5pt; }' +
  '.bk-cover .cov-mini .bc-foot, .cov-mini .bc-id { font-size: 5.5pt; }' +
  '.bk-cover .cov-biz { margin-top: 9mm; font-size: 10pt; letter-spacing: 1px; }' +
  /* instructions */
  '.bk-inst h2 { font-family: ' + d.headerFont + '; color: ' + d.headerBg + '; font-size: 19pt; margin: 0 0 4mm; }' +
  '.bk-inst h3 { font-family: ' + d.headerFont + '; font-size: 13pt; margin: 6mm 0 2mm; }' +
  '.bk-inst p, .bk-inst li { font-size: 11.5pt; line-height: 1.55; }' +
  '.bk-inst ul { margin: 0 0 2mm 6mm; padding: 0; }' +
  '.bk-pattern { display: inline-block; border: 2px solid ' + d.accent + '; border-radius: ' + d.radius + 'px; padding: 3mm 5mm; margin-top: 2mm; }' +
  /* card pages */
  '.bk-cards { display: flex; flex-wrap: wrap; gap: 6mm; justify-content: center; align-content: flex-start; }' +
  '.bk-cards.per1 .bcard { width: 96%; }' +
  '.bk-cards.per2 .bcard { width: 80%; }' +
  '.bk-cards.per4 .bcard { width: 47%; }' +
  '.bk-cards.per6 .bcard { width: 47%; }' +
  '.bk-cards.large.per1 .bcard { width: 100%; }' +
  /* a single bingo card */
  '.bcard { background: ' + d.cardBg + '; border: 2.5px solid ' + d.cellBorder + '; border-radius: ' + d.radius + 'px; padding: 3mm; box-sizing: border-box; ' + (opts.cutMarks ? 'outline: 1px dashed #999; outline-offset: 2.2mm;' : '') + ' }' +
  '.bcard .bc-head { background: ' + d.headerBg + '; color: ' + d.headerText + '; font-family: ' + d.headerFont + '; text-align: center; border-radius: ' + Math.max(2, d.radius - 3) + 'px; padding: 1.6mm 2mm; margin-bottom: 2.4mm; }' +
  '.bcard .bc-title { font-size: 13pt; font-weight: bold; line-height: 1.15; }' +
  '.bcard .bc-sub { font-size: 8.5pt; opacity: .85; }' +
  '.bcard table { border-collapse: collapse; width: 100%; table-layout: fixed; }' +
  '.bcard td { border: 1.6px solid ' + d.cellBorder + '; text-align: center; vertical-align: middle; padding: 1mm; overflow: hidden; }' +
  '.bcard tr td:nth-child(odd) { background: ' + d.cellBg + '; }' +
  '.bcard tr td:nth-child(even) { background: ' + d.cellAlt + '; }' +
  '.bcard .cell-word { font-size: 10pt; line-height: 1.15; word-wrap: break-word; }' +
  '.bcard .cell-emoji { font-size: 17pt; line-height: 1.1; }' +
  '.bcard .cell-piclabel { font-size: 7.5pt; line-height: 1.1; }' +
  '.bcard .cell-num { font-size: 14pt; font-weight: bold; }' +
  '.bcard .cell-free { background: ' + d.freeBg + ' !important; font-weight: bold; font-size: 9.5pt; }' +
  '.bcard .bc-letters td { background: ' + d.headerBg + '; color: ' + d.headerText + '; font-family: ' + d.headerFont + '; font-weight: bold; font-size: 13pt; border-color: ' + d.cellBorder + '; }' +
  '.bcard .bc-foot { display: flex; justify-content: space-between; font-size: 7.5pt; margin-top: 1.8mm; opacity: .75; }' +
  '.bk-cards.large .bcard .cell-word { font-size: 13pt; }' +
  '.bk-cards.large .bcard .cell-emoji { font-size: 23pt; }' +
  '.bk-cards.large .bcard .cell-num { font-size: 19pt; }' +
  '.bk-cards.large .bcard .bc-title { font-size: 16pt; }' +
  /* 90-ball tickets */
  '.bk-strip { display: flex; flex-direction: column; gap: 1.6mm; }' +
  /* compact tickets so a full strip of 6 fits one page
     (real UK strip books use the same tight pitch) */
  '.bk-strip .bcard { padding: 1.5mm; }' +
  '.bk-strip .bc-head { font-size: 9pt; padding: 0.6mm 2mm; margin: -1.5mm -1.5mm 1mm; }' +
  '.bk-strip .bc-head .bc-set { font-size: 7pt; }' +
  '.bk-strip td { font-size: 12pt; padding: 0; height: 8.6mm; }' +
  '.bk-strip .bc-foot { font-size: 6.5pt; padding-top: 0.5mm; }' +
  '.bk-strip .bc-id { font-size: 6.5pt; }' +
  '.bcard.ticket td { height: 8.2mm; }' +
  '.bcard.ticket .cell-blank { background: ' + d.cellAlt + '; }' +
  /* calling material */
  '.bk-call h2, .bk-sheet h2 { font-family: ' + d.headerFont + '; color: ' + d.headerBg + '; font-size: 17pt; margin: 0 0 4mm; }' +
  '.bk-callgrid { display: flex; flex-wrap: wrap; gap: 3.5mm; }' +
  '.bk-callitem { width: 30mm; border: 1.6px solid ' + d.cellBorder + '; border-radius: ' + d.radius + 'px; text-align: center; padding: 2.4mm 1mm; background: ' + d.cardBg + '; }' +
  '.bk-callitem .ci-emoji { font-size: 16pt; }' +
  '.bk-callitem .ci-word { font-size: 9.5pt; font-weight: bold; line-height: 1.2; }' +
  '.bk-callitem .ci-n { font-size: 7pt; opacity: .65; }' +
  '.bk-sheet table { border-collapse: collapse; width: 100%; }' +
  '.bk-sheet td { border: 1px solid ' + d.cellBorder + '; font-size: 10.5pt; padding: 1.4mm 2mm; }' +
  '.bk-sheet .tick { width: 8mm; text-align: center; }' +
  '.bk-board { border-collapse: collapse; margin-top: 4mm; }' +
  '.bk-board td { border: 1px solid ' + d.cellBorder + '; width: 8.4mm; height: 7mm; text-align: center; font-size: 9.5pt; }' +
  '.bk-slips { display: flex; flex-wrap: wrap; gap: 0; }' +
  '.bk-slip { width: 42mm; border: 1px dashed #888; text-align: center; padding: 2.6mm 1mm; font-size: 10pt; box-sizing: border-box; }' +
  '.bk-slip .ci-emoji { font-size: 15pt; }' +
  '';
}

/* ---------- card rendering ---------- */

function cellInner(set, opts, v) {
  if (v === -1) return '<div class="cell-free-in">' + esc(opts.freeText || '★ FREE') + '</div>';
  if (set.mode === 'word') return '<div class="cell-word">' + esc(opts.items[v].w) + '</div>';
  if (set.mode === 'picture') {
    var it = opts.items[v];
    if (opts.customImages && opts.customImages[v]) {
      var img = '<img src="' + opts.customImages[v] + '" style="max-width:90%;max-height:11mm" alt="">' ;
      return opts.pictureStyle === 'pic' ? img : img + '<div class="cell-piclabel">' + esc(it.w) + '</div>';
    }
    if (opts.pictureStyle === 'pic') return '<div class="cell-emoji">' + esc(it.e) + '</div>';
    return '<div class="cell-emoji">' + esc(it.e) + '</div><div class="cell-piclabel">' + esc(it.w) + '</div>';
  }
  return '<div class="cell-num">' + v + '</div>';
}

function cardHtml(set, card, opts, design) {
  var title = opts.title || 'BINGO';
  var head = '<div class="bc-head"><div class="bc-title">' + esc(title) + '</div>' +
    (opts.subtitle ? '<div class="bc-sub">' + esc(opts.subtitle) + '</div>' : '') + '</div>';
  var foot = '<div class="bc-foot"><span>Card ' + esc(card.id) + '</span><span>' +
    esc(opts.business || 'Songlap Deals') + '</span></div>';
  var rows = '';
  var r, c;
  if (set.mode === 'ball90') {
    for (r = 0; r < 3; r++) {
      rows += '<tr>';
      for (c = 0; c < 9; c++) {
        var v = card.cells[r * 9 + c];
        rows += v === null
          ? '<td class="cell-blank" data-cell="' + (r * 9 + c) + '">&nbsp;</td>'
          : '<td data-cell="' + (r * 9 + c) + '"><div class="cell-num">' + v + '</div></td>';
      }
      rows += '</tr>';
    }
    return '<div class="bcard ticket">' + head + '<table>' + rows + '</table>' + foot + '</div>';
  }
  var n = set.grid;
  if (set.mode === 'ball75') {
    rows += '<tr class="bc-letters"><td>B</td><td>I</td><td>N</td><td>G</td><td>O</td></tr>';
  }
  for (r = 0; r < n; r++) {
    rows += '<tr>';
    for (c = 0; c < n; c++) {
      var idx = r * n + c;
      var val = card.cells[idx];
      var cls = val === -1 ? ' class="cell-free"' : '';
      rows += '<td data-cell="' + idx + '"' + cls + '>' + cellInner(set, opts, val) + '</td>';
    }
    rows += '</tr>';
  }
  return '<div class="bcard">' + head + '<table>' + rows + '</table>' + foot + '</div>';
}

/* ---------- calling material ---------- */

function callLabel(set, opts, v) {
  if (set.mode === 'word' || set.mode === 'picture') {
    var it = opts.items[v];
    var shown = (opts.useClues && it.c) ? it.c : it.w;
    return { main: shown, emoji: set.mode === 'picture' ? it.e : '', clue: !!(opts.useClues && it.c) };
  }
  if (set.mode === 'ball75') {
    var letter = 'BINGO'[Math.floor((v - 1) / 15)];
    return { main: letter + '-' + v, emoji: '', clue: false };
  }
  return { main: String(v), emoji: '', clue: false };
}

function callingPages(set, opts) {
  var pages = [];
  var seq = set.callOrder;
  /* calling cards (chunked 24 per page) */
  for (var i = 0; i < seq.length; i += 24) {
    var items = seq.slice(i, i + 24).map(function (v, j) {
      var lab = callLabel(set, opts, v);
      return '<div class="bk-callitem"><div class="ci-n">Call ' + (i + j + 1) + '</div>' +
        (lab.emoji ? '<div class="ci-emoji">' + esc(lab.emoji) + '</div>' : '') +
        '<div class="ci-word">' + esc(lab.main) + '</div></div>';
    }).join('');
    pages.push('<div class="bk-page bk-call"><h2>Calling Cards (' + (i + 1) + '–' +
      Math.min(i + 24, seq.length) + ')</h2><div class="bk-callgrid">' + items + '</div></div>');
  }
  /* master call sheet: order table (3 columns of pairs) + ball board */
  var rows = '';
  for (var k = 0; k < seq.length; k += 3) {
    rows += '<tr>';
    for (var m = 0; m < 3; m++) {
      var idx = k + m;
      if (idx < seq.length) {
        var lab2 = callLabel(set, opts, seq[idx]);
        rows += '<td>' + (idx + 1) + '. ' + esc(lab2.main) + '</td><td class="tick">☐</td>';
      } else rows += '<td></td><td class="tick"></td>';
    }
    rows += '</tr>';
  }
  var board = '';
  if (set.mode === 'ball75' || set.mode === 'ball90') {
    var max = set.mode === 'ball75' ? 75 : 90;
    board = '<h3 style="margin-top:6mm">Master board — cross off each number as it is called</h3><table class="bk-board">';
    for (var b = 1; b <= max; b += 10) {
      board += '<tr>';
      for (var q = 0; q < 10 && b + q <= max; q++) board += '<td>' + (b + q) + '</td>';
      board += '</tr>';
    }
    board += '</table>';
  }
  pages.push('<div class="bk-page bk-sheet"><h2>Master Call Sheet — Set ' + esc(set.setId) +
    '</h2><p style="font-size:10pt;margin:0 0 3mm">Call in this exact order. Tick each call as you make it.</p><table>' +
    rows + '</table></div>');
  if (board) {
    pages.push('<div class="bk-page bk-sheet"><h2>Master Board — Set ' + esc(set.setId) + '</h2>' + board + '</div>');
  }
  /* cut-out slips (chunked 40 per page) */
  for (var s2 = 0; s2 < seq.length; s2 += 40) {
    var slips = seq.slice(s2, s2 + 40).map(function (v) {
      var lab3 = callLabel(set, opts, v);
      return '<div class="bk-slip">' + (lab3.emoji ? '<div class="ci-emoji">' + esc(lab3.emoji) + '</div>' : '') +
        esc(lab3.main) + '</div>';
    }).join('');
    pages.push('<div class="bk-page bk-call"><h2>Cut-Out Calling Slips — cut along the dashed lines, draw from a hat</h2><div class="bk-slips">' + slips + '</div></div>');
  }
  return pages;
}

/* ---------- cover + instructions ---------- */

function patternName(patternId) {
  var names = {
    line: 'Any line — a full row, column or diagonal',
    corners: 'Four corners',
    x: 'X — both diagonals',
    blackout: 'Blackout — cover the whole card'
  };
  return names[patternId] || names.line;
}

function coverPage(set, opts) {
  var mini = cardHtml(set, set.cards[0], opts);
  return '<div class="bk-page bk-cover"><div class="cov-frame">' +
    '<div style="font-size:26pt">' + (opts.coverEmoji || '🎉') + '</div>' +
    '<h1>' + esc(opts.title || 'Bingo') + '</h1>' +
    '<h2>' + esc(opts.formatName || '') + '</h2>' +
    '<div class="cov-meta">' + set.cards.length + ' unique cards · Set ' + esc(set.setId) + '<br>' +
    'Winning pattern: ' + esc(patternName(opts.pattern)) + '<br>' +
    'Paper: ' + PAPER[opts.paper].label + ' · Print at 100% scale</div>' +
    '<div class="cov-inc">INCLUDES: ' + set.cards.length + ' bingo cards · calling cards · master call sheet · cut-out calling slips · how-to-play page</div>' +
    '<div class="cov-mini">' + mini + '</div>' +
    '<div class="cov-biz">' + esc(opts.business || 'Songlap Deals') + '</div>' +
    '</div></div>';
}

function instructionsPage(set, opts) {
  return '<div class="bk-page bk-inst"><h2>How to Play</h2>' +
    '<p><strong>Set ' + esc(set.setId) + '</strong> · ' + set.cards.length + ' cards · ' + esc(opts.formatName || '') + '</p>' +
    '<h3>You need</h3><ul><li>One printed card per player (this pack)</li>' +
    '<li>Markers: coins, beans, buttons or a pen to cross off squares</li>' +
    '<li>The calling cards or cut-out slips from this pack, and one caller</li></ul>' +
    '<h3>Playing</h3><ul><li>The caller draws/calls one item at a time, in the order on the Master Call Sheet.</li>' +
    '<li>Players cover the matching square on their card. The centre ★ is free — it counts as covered.</li>' +
    '<li>The first player to complete the winning pattern shouts <strong>BINGO!</strong></li>' +
    '<li>Check the winning card: its Card ID and the called items on the Master Call Sheet prove the win.</li></ul>' +
    '<div class="bk-pattern"><strong>Winning pattern for this game:</strong> ' + esc(patternName(opts.pattern)) + '</div>' +
    '<h3>Printing tips</h3><ul><li>Print at 100% scale (do not “fit to page”).</li>' +
    '<li>Card stock or laminated cards last for many games.</li>' +
    '<li>Use the Ink Saver design for cheap classroom/church photocopying.</li></ul>' +
    '<p style="margin-top:6mm;font-size:10pt">Made with Bingo Card Generator Pro · ' + esc(opts.business || 'Songlap Deals') + '</p></div>';
}

/* ---------- whole book ---------- */

/*
 * buildBook(set, opts) -> { html, pageCount }
 * opts: design-resolved fields come via bookCss; here opts =
 * { title, subtitle, business, formatName, coverEmoji, paper,
 *   perPage (1/2/4/6), largePrint, cover (bool), pattern,
 *   items, pictureStyle, useClues, customImages, freeText }
 */
function buildBook(set, opts) {
  var pages = [];
  if (opts.cover !== false) pages.push(coverPage(set, opts));
  pages.push(instructionsPage(set, opts));

  if (set.mode === 'ball90') {
    /* one complete 6-ticket strip per page — never split */
    for (var i = 0; i < set.cards.length; i += 6) {
      var tickets = set.cards.slice(i, i + 6).map(function (card) {
        return cardHtml(set, card, opts);
      }).join('');
      pages.push('<div class="bk-page"><div class="bk-strip">' + tickets + '</div></div>');
    }
  } else {
    var per = opts.perPage || 2;
    for (var j = 0; j < set.cards.length; j += per) {
      var chunk = set.cards.slice(j, j + per).map(function (card) {
        return cardHtml(set, card, opts);
      }).join('');
      pages.push('<div class="bk-page"><div class="bk-cards per' + per +
        (opts.largePrint ? ' large' : '') + '">' + chunk + '</div></div>');
    }
  }

  callingPages(set, opts).forEach(function (p) { pages.push(p); });
  return { html: pages.join('\n'), pageCount: pages.length };
}

var BingoBook = {
  esc: esc,
  PAPER: PAPER,
  bookCss: bookCss,
  cardHtml: cardHtml,
  callLabel: callLabel,
  buildBook: buildBook,
  patternName: patternName
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BingoBook;
}
