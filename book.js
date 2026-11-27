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

/* Lighten a #rrggbb hex toward white by f (0 = unchanged, 1 = white).
   Used to tint a design's accent into soft pattern colours. */
function tint(hex, f) {
  var m = /^#?([0-9a-fA-F]{6})$/.exec(String(hex || ''));
  if (!m) return hex;
  var n = parseInt(m[1], 16);
  var mix = function (v) { return Math.round(v + (255 - v) * f); };
  var h = function (v) { var s = v.toString(16); return s.length < 2 ? '0' + s : s; };
  return '#' + h(mix((n >> 16) & 255)) + h(mix((n >> 8) & 255)) + h(mix(n & 255));
}

/* Resolve the design for a book: opts.design when the app/tests
   pass it, else the global designs.js lookup by opts.designId
   (available in the browser), else null (covers fall back to the
   plain defaults). */
function designFor(opts) {
  if (opts && opts.design) return opts.design;
  if (opts && opts.designId && typeof bingoDesignById === 'function') {
    return bingoDesignById(opts.designId);
  }
  return null;
}

/* ---------- cover motifs ----------
 * One decorative treatment per design (motif key on the design
 * preset). The treatment is a deco strip at the top of the cover
 * frame (+ back frame) and/or a frame treatment — all pure CSS,
 * no images. `.cov-deco` is hidden by default; only motifs that
 * define a strip show it. */
function motifCss(d) {
  var m = (d && d.motif) || '';
  if (!m) return '';
  /* F = the cover frame itself; D = the deco strip div inside it.
     (D must target .cov-deco on BOTH covers — an earlier version
     appended ' .cov-deco' only to the second selector, so the
     motif rules styled the whole front frame instead of the strip.) */
  var F = '.bk-cover .cov-frame.motif-' + m + ', .bk-back .back-frame.motif-' + m;
  var D = '.bk-cover .cov-frame.motif-' + m + ' .cov-deco, .bk-back .back-frame.motif-' + m + ' .cov-deco';
  var show = function (bg) {
    return D + ' { display: block; background-color: ' + d.cardBg + '; background-image: ' + bg + '; background-size: 30mm 6mm; background-repeat: repeat-x; }';
  };
  /* r1/r2 are NUMBERS in mm (passing '1.6mm' strings broke the
     transparent stop: '1.6mm' + 0.2 concatenates to '1.6mm0.2'). */
  var dots = function (c1, c2, r1, r2, gap) {
    return 'radial-gradient(circle at 5mm 3mm, ' + c1 + ' ' + r1 + 'mm, transparent ' + (r1 + 0.2) + 'mm), ' +
      'radial-gradient(circle at ' + (5 + gap / 2) + 'mm 2mm, ' + c2 + ' ' + r2 + 'mm, transparent ' + (r2 + 0.2) + 'mm)';
  };
  switch (m) {
    case 'classic':
      return F + ' { border: 3px double ' + d.accent + '; box-shadow: inset 0 0 0 1.5mm ' + d.cardBg + ', inset 0 0 0 2.1mm ' + d.accent + '; }';
    case 'wedding':
      return F + ' { border: 2px double ' + d.cellBorder + '; box-shadow: inset 0 0 0 1.5mm ' + d.cardBg + ', inset 0 0 0 2.1mm ' + d.cellBorder + '; }';
    case 'goldframe':
      return F + ' { border: 2px solid ' + d.accent + '; outline: 1px solid ' + d.accent + '; outline-offset: 2mm; }';
    case 'navy':
      return F + ' { border: 3px double ' + d.accent + '; box-shadow: inset 0 0 0 1.5mm ' + d.cardBg + ', inset 0 0 0 2.1mm ' + d.accent + '; }';
    case 'soiree':
      return F + ' { border: 1px solid ' + d.accent + '; outline: 1px solid ' + d.accent + '; outline-offset: 2.5mm; }';
    case 'glow':
      return F + ' { box-shadow: 0 0 0 2px ' + d.accent + ', 0 0 5mm ' + d.accent + '; }';
    case 'confetti':
      return show(dots(d.accent, d.headerBg, 1.6, 1.3, 22) + ', ' + dots(d.headerBg, d.accent, 1.1, 1.4, 26));
    case 'spring':
      return show(dots(d.accent, d.headerBg, 1.4, 1.2, 22));
    case 'tropical':
      return show(dots(d.accent, d.headerBg, 2.2, 1.6, 24));
    case 'stars':
      return D + ' { display: block; background-color: ' + d.headerBg + '; background-image: ' +
        'radial-gradient(circle at 5mm 2.5mm, ' + d.accent + ' 1.4mm, transparent 1.6mm), ' +
        'radial-gradient(circle at 18mm 4mm, #ffffff 1mm, transparent 1.2mm); background-size: 26mm 6mm; }';
    case 'snow':
      return D + ' { display: block; background-color: ' + d.headerBg + '; background-image: ' +
        'radial-gradient(circle at 5mm 3mm, #ffffff 1.5mm, transparent 1.7mm), ' +
        'radial-gradient(circle at 16mm 2mm, #ffffff 1mm, transparent 1.2mm); background-size: 24mm 6mm; }';
    case 'midnight':
      return D + ' { display: block; background-color: ' + d.headerBg + '; background-image: ' +
        'radial-gradient(circle at 5mm 2.5mm, ' + d.accent + ' 1.5mm, transparent 1.7mm), ' +
        'radial-gradient(circle at 17mm 4mm, #ffffff 1mm, transparent 1.2mm); background-size: 26mm 6mm; }';
    case 'hearts':
      return show(dots(d.accent, d.accent, 1.8, 1.2, 22));
    case 'family':
      return show(dots(d.accent, d.headerBg, 1.6, 1.3, 22));
    case 'safari':
      return D + ' { display: block; background-color: ' + d.cardBg + '; border-bottom: 2px dashed ' + d.accent + '; background-image: ' + dots(d.accent, d.headerBg, 1.6, 1.2, 22) + '; background-size: 26mm 6mm; }';
    case 'gridpaper':
      return D + ' { display: block; background-color: ' + d.cardBg + '; background-image: ' +
        'repeating-linear-gradient(90deg, ' + tint(d.accent, 0.7) + ' 0, ' + tint(d.accent, 0.7) + ' 0.6mm, transparent 0.6mm, transparent 8mm), ' +
        'repeating-linear-gradient(0deg, ' + tint(d.accent, 0.7) + ' 0, ' + tint(d.accent, 0.7) + ' 0.6mm, transparent 0.6mm, transparent 6mm); }';
    case 'gingham':
      return F + ' { background-image: ' +
        'repeating-linear-gradient(0deg, ' + tint(d.accent, 0.82) + ' 0, ' + tint(d.accent, 0.82) + ' 7mm, transparent 7mm, transparent 14mm), ' +
        'repeating-linear-gradient(90deg, ' + tint(d.accent, 0.82) + ' 0, ' + tint(d.accent, 0.82) + ' 7mm, transparent 7mm, transparent 14mm); }' +
        D + ' { display: block; background-color: ' + d.cardBg + '; background-image: ' +
        'repeating-linear-gradient(0deg, ' + tint(d.accent, 0.82) + ' 0, ' + tint(d.accent, 0.82) + ' 7mm, transparent 7mm, transparent 14mm), ' +
        'repeating-linear-gradient(90deg, ' + tint(d.accent, 0.82) + ' 0, ' + tint(d.accent, 0.82) + ' 7mm, transparent 7mm, transparent 14mm); }';
    case 'plaid':
      return F + ' { background-image: ' +
        'repeating-linear-gradient(0deg, ' + tint(d.accent, 0.8) + ' 0, ' + tint(d.accent, 0.8) + ' 1mm, transparent 1mm, transparent 11mm), ' +
        'repeating-linear-gradient(90deg, ' + tint(d.accent, 0.8) + ' 0, ' + tint(d.accent, 0.8) + ' 1mm, transparent 1mm, transparent 11mm); }' +
        D + ' { display: block; background-color: ' + d.headerBg + '; background-image: ' +
        'repeating-linear-gradient(90deg, ' + tint(d.accent, 0.55) + ' 0, ' + tint(d.accent, 0.55) + ' 6mm, transparent 6mm, transparent 12mm); }';
    case 'garland':
      return D + ' { display: block; background-color: ' + d.cardBg + '; background-image: ' +
        'repeating-linear-gradient(90deg, #1E7A4C 0, #1E7A4C 8mm, ' + d.headerBg + ' 8mm, ' + d.headerBg + ' 16mm); }';
    case 'stripes':
      return D + ' { display: block; background-color: ' + d.cardBg + '; background-image: ' +
        'repeating-linear-gradient(45deg, ' + d.accent + ' 0, ' + d.accent + ' 4mm, ' + tint(d.accent, 0.55) + ' 4mm, ' + tint(d.accent, 0.55) + ' 8mm); }';
    case 'bows':
      return D + ' { display: block; background-color: ' + d.cardBg + '; border-bottom: 2px solid ' + d.accent + '; background-image: ' +
        'repeating-linear-gradient(90deg, ' + d.accent + ' 0, ' + d.accent + ' 5mm, transparent 5mm, transparent 11mm); }';
    case 'kraft':
      return D + ' { display: block; background-color: ' + tint(d.accent, 0.75) + '; background-image: ' +
        'repeating-linear-gradient(45deg, ' + d.accent + ' 0, ' + d.accent + ' 1.6mm, transparent 1.6mm, transparent 9mm); }';
    case 'chalk':
      return F + ' { background: ' + d.headerBg + '; color: ' + d.headerText + '; border: 2px dashed ' + d.headerText + '; }' +
        '.bk-cover .cov-frame.motif-chalk h1, .bk-cover .cov-frame.motif-chalk h2, ' +
        '.bk-cover .cov-frame.motif-chalk .cov-meta, .bk-cover .cov-frame.motif-chalk .cov-inc, ' +
        '.bk-cover .cov-frame.motif-chalk .cov-biz, .bk-cover .cov-frame.motif-chalk .cov-sub { color: ' + d.headerText + '; }' +
        '.bk-cover .cov-frame.motif-chalk .cov-badge { background: ' + d.accent + '; color: ' + d.headerBg + '; }' +
        '.bk-cover .cov-frame.motif-chalk .cov-band { background: ' + d.accent + '; color: ' + d.headerBg + '; }' +
        '.bk-back .back-frame.motif-chalk h2, .bk-back .back-frame.motif-chalk h3, ' +
        '.bk-back .back-frame.motif-chalk .back-list, .bk-back .back-frame.motif-chalk .back-how, ' +
        '.bk-back .back-frame.motif-chalk .back-thanks, .bk-back .back-frame.motif-chalk .back-biz, ' +
        '.bk-back .back-frame.motif-chalk .back-teaser { color: ' + d.headerText + '; }' +
        D + ' { display: block; height: 1.5mm; background: repeating-linear-gradient(90deg, ' + d.headerText + ' 0, ' + d.headerText + ' 8mm, transparent 8mm, transparent 13mm); }';
    case 'spooky':
      return D + ' { display: block; background-color: ' + d.cardBg + '; background-image: ' +
        'repeating-linear-gradient(90deg, #ff7a1a 0, #ff7a1a 8mm, #9b7ede 8mm, #9b7ede 16mm); }';
    case 'easter':
      return D + ' { display: block; background-color: ' + d.cardBg + '; background-image: ' +
        'repeating-linear-gradient(90deg, ' + d.accent + ' 0, ' + d.accent + ' 8mm, ' + d.headerBg + ' 8mm, ' + d.headerBg + ' 16mm); }';
    case 'summer':
      return D + ' { display: block; background-color: ' + d.cardBg + '; background-image: ' +
        'repeating-radial-gradient(circle at 50% 130%, ' + d.accent + ' 0, ' + d.accent + ' 2.5mm, transparent 2.5mm, transparent 8mm); }';
    case 'abc':
      return D + ' { display: block; background-color: ' + d.cardBg + '; background-image: ' +
        'repeating-linear-gradient(90deg, #d94f30 0, #d94f30 8mm, #2e86ab 8mm, #2e86ab 16mm, #e8a13a 16mm, #e8a13a 24mm); }';
    case 'americana':
      return D + ' { display: block; background-color: #ffffff; background-image: ' +
        'repeating-linear-gradient(180deg, #B22234 0, #B22234 2mm, #ffffff 2mm, #ffffff 4mm); }';
    case 'scallop':
      return D + ' { display: block; background-color: ' + d.cardBg + '; background-image: ' +
        'radial-gradient(circle at 50% 100%, ' + d.accent + ' 3.5mm, transparent 3.7mm); background-size: 12mm 6mm; background-repeat: repeat-x; }';
    default:
      return '';
  }
}

/* ---------- CSS (single source of truth for book styling) ---------- */

function bookCss(design, opts) {
  var d = design;
  var pageMargin = opts.largePrint ? '10mm' : '12mm';
  return '' +
  '@page { size: ' + PAPER[opts.paper].w + ' ' + PAPER[opts.paper].h + '; margin: ' + pageMargin + '; }' +
  '.bk-page { page-break-after: always; break-after: page; font-family: ' + d.cellFont + '; color: ' + d.cellText + '; }' +
  '.bk-page:last-child { page-break-after: auto; break-after: auto; }' +
  /* cover */
  '.bk-cover { text-align: center; padding: 10mm 6mm 12mm; background: ' + d.pageBg + '; }' +
  '.bk-cover .cov-badge { display: inline-block; background: ' + d.headerBg + '; color: ' + d.headerText + '; font-size: 9.5pt; letter-spacing: 2.5px; padding: 1.8mm 6mm; border-radius: 999px; margin-bottom: 7mm; }' +
  '.bk-cover .cov-emojis { font-size: 17pt; letter-spacing: 5px; margin: 5mm 0 1mm; }' +
  '.bk-cover .cov-sub { font-size: 12.5pt; font-style: italic; margin: -3mm 0 5mm; }' +
  '.bk-cover .cov-minis { display: flex; justify-content: center; gap: 7mm; margin-top: 8mm; }' +
  '.bk-cover .cov-minis .cov-mini { margin: 0; }' +
  '.bk-cover .cov-tilt-l { transform: rotate(-2deg); }' +
  '.bk-cover .cov-tilt-r { transform: rotate(2deg); }' +
  '.bk-cover .cov-band { margin-top: 10mm; background: ' + d.headerBg + '; color: ' + d.headerText + '; font-size: 10.5pt; padding: 3.2mm 5mm; border-radius: ' + d.radius + 'px; white-space: nowrap; overflow: hidden; }' +
  '.bk-cover .cov-frame { border: 3px ' + d.borderStyle + ' ' + d.accent + '; border-radius: ' + d.radius + 'px; padding: 12mm 8mm; background: ' + d.cardBg + '; }' +
  '.bk-cover h1 { font-family: ' + d.headerFont + '; font-size: 34pt; margin: 0 0 4mm; color: ' + d.headerBg + '; }' +
  '.bk-cover h2 { font-family: ' + d.headerFont + '; font-size: 15pt; font-weight: normal; margin: 0 0 8mm; }' +
  '.bk-cover .cov-meta { font-size: 12pt; line-height: 1.9; }' +
  '.bk-cover .cov-inc { margin-top: 7mm; font-size: 11pt; color: ' + d.accent + '; }' +
  '.bk-cover .cov-mini { width: 76mm; margin: 8mm auto 0; }' +
  '.bk-cover .cov-mini.wide { width: 122mm; }' +
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
  /* cover deco strip: hidden unless the design's motif shows one */
  '.bk-cover .cov-deco, .bk-back .cov-deco { display: none; height: 6mm; border-radius: 3mm; margin: 0 0 4mm; }' +
  motifCss(d) +
  /* back cover */
  '.bk-back { text-align: center; padding: 8mm 6mm 8mm; background: ' + d.pageBg + '; }' +
  '.bk-back .back-frame { border: 3px ' + d.borderStyle + ' ' + d.accent + '; border-radius: ' + d.radius + 'px; padding: 8mm 8mm; background: ' + d.cardBg + '; }' +
  '.bk-back h2 { font-family: ' + d.headerFont + '; color: ' + d.headerBg + '; font-size: 18pt; margin: 0 0 3mm; }' +
  '.bk-back h3 { font-family: ' + d.headerFont + '; color: ' + d.headerBg + '; font-size: 13pt; margin: 4mm 0 2mm; }' +
  '.bk-back .back-list { display: inline-block; text-align: left; font-size: 12pt; line-height: 1.7; margin: 0; padding: 0; list-style: none; }' +
  '.bk-back .back-how { font-size: 11.5pt; line-height: 1.65; margin: 0; }' +
  '.bk-back .cov-mini { width: 76mm; margin: 4mm auto 0; }' +
  '.bk-back .cov-mini.wide { width: 122mm; }' +
  '.bk-back .cov-mini table { table-layout: fixed; }' +
  '.bk-back .cov-mini .bcard { padding: 2mm; }' +
  '.bk-back .cov-mini .bc-head { font-size: 8.5pt; padding: 1mm; margin: -2mm -2mm 1.5mm; }' +
  '.bk-back .cov-mini .bc-head .bc-set { display: none; }' +
  '.bk-back .cov-mini td { padding: 0.3mm; }' +
  '.bk-back .cov-mini .cell-word { font-size: 5.9pt; }' +
  '.bk-back .cov-mini .cell-num { font-size: 7.5pt; }' +
  '.bk-back .cov-mini .cell-emoji { font-size: 10pt; }' +
  '.bk-back .cov-mini .cell-piclabel { font-size: 5.5pt; }' +
  '.bk-back .cov-mini .bc-foot, .bk-back .cov-mini .bc-id { font-size: 5.5pt; }' +
  '.bk-balls { display: flex; justify-content: center; gap: 3mm; margin-top: 6mm; }' +
  '.bk-ball { width: 13mm; height: 13mm; border-radius: 50%; color: #ffffff; font-weight: bold; font-size: 10.5pt; line-height: 13mm; text-align: center; }' +
  '.bk-back .back-thanks { margin-top: 5mm; font-size: 14pt; font-family: ' + d.headerFont + '; color: ' + d.headerBg + '; }' +
  '.bk-back .back-biz { margin-top: 1.5mm; font-size: 10pt; letter-spacing: 1px; }' +
  '.bk-back .back-teaser { font-size: 11.5pt; font-style: italic; margin: 0 0 3mm; }' +
  /* barcode zone: a white box, bottom-right, reserved for the
     KDP barcode — the set-ID bars inside are decorative only */
  '.bk-barcode { background: #ffffff; border: 1px solid #999999; border-radius: 2mm; padding: 2mm 4mm 1.5mm; width: 62mm; margin: 4mm 0 0 auto; }' +
  '.bk-barcode .bars { display: flex; justify-content: center; align-items: stretch; height: 10mm; }' +
  '.bk-barcode .bar { background: #1a1a1a; margin-right: 0.55mm; }' +
  '.bk-barcode .bc-label { font-size: 8.5pt; letter-spacing: 2.5px; margin-top: 1.2mm; color: #1a1a1a; }' +
  '.bk-barcode .bc-zone { font-size: 7.5pt; letter-spacing: 2px; color: #666666; margin-top: 1mm; }' +
  /* own-photo cover: the picture bleeds to the paper edges (it is
     offset by exactly the page margin) and the words sit on a
     readable plate near the bottom */
  '.bk-photo-cover { position: relative; height: calc(' + PAPER[opts.paper].h + ' - ' + pageMargin + ' - ' + pageMargin + '); }' +
  '.bk-photo-cover .cov-photo { position: absolute; top: -' + pageMargin + '; left: -' + pageMargin + '; width: ' + PAPER[opts.paper].w + '; height: ' + PAPER[opts.paper].h + '; object-fit: cover; }' +
  '.bk-photo-cover .cov-plate { position: absolute; left: 6mm; right: 6mm; bottom: 10mm; background: rgba(255,255,255,0.9); border-radius: ' + d.radius + 'px; padding: 6mm 5mm 5mm; text-align: center; }' +
  '.bk-photo-cover .cov-badge { display: inline-block; background: ' + d.headerBg + '; color: ' + d.headerText + '; font-size: 9.5pt; letter-spacing: 2.5px; padding: 1.8mm 6mm; border-radius: 999px; margin-bottom: 4mm; }' +
  '.bk-photo-cover h1 { font-family: ' + d.headerFont + '; font-size: 30pt; margin: 0 0 2mm; color: ' + d.headerBg + '; }' +
  '.bk-photo-cover h2 { font-family: ' + d.headerFont + '; font-size: 13.5pt; font-weight: normal; margin: 0 0 3mm; color: ' + d.cellText + '; }' +
  '.bk-photo-cover .cov-sub { font-size: 12pt; font-style: italic; margin: 0 0 3mm; color: ' + d.cellText + '; }' +
  '.bk-photo-cover .cov-meta { font-size: 11pt; line-height: 1.8; color: ' + d.cellText + '; }' +
  '.bk-photo-cover .cov-biz { margin-top: 3mm; font-size: 10pt; letter-spacing: 1px; color: ' + d.cellText + '; }' +
  /* instructions */
  '.bk-inst h2 { font-family: ' + d.headerFont + '; color: ' + d.headerBg + '; font-size: 19pt; margin: 0 0 4mm; }' +
  '.bk-inst h3 { font-family: ' + d.headerFont + '; font-size: 13pt; margin: 6mm 0 2mm; }' +
  '.bk-inst p, .bk-inst li { font-size: 11.5pt; line-height: 1.55; }' +
  '.bk-inst ul { margin: 0 0 2mm 6mm; padding: 0; }' +
  '.bk-pattern { display: inline-block; border: 2px solid ' + d.accent + '; border-radius: ' + d.radius + 'px; padding: 3mm 5mm; margin-top: 2mm; }' +
  '.pat-row { display: flex; gap: 5mm; margin-top: 3mm; }' +
  '.pat-box { text-align: center; border: 1.6px solid ' + d.cellBorder + '; border-radius: ' + d.radius + 'px; padding: 2.5mm 3mm; background: ' + d.cardBg + '; }' +
  '.pat-box.chosen { border: 2.4px solid ' + d.accent + '; }' +
  '.pat-grid { border-collapse: collapse; margin: 0 auto; }' +
  '.pat-grid td { width: 3.4mm; height: 3.4mm; border: 0.7px solid ' + d.cellBorder + '; background: ' + d.cellAlt + '; padding: 0; }' +
  '.pat-grid td.on { background: ' + d.accent + '; }' +
  '.pat-name { font-size: 8.5pt; margin-top: 1.6mm; }' +
  '.pat-box.chosen .pat-name { font-weight: bold; }' +
  /* printable markers */
  '.bk-chips-wrap { display: flex; flex-wrap: wrap; gap: 4mm; justify-content: center; margin-top: 5mm; }' +
  '.bk-chip { width: 18mm; height: 18mm; border: 1.4px dashed #888; border-radius: 50%; background: ' + d.cardBg + '; text-align: center; }' +
  '.bk-chip span { font-size: 13pt; line-height: 18mm; }' +
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
  /* 6-per-page puts THREE rows of cards on one page. At the normal
     card scale the third row can spill onto the next printed page
     (tall designs, picture labels, large print, long words), which
     silently breaks the announced page count — so per-page-6 cards
     get a compact scale that always fits three rows. */
  '.bk-cards.per6 .bcard { padding: 2mm; }' +
  '.bk-cards.per6 .bc-head { padding: 1mm 1.5mm; margin-bottom: 1.5mm; }' +
  '.bk-cards.per6 .bc-title { font-size: 10.5pt; }' +
  '.bk-cards.per6 .bc-sub { font-size: 7pt; }' +
  '.bk-cards.per6 td { padding: 0.4mm; }' +
  '.bk-cards.per6 .cell-word { font-size: 8pt; }' +
  '.bk-cards.per6 .cell-num { font-size: 11pt; }' +
  '.bk-cards.per6 .cell-emoji { font-size: 13pt; }' +
  '.bk-cards.per6 .cell-piclabel { font-size: 6pt; }' +
  '.bk-cards.per6 .bc-foot { font-size: 6.5pt; margin-top: 1.2mm; }' +
  '.bk-cards.per6.large .bcard .cell-word { font-size: 8.5pt; }' +
  '.bk-cards.per6.large .bcard .cell-emoji { font-size: 14pt; }' +
  '.bk-cards.per6.large .bcard .cell-num { font-size: 12pt; }' +
  '.bk-cards.per6.large .bcard .bc-title { font-size: 11pt; }' +
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

/* True when another item in the pool uses the SAME picture for a
   DIFFERENT word — in picture-only style those two squares would be
   indistinguishable on a card, so the word label must be shown for
   those items even in picture-only mode. */
function emojiIsAmbiguous(items, it) {
  if (!it.e) return false;
  for (var i = 0; i < items.length; i++) {
    if (items[i].e === it.e && items[i].w !== it.w) return true;
  }
  return false;
}

function cellInner(set, opts, v) {
  if (v === -1) return '<div class="cell-free-in">' + esc(opts.freeText || '★ FREE') + '</div>';
  if (set.mode === 'word') return '<div class="cell-word">' + esc(opts.items[v].w) + '</div>';
  if (set.mode === 'picture') {
    var it = opts.items[v];
    if (opts.customImages && opts.customImages[v]) {
      var img = '<img src="' + opts.customImages[v] + '" style="max-width:90%;max-height:11mm" alt="">' ;
      return opts.pictureStyle === 'pic' ? img : img + '<div class="cell-piclabel">' + esc(it.w) + '</div>';
    }
    if (opts.pictureStyle === 'pic') {
      /* Picture-only must never print a blank, ambiguous or
         unreadable square: an item with no picture falls back to
         its word; an item whose picture is shared with a different
         word in the pool keeps its label so players can tell the
         squares apart; and an item flagged 'label' in the theme
         data — its emoji is the closest available but does not
         read as the word by itself (e.g. 🍃 Holly, 🏠 Chimney) —
         keeps its label too. */
      if (!it.e) return '<div class="cell-word">' + esc(it.w) + '</div>';
      if (emojiIsAmbiguous(opts.items, it) || it.label) {
        return '<div class="cell-emoji">' + esc(it.e) + '</div><div class="cell-piclabel">' + esc(it.w) + '</div>';
      }
      return '<div class="cell-emoji">' + esc(it.e) + '</div>';
    }
    return '<div class="cell-emoji">' + esc(it.e) + '</div><div class="cell-piclabel">' + esc(it.w) + '</div>';
  }
  return '<div class="cell-num">' + v + '</div>';
}

function cardHtml(set, card, opts, design) {
  var title = opts.title || 'BINGO';
  var head = '<div class="bc-head"><div class="bc-title">' + esc(title) + '</div>' +
    (opts.subtitle ? '<div class="bc-sub">' + esc(opts.subtitle) + '</div>' : '') + '</div>';
  var foot = '<div class="bc-foot"><span>' + (set.mode === 'ball90' ? 'Ticket ' : 'Card ') + esc(card.id) + '</span><span>' +
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
    board = '<h3 style="margin-top:6mm">Cross off each number as it is called</h3><table class="bk-board">';
    for (var b = 1; b <= max; b += 10) {
      board += '<tr>';
      for (var q = 0; q < 10 && b + q <= max; q++) board += '<td>' + (b + q) + '</td>';
      board += '</tr>';
    }
    board += '</table>';
  }
  pages.push('<div class="bk-page bk-sheet"><h2>Master Call Sheet — Set ' + esc(set.setId) +
    '</h2><p style="font-size:10pt;margin:0 0 3mm">This set’s shuffled call order — tick each call as you make it (or tick here while drawing the cut-out slips from a hat).</p><table>' +
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

/* Short definition of each winning pattern (back cover). */
function patternDef(patternId) {
  var defs = {
    line: 'complete any full row, column or diagonal',
    corners: 'cover the four corner squares',
    x: 'complete both diagonals (an X)',
    blackout: 'cover the whole card'
  };
  return defs[patternId] || defs.line;
}

function coverEmojiStrip(set, opts) {
  if (set.mode === 'ball75') return '🔵 🔴 🟢 🟡 🟣 🟠';
  if (set.mode === 'ball90') return '🎱 🎟️ 🎱 🎟️ 🎱 🎟️';
  var seen = {}, out = [];
  (opts.items || []).forEach(function (it) {
    if (it.e && !seen[it.e] && out.length < 8) { seen[it.e] = 1; out.push(it.e); }
  });
  return out.length >= 3 ? out.join(' ') : '🎉 🎊 ⭐ 🎈 🎁';
}

/* Personalisation lines for the cover meta: "Created for" name
   and event date, printed only when the buyer filled them in. */
function coverPersonalLines(opts) {
  var out = '';
  if (opts.createdFor) out += '<br>Created for: ' + esc(opts.createdFor);
  if (opts.eventDate) out += '<br>' + esc(opts.eventDate);
  return out;
}

function coverPage(set, opts) {
  /* 90-ball packs sell tickets in strips, not cards — every
     "card" word on the cover must say "ticket" for ball90. */
  var unitWord = set.mode === 'ball90' ? 'tickets' : 'cards';
  var dg = designFor(opts);
  var badge = dg && dg.badge ? dg.badge : '★ PRINTABLE BINGO GAME PACK ★';
  /* Buyer's own picture: full-bleed photo cover with a title plate.
     The designed cover below renders exactly as before when no
     picture is set. */
  if (opts.coverImage) {
    return '<div class="bk-page bk-photo-cover">' +
      '<img class="cov-photo" src="' + opts.coverImage + '" alt="">' +
      '<div class="cov-plate">' +
      '<div><span class="cov-badge">' + esc(badge) + '</span></div>' +
      '<h1>' + esc(opts.title || 'Bingo') + '</h1>' +
      '<h2>' + esc(opts.formatName || '') + '</h2>' +
      (opts.subtitle ? '<div class="cov-sub">' + esc(opts.subtitle) + '</div>' : '') +
      '<div class="cov-meta">' + set.cards.length + ' unique ' + unitWord + ' · Set ' + esc(set.setId) + '<br>' +
      'Paper: ' + PAPER[opts.paper].label + ' · Print at 100% scale' + coverPersonalLines(opts) + '</div>' +
      '<div class="cov-biz">' + esc(opts.business || 'Songlap Deals') + '</div>' +
      '</div></div>';
  }
  var inc = set.cards.length + (set.mode === 'ball90' ? ' tickets' : ' bingo cards') + ' · calling cards · master call sheet' +
    (set.mode === 'ball75' || set.mode === 'ball90' ? ' · master board' : '') +
    ' · cut-out calling slips · how-to-play page' +
    (opts.markers ? ' · printable markers' : '');
  var minis;
  if (set.mode === 'ball90') {
    minis = '<div class="cov-mini wide">' + cardHtml(set, set.cards[0], opts) + '</div>';
  } else {
    minis = '<div class="cov-minis">' +
      '<div class="cov-mini cov-tilt-l">' + cardHtml(set, set.cards[0], opts) + '</div>' +
      (set.cards[1] ? '<div class="cov-mini cov-tilt-r">' + cardHtml(set, set.cards[1], opts) + '</div>' : '') +
      '</div>';
  }
  /* The design's own badge / emoji / bottom strip; ball modes keep
     their own big emoji (🔵 / 🎟️), word & picture modes use the
     design's emoji. No design → the plain defaults. */
  var motifCls = dg && dg.motif ? ' motif-' + dg.motif : '';
  var bigEmoji = (set.mode === 'ball75' || set.mode === 'ball90')
    ? (opts.coverEmoji || '🎉')
    : (dg && dg.emoji ? dg.emoji : (opts.coverEmoji || '🎉'));
  var band = dg && dg.band ? dg.band
    : 'You need: a printer · scissors · coins, beans or markers to cover your ' + (set.mode === 'ball90' ? 'numbers' : 'squares');
  return '<div class="bk-page bk-cover"><div class="cov-frame' + motifCls + '">' +
    '<div class="cov-deco"></div>' +
    '<div><span class="cov-badge">' + esc(badge) + '</span></div>' +
    '<div style="font-size:26pt">' + bigEmoji + '</div>' +
    '<h1>' + esc(opts.title || 'Bingo') + '</h1>' +
    '<h2>' + esc(opts.formatName || '') + '</h2>' +
    (opts.subtitle ? '<div class="cov-sub">' + esc(opts.subtitle) + '</div>' : '') +
    '<div class="cov-emojis">' + coverEmojiStrip(set, opts) + '</div>' +
    '<div class="cov-meta">' + set.cards.length + ' unique ' + unitWord + ' · Set ' + esc(set.setId) + '<br>' +
    (set.mode === 'ball90'
      ? 'Winning patterns: One line · Two lines · Full house<br>'
      : 'Winning pattern: ' + esc(patternName(opts.pattern)) + '<br>') +
    'Paper: ' + PAPER[opts.paper].label + ' · Print at 100% scale' + coverPersonalLines(opts) + '</div>' +
    '<div class="cov-inc">INCLUDES: ' + inc + '</div>' +
    minis +
    '<div class="cov-band">' + esc(band) + '</div>' +
    '<div class="cov-biz">' + esc(opts.business || 'Songlap Deals') + '</div>' +
    '</div></div>';
}

/* ---------- back cover ---------- */

/* Decorative barcode-style block: bar widths are derived from the
   set ID, so every set's back cover carries its own "barcode". */
function barcodeHtml(set) {
  var seedStr = String(set.setId || 'BINGO');
  var widths = [0.5, 0.9, 1.4];
  var bars = '';
  for (var i = 0; i < 34; i++) {
    var code = seedStr.charCodeAt(i % seedStr.length) + i * 7;
    bars += '<span class="bar" style="width:' + widths[code % 3] + 'mm"></span>';
  }
  return '<div class="bk-barcode"><div class="bars">' + bars + '</div>' +
    '<div class="bc-label">SET ' + esc(set.setId) + '</div>' +
    '<div class="bc-zone">RESERVED FOR BARCODE</div></div>';
}

/* A strip of the first five called balls (75-ball back cover). */
function ballStripHtml(set) {
  var colors = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed'];
  var balls = '';
  for (var i = 0; i < 5 && i < set.callOrder.length; i++) {
    balls += '<span class="bk-ball" style="background:' + colors[i % colors.length] + '">' +
      set.callOrder[i] + '</span>';
  }
  return '<div class="bk-balls">' + balls + '</div>';
}

function backCoverPage(set, opts) {
  var dg = designFor(opts);
  var motifCls = dg && dg.motif ? ' motif-' + dg.motif : '';
  var contents = [
    set.cards.length + (set.mode === 'ball90'
      ? ' unique tickets — every ticket different'
      : ' unique bingo cards — every card different'),
    'Calling cards',
    'Master call sheet'
  ];
  /* the Master Board page exists only in the number modes */
  if (set.mode === 'ball75' || set.mode === 'ball90') contents.push('Master board');
  contents.push('Cut-out calling slips', 'How-to-play page');
  if (opts.markers) contents.push('Printable markers');
  var list = contents.map(function (x) { return '<li>✓ ' + esc(x) + '</li>'; }).join('');
  var visual;
  if (set.mode === 'ball90') {
    visual = '<div class="cov-mini wide">' + cardHtml(set, set.cards[0], opts) + '</div>';
  } else if (set.mode === 'ball75') {
    visual = ballStripHtml(set);
  } else {
    visual = '<div class="cov-mini">' + cardHtml(set, set.cards[0], opts) + '</div>';
  }
  var how = set.mode === 'ball90'
    ? 'Print one ticket strip per player.<br>' +
      'The caller calls one number at a time — dab it off on your ticket.<br>' +
      'First to complete a line, two lines or the full house wins!'
    : 'Print one card per player and cut out the calling slips.<br>' +
      'The caller draws one call at a time — cover the matching square.<br>' +
      'First to complete the winning pattern shouts BINGO!<br>' +
      'Winning pattern: ' + patternDef(opts.pattern) + '.';
  /* The design's own back-cover heading + teaser; without a
     design the plain "What's inside this pack" heading stands. */
  var headBlock = (dg && dg.backHeading)
    ? '<h2>' + esc(dg.backHeading) + '</h2>' +
      (dg.backTeaser ? '<p class="back-teaser">' + esc(dg.backTeaser) + '</p>' : '') +
      '<h3>What’s inside this pack</h3>'
    : '<h2>What’s inside this pack</h2>';
  return '<div class="bk-page bk-back"><div class="back-frame' + motifCls + '">' +
    '<div class="cov-deco"></div>' +
    headBlock +
    '<ul class="back-list">' + list + '</ul>' +
    visual +
    '<h3>How to play — the short version</h3>' +
    '<p class="back-how">' + how + '</p>' +
    '<div class="back-thanks">Thank you for playing!</div>' +
    '<div class="back-biz">' + esc(opts.business || 'Songlap Deals') + '</div>' +
    barcodeHtml(set) +
    '</div></div>';
}

function patternDiagram(kind, chosen) {
  var on = function (r, c) {
    if (kind === 'line') return r === 2;
    if (kind === 'corners') return (r === 0 || r === 4) && (c === 0 || c === 4);
    if (kind === 'x') return r === c || r + c === 4;
    return true; /* blackout */
  };
  var rows = '';
  for (var r = 0; r < 5; r++) {
    rows += '<tr>';
    for (var c = 0; c < 5; c++) rows += '<td' + (on(r, c) ? ' class="on"' : '') + '></td>';
    rows += '</tr>';
  }
  var labels = { line: 'Any line', corners: 'Four corners', x: 'X pattern', blackout: 'Blackout' };
  return '<div class="pat-box' + (chosen ? ' chosen' : '') + '"><table class="pat-grid">' + rows +
    '</table><div class="pat-name">' + labels[kind] + (chosen ? ' ★' : '') + '</div></div>';
}

/*
 * How many printable chips this pack needs: one chip for every
 * square a player could cover — cards × coverable squares per
 * card (free centre and 90-ball blanks excluded). A 6-card 5×5
 * pack needs 144; a 12-ticket 90-ball pack (2 strips) needs 180.
 * The old fixed 30 chips could not cover one full game. Chips
 * are paginated (72 per page) so the announced page count stays
 * exact; the first page states the total and that the page can
 * be printed again for more.
 */
function markersNeeded(set) {
  var per = set.cards[0].cells.filter(function (v) { return v !== -1 && v !== null; }).length;
  return set.cards.length * per;
}

function markersPages(set, opts) {
  var glyphs;
  if (set.mode === 'ball75' || set.mode === 'ball90') {
    glyphs = ['★'];
  } else {
    var seen = {}, out = [];
    (opts.items || []).forEach(function (it) {
      if (it.e && !seen[it.e]) { seen[it.e] = 1; out.push(it.e); }
    });
    glyphs = out.length ? out : ['⭐'];
  }
  var total = markersNeeded(set);
  var PER_PAGE = 72;
  var totalPages = Math.ceil(total / PER_PAGE);
  var unit = set.mode === 'ball90' ? 'numbers' : 'squares';
  var pages = [];
  var made = 0, pageNo = 0;
  while (made < total) {
    var n = Math.min(PER_PAGE, total - made);
    var chips = '';
    for (var i = 0; i < n; i++) {
      chips += '<div class="bk-chip"><span>' + esc(glyphs[(made + i) % glyphs.length]) + '</span></div>';
    }
    pageNo++;
    var head = '<h2>Printable Markers — Set ' + esc(set.setId) +
      (totalPages > 1 ? ' (' + pageNo + ' of ' + totalPages + ')' : '') + '</h2>';
    var intro = pageNo === 1
      ? '<p style="font-size:10.5pt;margin:0 0 2mm">No coins or beans handy? Print this page and cut out the chips to cover your ' + unit +
        '. ' + total + ' chips — one for every ' + (set.mode === 'ball90' ? 'number' : 'square') +
        ' in this pack. Print this page again if you need more.</p>'
      : '';
    pages.push('<div class="bk-page bk-call">' + head + intro +
      '<div class="bk-chips-wrap">' + chips + '</div></div>');
    made += n;
  }
  return pages;
}

function instructionsPage(set, opts) {
  /* 90-ball packs sell ticket strips, not cards: every "card /
     square" word on this page must use the ticket vocabulary. */
  var is90 = set.mode === 'ball90';
  /* The Ink Saver tip is only true when this book itself was generated
     in the Ink Saver design; otherwise give a tip that always works. */
  var inkTip = (opts.inkSaver || opts.designId === 'inksaver')
    ? '<li>This book is printed in the Ink Saver design — cheap for classroom/church photocopying.</li>'
    : '<li>For cheap classroom/church photocopying, print in grayscale or draft mode.</li>';
  var patternBlock;
  if (set.mode === 'ball90') {
    patternBlock = '<div class="bk-pattern"><strong>Winning patterns (UK 90-ball):</strong> ' +
      'One line (any full row) · Two lines (two full rows on one ticket) · Full house (all 15 numbers)</div>';
  } else {
    patternBlock = '<div class="bk-pattern"><strong>Winning pattern for this game:</strong> ' + esc(patternName(opts.pattern)) + '</div>' +
      '<h3>Ways to win</h3>' +
      '<p style="font-size:10.5pt;margin:0 0 2mm">★ marks the winning pattern for this game. The other patterns are optional extras — agree on one before you start.</p><div class="pat-row">' +
      patternDiagram('line', opts.pattern === 'line') +
      patternDiagram('corners', opts.pattern === 'corners') +
      patternDiagram('x', opts.pattern === 'x') +
      patternDiagram('blackout', opts.pattern === 'blackout') +
      '</div>';
  }
  /* The free-centre sentence is printed ONLY when this set's cards
     really carry a free centre (set.freeSpace is the effective flag
     from the engine). Claiming a free centre for a no-free-space set
     — or for an even grid, which has no centre — would tell players
     to cover a square that is never called. */
  var freeSentence = set.freeSpace
    ? ' The center square (' + esc(opts.freeText || '★ FREE') + ') is free — it counts as covered.'
    : '';
  return '<div class="bk-page bk-inst"><h2>How to Play</h2>' +
    '<p><strong>Set ' + esc(set.setId) + '</strong> · ' + set.cards.length + (is90 ? ' tickets' : ' cards') + ' · ' + esc(opts.formatName || '') + '</p>' +
    '<h3>You need</h3><ul><li>' + (is90 ? 'One printed ticket strip per player (this pack)' : 'One printed card per player (this pack)') + '</li>' +
    '<li>Markers: coins, beans, buttons or a pen to cross off ' + (is90 ? 'numbers' : 'squares') + '</li>' +
    '<li>The calling cards or cut-out slips from this pack, and one caller</li></ul>' +
    '<h3>Playing</h3><ul><li>The caller calls one ' + (is90 ? 'number' : 'item') + ' at a time — either follow the shuffled order on the Master Call Sheet, or cut out the calling slips, mix them in a hat and draw one at a time. Tick each call on the Master Call Sheet as you make it.</li>' +
    '<li>Players cover the matching ' + (is90 ? 'number on their ticket' : 'square on their card') + '.' + freeSentence + '</li>' +
    '<li>The first player to complete the winning pattern shouts <strong>BINGO!</strong></li>' +
    '<li>Check the winning ' + (is90 ? 'ticket' : 'card') + ': its ' + (is90 ? 'Ticket ID and the called numbers' : 'Card ID and the called items') + ' on the Master Call Sheet prove the win.</li></ul>' +
    patternBlock +
    '<h3>Printing tips</h3><ul><li>Print at 100% scale (do not “fit to page”).</li>' +
    '<li>Card stock or laminated cards last for many games.</li>' +
    inkTip + '</ul>' +
    '<p style="margin-top:6mm;font-size:10pt">Made with Bingo Card Generator Pro · ' + esc(opts.business || 'Songlap Deals') + '</p></div>';
}

/* ---------- whole book ---------- */

/*
 * buildBook(set, opts) -> { html, pageCount }
 * opts: design-resolved fields come via bookCss; here opts =
 * { title, subtitle, business, formatName, coverEmoji, paper,
 *   perPage (1/2/4/6), largePrint, cover (bool), backCover (bool),
 *   coverImage (data URL or null), pattern, design (resolved
 *   preset object or null — coverPage/backCoverPage resolve it
 *   from opts.designId when absent), designId,
 *   createdFor, eventDate,
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
  if (opts.markers) markersPages(set, opts).forEach(function (p) { pages.push(p); });
  if (opts.backCover) pages.push(backCoverPage(set, opts));
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
