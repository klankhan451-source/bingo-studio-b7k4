/*
 * ============================================================
 *  Songlap Bingo Card Generator Pro — main app
 * ============================================================
 *  LICENSING CONFIG
 *  Each buyer has a UNIQUE code, registered to their name by
 *  the license server (Google Apps Script + Google Sheet).
 *  The app sends { name, code } to LICENSE_API_URL and unlocks
 *  only when the server says ok.
 *  >> After deploying the Apps Script web app, paste its URL
 *     in place of the placeholder below. That is the ONLY
 *     change needed to go live. <<
 * ============================================================
 */
const LICENSE_API_URL = "https://script.google.com/macros/s/AKfycbymFq-gGEiDUsNjs3aI59101_GQABNcQnNr-nmQCZVmx8tHxaYFr8-0dZTIDVcG9dX0Lw/exec";

/* ---------- License response handling (pure, unit-tested) ---------- */

var LICENSE_ERROR_MESSAGES = {
  invalid_code: 'This code was not found. Please check the code from your purchase.',
  code_registered_to_another_name: 'This code is already registered to another buyer. If this is your code, please contact support.',
  missing_fields: 'Please enter both your name and your code.',
  network: 'Could not verify your code. Please check your internet connection and try again.'
};

function licenseErrorMessage(errorCode) {
  return LICENSE_ERROR_MESSAGES[errorCode] || LICENSE_ERROR_MESSAGES.network;
}

/* Turn a parsed license-server response into an app decision. */
function interpretLicenseResponse(data) {
  if (!data || typeof data !== 'object') {
    return { action: 'error', message: licenseErrorMessage('network') };
  }
  if (data.ok === true) {
    return { action: 'unlock', test: data.test === true };
  }
  return { action: 'error', message: licenseErrorMessage(data.error) };
}

/* Allow the Node test suite to exercise the pure logic above. */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    LICENSE_API_URL: LICENSE_API_URL,
    LICENSE_ERROR_MESSAGES: LICENSE_ERROR_MESSAGES,
    licenseErrorMessage: licenseErrorMessage,
    interpretLicenseResponse: interpretLicenseResponse
  };
}

(function () {
  'use strict';

  /* In the browser these come from the script tags; in Node
     (unit tests) they are required directly. */
  var E = typeof BingoEngine !== 'undefined' ? BingoEngine : require('./engine.js');
  var BK = typeof BingoBook !== 'undefined' ? BingoBook : require('./book.js');

  /* ================= License gate ================= */

  var NAME_KEY = 'bingo_license_name';
  var CODE_KEY = 'bingo_license_code';
  var SETS_KEY = 'bingo_sets_v1';
  var PROJECTS_KEY = 'bingo_projects_v1';
  var appStarted = false;

  function unlock() {
    document.getElementById('lock-screen').hidden = true;
    document.getElementById('app').hidden = false;
    if (!appStarted) { appStarted = true; initApp(); }
  }

  function showLicenseBar(name, code) {
    document.getElementById('license-name').textContent = name;
    document.getElementById('license-code').textContent = code;
    document.getElementById('license-bar').hidden = false;
  }

  function storedLicense() {
    try {
      var name = localStorage.getItem(NAME_KEY);
      var code = localStorage.getItem(CODE_KEY);
      if (name && code) return { name: name, code: code };
    } catch (e) { /* private mode */ }
    return null;
  }

  function initGate() {
    var saved = storedLicense();
    if (saved) { showLicenseBar(saved.name, saved.code); unlock(); return; }

    var form = document.getElementById('lock-form');
    var nameInput = document.getElementById('lock-name');
    var codeInput = document.getElementById('lock-input');
    var button = document.getElementById('lock-submit');
    var errorEl = document.getElementById('lock-error');

    function showError(message) {
      errorEl.textContent = message;
      errorEl.hidden = false;
    }

    form.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var name = nameInput.value.trim();
      var code = codeInput.value.trim();
      if (!name || !code) { showError(licenseErrorMessage('missing_fields')); return; }
      errorEl.hidden = true;
      button.disabled = true;
      button.textContent = 'Checking…';
      fetch(LICENSE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ name: name, code: code })
      })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var decision = interpretLicenseResponse(data);
          if (decision.action === 'unlock') {
            try {
              localStorage.setItem(NAME_KEY, name);
              localStorage.setItem(CODE_KEY, code.toUpperCase());
            } catch (e) { /* private mode */ }
            showLicenseBar(name, code.toUpperCase());
            unlock();
          } else {
            showError(decision.message);
          }
        })
        .catch(function () { showError(licenseErrorMessage('network')); })
        .finally(function () {
          button.disabled = false;
          button.textContent = 'Unlock';
        });
    });
  }

  /* ================= shared state ================= */

  function $(id) { return document.getElementById(id); }

  var state = {
    mode: 'word',
    current: null,        // { record, set, opts, design }
    sets: [],             // set records (regenerable), newest first
    customImages: {},     // itemIndex -> dataURL (custom list, this session)
    coverImage: null,     // buyer's own cover picture (dataURL) for page 1
    caller: { pos: -1, timer: null, setId: null },
    checker: { set: null, record: null, card: null, marked: {} }
  };

  function loadSets() {
    try {
      var raw = localStorage.getItem(SETS_KEY);
      if (raw) state.sets = JSON.parse(raw) || [];
    } catch (e) { state.sets = []; }
  }
  function persistSets() {
    try { localStorage.setItem(SETS_KEY, JSON.stringify(state.sets.slice(0, 12))); }
    catch (e) { /* storage full — sets stay in memory */ }
  }

  function resolveDesign(opts) {
    if (opts.inkSaver) return bingoDesignById('inksaver');
    return bingoDesignById(opts.designId);
  }

  function bookStyleTag(design, opts) {
    return '<style>' + BK.bookCss(design, opts) + '</style>';
  }

  /* ================= tabs ================= */

  function initTabs() {
    var btns = document.querySelectorAll('.tab-btn');
    btns.forEach(function (b) {
      b.addEventListener('click', function () {
        btns.forEach(function (x) { x.classList.toggle('active', x === b); });
        ['create', 'caller', 'checker', 'projects'].forEach(function (t) {
          $('tab-' + t).hidden = t !== b.getAttribute('data-tab');
        });
        if (b.getAttribute('data-tab') === 'checker') refreshCheckerSets();
        if (b.getAttribute('data-tab') === 'caller') { restoreCurrent(); refreshCallerSets(); renderCaller(); }
      });
    });
  }

  /* ================= create: controls ================= */

  function fillThemePickers() {
    var catSel = $('theme-cat');
    catSel.innerHTML = BINGO_CATEGORIES.map(function (c) {
      return '<option>' + BK.esc(c) + '</option>';
    }).join('');
    function fillThemes() {
      var cat = catSel.value;
      $('theme-sel').innerHTML = BINGO_THEMES.filter(function (t) { return t.cat === cat; })
        .map(function (t) {
          return '<option value="' + t.id + '">' + BK.esc(t.name) + ' (' + t.items.length + ' items)</option>';
        }).join('');
      syncTitleFromTheme();
    }
    catSel.addEventListener('change', fillThemes);
    $('theme-sel').addEventListener('change', syncTitleFromTheme);
    fillThemes();
  }

  function syncTitleFromTheme() {
    if ($('custom-text').value.trim()) return;
    var t = bingoThemeById($('theme-sel').value);
    if (t) $('title-in').value = t.name + ' Bingo';
  }

  function fillDesigns() {
    $('design-sel').innerHTML = BINGO_DESIGNS.map(function (d) {
      return '<option value="' + d.id + '">' + BK.esc(d.name) + '</option>';
    }).join('');
    function blurb() {
      $('design-blurb').textContent = bingoDesignById($('design-sel').value).blurb;
    }
    $('design-sel').addEventListener('change', blurb);
    blurb();
  }

  function setMode(mode) {
    state.mode = mode;
    document.querySelectorAll('.mode-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-mode') === mode);
    });
    var isGrid = mode === 'word' || mode === 'picture';
    $('theme-block').hidden = !isGrid;
    $('grid-block').hidden = !isGrid;
    $('pic-style-row').hidden = mode !== 'picture';
    $('custom-images-row').hidden = mode !== 'picture';
    $('free-row').hidden = mode === 'ball90';
    $('free-text-row').hidden = mode === 'ball90';
    $('perpage-row').hidden = mode === 'ball90';
    $('strip-note').hidden = mode !== 'ball90';
    var pat = $('pattern-sel');
    for (var i = 0; i < pat.options.length; i++) {
      var v = pat.options[i].value;
      pat.options[i].disabled = mode === 'ball90' && (v === 'corners' || v === 'x');
    }
    if (mode === 'ball90' && (pat.value === 'corners' || pat.value === 'x')) pat.value = 'line';
  }

  function initModes() {
    document.querySelectorAll('.mode-btn').forEach(function (b) {
      b.addEventListener('click', function () { setMode(b.getAttribute('data-mode')); });
    });
    setMode('word');
  }

  function randomSeed() {
    var chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    var s = '';
    for (var i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  /* read the whole Create form into a set record + render opts */
  function readForm() {
    var mode = state.mode;
    var items = null, themeId = null, custom = false;
    if (mode === 'word' || mode === 'picture') {
      var customItems = E.parseCustomList($('custom-text').value);
      var gridNeed = parseInt($('grid-sel').value, 10);
      var needed = gridNeed * gridNeed - ($('free-space').checked ? 1 : 0);
      if (customItems.length >= Math.min(needed, 9)) {
        items = customItems; custom = true;
        if (items.length < needed) {
          throw new Error('Your custom list has ' + items.length + ' items, but a ' +
            gridNeed + '×' + gridNeed + ' grid needs at least ' + needed + '. Add more items or pick a smaller grid.');
        }
      } else {
        var theme = bingoThemeById($('theme-sel').value);
        themeId = theme.id;
        items = theme.items.map(function (it) { return { w: it.w, e: it.e, c: '' }; });
        if (mode === 'picture' && !theme.pic) {
          throw new Error('“' + theme.name + '” is a word-only theme — switch to Word Bingo for it.');
        }
      }
    }
    var count = Math.max(1, Math.min(500, parseInt($('count-in').value, 10) || 30));
    var seed = $('seed-in').value.trim() || randomSeed();
    var cfg = {
      mode: mode,
      items: items,
      grid: parseInt($('grid-sel').value, 10),
      freeSpace: mode !== 'ball90' && $('free-space').checked,
      count: count,
      seed: seed
    };
    var opts = {
      designId: $('design-sel').value,
      inkSaver: $('ink-saver').checked,
      title: $('title-in').value.trim() || 'Bingo',
      subtitle: $('subtitle-in').value.trim(),
      business: $('business-in').value.trim() || 'Songlap Deals',
      paper: $('paper-sel').value,
      perPage: parseInt($('perpage-sel').value, 10),
      largePrint: $('large-print').checked,
      cutMarks: $('cut-marks').checked,
      cover: $('cover-on').checked,
      backCover: $('backcover-on').checked,
      coverImage: state.coverImage || null,
      markers: $('markers-on') ? $('markers-on').checked : true,
      pattern: $('pattern-sel').value,
      pictureStyle: $('pic-style').value === 'pic' ? 'pic' : 'piclabel',
      useClues: $('use-clues').checked,
      freeText: $('free-text').value.trim() || '★ FREE',
      coverEmoji: mode === 'ball75' ? '🔵' : (mode === 'ball90' ? '🎟️' : '🎉')
    };
    var formatName = {
      word: 'Word Bingo', picture: 'Picture Bingo',
      ball75: '75-Ball Number Bingo', ball90: '90-Ball Bingo (UK)'
    }[mode] + (themeId ? ' · ' + bingoThemeById(themeId).name : (custom ? ' · Custom list' : ''));
    opts.formatName = formatName;
    return { cfg: cfg, opts: opts, themeId: themeId, custom: custom };
  }

  /* regenerate a set from a stored record (deterministic) */
  function buildSet(record) {
    var set = E.generateSet(record.cfg);
    return set;
  }

  /* ================= generation ================= */

  function generate(fromSample) {
    var form;
    try { form = readForm(); }
    catch (err) { $('gen-status').textContent = '⚠️ ' + err.message; return; }
    var btn = $('generate-btn');
    btn.disabled = true;
    $('gen-progress').hidden = false;
    $('gen-bar').style.width = '30%';
    $('gen-status').textContent = 'Generating ' + form.cfg.count + ' unique cards…';

    setTimeout(function () {
      try {
        var set = E.generateSet(form.cfg);
        $('gen-bar').style.width = '70%';
        var record = { cfg: form.cfg, opts: form.opts, themeId: form.themeId, custom: form.custom, madeAt: Date.now() };
        state.current = { record: record, set: set, opts: form.opts, design: resolveDesign(form.opts) };
        state.sets = [record].concat(state.sets.filter(function (r) {
          return !(r.cfg.seed === record.cfg.seed && r.cfg.mode === record.cfg.mode);
        }));
        persistSets();

        var opts = Object.assign({}, form.opts, { items: form.cfg.items, customImages: form.custom ? state.customImages : null });
        state.current.opts = opts;
        var book = BK.buildBook(set, opts);
        $('book-preview').innerHTML = bookStyleTag(state.current.design, opts) + book.html;
        applyZoom();
        $('gen-bar').style.width = '100%';
        $('gen-status').textContent = '✅ Pack ready: ' + set.cards.length + ' cards · Set ' +
          set.setId + ' · ' + book.pageCount + ' pages. Print it, download the ZIP, or open the Live Caller.';
        $('setid-line').innerHTML = 'Set ID: <strong>' + set.setId + '</strong> · Seed: <strong>' +
          BK.esc(set.seed) + '</strong> · Card IDs run ' + set.cards[0].id + ' → ' + set.cards[set.cards.length - 1].id;
        $('page-count').textContent = book.pageCount + ' pages · ' + set.cards.length + ' cards';
        ['print-btn', 'zip-btn', 'png-btn'].forEach(function (id) { $(id).disabled = false; });
        resetCaller();
        refreshCheckerSets();
        refreshCallerSets();
      } catch (err) {
        $('gen-status').textContent = '⚠️ ' + err.message;
      }
      btn.disabled = false;
      setTimeout(function () { $('gen-progress').hidden = true; $('gen-bar').style.width = '0'; }, 600);
    }, 30);
  }

  function applyZoom() {
    var z = parseFloat($('zoom-sel').value);
    document.querySelectorAll('#book-preview .bk-page').forEach(function (p) {
      p.style.transform = 'scale(' + z + ')';
      p.style.marginBottom = (16 - (1 - z) * 300) + 'px';
    });
  }

  function doPrint() {
    if (!state.current) return;
    var c = state.current;
    var book = BK.buildBook(c.set, c.opts);
    $('print-root').innerHTML = bookStyleTag(c.design, c.opts) + book.html;
    window.print();
  }

  /* ================= PNG + ZIP export ================= */

  function wrapText(ctx, text, maxWidth) {
    var words = String(text).split(/\s+/);
    var lines = [], line = '';
    words.forEach(function (w) {
      var test = line ? line + ' ' + w : w;
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w; }
      else line = test;
    });
    if (line) lines.push(line);
    return lines.slice(0, 3);
  }

  /* Draw one card onto a canvas (for PNG export / ZIP pack). */
  function drawCardCanvas(set, card, opts, design) {
    var is90 = set.mode === 'ball90';
    var W = 1000, H = is90 ? 560 : 1240;
    var canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    var ctx = canvas.getContext('2d');
    var d = design;
    ctx.fillStyle = d.pageBg; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = d.cardBg;
    ctx.strokeStyle = d.cellBorder; ctx.lineWidth = 6;
    roundRect(ctx, 16, 16, W - 32, H - 32, 24); ctx.fill(); ctx.stroke();
    /* header */
    ctx.fillStyle = d.headerBg;
    roundRect(ctx, 36, 36, W - 72, 96, 14); ctx.fill();
    ctx.fillStyle = d.headerText;
    ctx.font = 'bold 52px ' + fontName(d.headerFont);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(opts.title || 'BINGO', W / 2, 86);
    var gridTop = 156;
    var gridW = W - 72, gridH = H - gridTop - 84;
    var footer = function () {
      ctx.fillStyle = d.cellText; ctx.font = '26px ' + fontName(d.cellFont);
      ctx.textAlign = 'left'; ctx.fillText('Card ' + card.id, 40, H - 42);
      ctx.textAlign = 'right'; ctx.fillText(opts.business || '', W - 40, H - 42);
    };
    if (is90) {
      var cw = gridW / 9, ch = gridH / 3;
      for (var r = 0; r < 3; r++) for (var c = 0; c < 9; c++) {
        var v = card.cells[r * 9 + c];
        ctx.fillStyle = v === null ? d.cellAlt : (c % 2 ? d.cellAlt : d.cellBg);
        ctx.strokeStyle = d.cellBorder; ctx.lineWidth = 3;
        ctx.fillRect(36 + c * cw, gridTop + r * ch, cw, ch);
        ctx.strokeRect(36 + c * cw, gridTop + r * ch, cw, ch);
        if (v !== null) {
          ctx.fillStyle = d.cellText; ctx.font = 'bold 54px ' + fontName(d.cellFont);
          ctx.textAlign = 'center';
          ctx.fillText(String(v), 36 + c * cw + cw / 2, gridTop + r * ch + ch / 2);
        }
      }
      footer(); return canvas;
    }
    var n = set.grid;
    var lettersH = set.mode === 'ball75' ? 64 : 0;
    if (lettersH) {
      ctx.font = 'bold 44px ' + fontName(d.headerFont);
      'BINGO'.split('').forEach(function (L, i) {
        ctx.fillStyle = d.accent;
        ctx.fillText(L, 36 + (i + 0.5) * (gridW / 5), gridTop + 30);
      });
      gridTop += lettersH;
      gridH -= lettersH;
    }
    var cw2 = gridW / n, ch2 = gridH / n;
    for (var r2 = 0; r2 < n; r2++) for (var c2 = 0; c2 < n; c2++) {
      var idx = r2 * n + c2;
      var val = card.cells[idx];
      var x = 36 + c2 * cw2, y = gridTop + r2 * ch2;
      ctx.fillStyle = val === -1 ? d.freeBg : ((r2 + c2) % 2 ? d.cellAlt : d.cellBg);
      ctx.strokeStyle = d.cellBorder; ctx.lineWidth = 3;
      ctx.fillRect(x, y, cw2, ch2); ctx.strokeRect(x, y, cw2, ch2);
      ctx.fillStyle = d.cellText; ctx.textAlign = 'center';
      if (val === -1) {
        ctx.font = 'bold 40px ' + fontName(d.cellFont);
        ctx.fillText(opts.freeText || '★ FREE', x + cw2 / 2, y + ch2 / 2);
      } else if (set.mode === 'word') {
        ctx.font = 'bold 34px ' + fontName(d.cellFont);
        var lines = wrapText(ctx, opts.items[val].w, cw2 - 16);
        lines.forEach(function (ln, li) {
          ctx.fillText(ln, x + cw2 / 2, y + ch2 / 2 + (li - (lines.length - 1) / 2) * 38);
        });
      } else if (set.mode === 'picture') {
        var it = opts.items[val];
        ctx.font = '64px "Noto Color Emoji", sans-serif';
        ctx.fillText(it.e || '⭐', x + cw2 / 2, y + ch2 / 2 - (opts.pictureStyle === 'pic' ? 0 : 16));
        if (opts.pictureStyle !== 'pic') {
          ctx.fillStyle = d.cellText; ctx.font = 'bold 24px ' + fontName(d.cellFont);
          ctx.fillText(it.w, x + cw2 / 2, y + ch2 - 30);
        }
      } else {
        ctx.font = 'bold 58px ' + fontName(d.cellFont);
        ctx.fillText(String(val), x + cw2 / 2, y + ch2 / 2);
      }
    }
    footer(); return canvas;
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function fontName(stack) { return stack; }

  function downloadBlob(blob, filename) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 400);
  }

  function canvasBytes(canvas) {
    return new Promise(function (resolve) {
      canvas.toBlob(function (blob) {
        blob.arrayBuffer().then(function (buf) { resolve(new Uint8Array(buf)); });
      }, 'image/png');
    });
  }

  async function exportPng() {
    if (!state.current) return;
    var c = state.current;
    var canvas = drawCardCanvas(c.set, c.set.cards[0], c.opts, c.design);
    var bytes = await canvasBytes(canvas);
    downloadBlob(new Blob([bytes], { type: 'image/png' }), c.set.cards[0].id + '.png');
  }

  async function exportZip() {
    if (!state.current) return;
    var c = state.current;
    var btn = $('zip-btn');
    btn.disabled = true;
    var files = [];
    for (var i = 0; i < c.set.cards.length; i++) {
      var canvas = drawCardCanvas(c.set, c.set.cards[i], c.opts, c.design);
      files.push({ name: 'cards/' + c.set.cards[i].id + '.png', data: await canvasBytes(canvas) });
      if (i % 25 === 0) {
        $('gen-status').textContent = 'Building ZIP… card ' + (i + 1) + ' of ' + c.set.cards.length;
        await new Promise(function (r) { setTimeout(r, 0); });
      }
    }
    var sheet = c.set.callOrder.map(function (v, i) {
      var lab = BK.callLabel(c.set, c.opts, v);
      return (i + 1) + '. ' + lab.main;
    }).join('\r\n');
    files.push({ name: 'call-sheet.txt', data: 'MASTER CALL SHEET — Set ' + c.set.setId + '\r\n' + sheet });
    files.push({
      name: 'README.txt',
      data: 'Bingo Card Generator Pro — game pack ' + c.set.setId + '\r\n' +
        c.set.cards.length + ' cards as PNG images (cards/ folder).\r\n' +
        'For the full printable PDF (cover, instructions, calling cards, slips), ' +
        'open the tool, load seed "' + c.set.seed + '" with the same settings, and use Print / Save PDF.\r\n' +
        'Winning pattern: ' + BK.patternName(c.opts.pattern) + '\r\n'
    });
    var zip = BingoZip.createZip(files);
    downloadBlob(new Blob([zip], { type: 'application/zip' }), 'bingo-pack-' + c.set.setId + '.zip');
    $('gen-status').textContent = '✅ ZIP downloaded: ' + c.set.cards.length + ' card PNGs + call sheet.';
    btn.disabled = false;
  }

  /* ================= live caller ================= */

  function callerSet() {
    return state.current;
  }

  /* The Caller must survive page reloads: saved set records persist in
     localStorage, so rebuild the newest one as the current set on load.
     (Before this fix the Caller only knew the set generated in the same
     session — after any reload it wrongly said "Generate a pack first".) */
  function restoreCurrent() {
    if (state.current || !state.sets.length) return;
    var record = state.sets[0];
    try {
      var set = buildSet(record);
      var opts = Object.assign({}, record.opts, { items: record.cfg.items, customImages: null });
      state.current = { record: record, set: set, opts: opts, design: resolveDesign(record.opts) };
      state.caller.setId = set.setId;
    } catch (e) { /* leave current null */ }
  }

  function refreshCallerSets() {
    var sel = $('caller-set');
    if (!sel) return;
    var cur = state.current ? state.current.set.setId : null;
    sel.innerHTML = state.sets.map(function (r, i) {
      var sid = E.setIdFromSeed(r.cfg.seed);
      return '<option value="' + i + '"' + (sid === cur ? ' selected' : '') + '>Set ' + sid +
        ' · ' + r.cfg.mode + ' · ' + r.cfg.count + ' cards</option>';
    }).join('') || '<option value="">— no sets yet —</option>';
  }

  function useCallerSet(idx) {
    var record = state.sets[idx];
    if (!record) return;
    try {
      var set = buildSet(record);
      var opts = Object.assign({}, record.opts, { items: record.cfg.items, customImages: null });
      state.current = { record: record, set: set, opts: opts, design: resolveDesign(record.opts) };
      stopAuto();
      state.caller.pos = -1;
      state.caller.setId = set.setId;
      renderCaller();
    } catch (e) { /* keep the previous set */ }
  }

  function callText(set, opts, v) {
    var lab = BK.callLabel(set, opts, v);
    return lab;
  }

  function speak(text) {
    if (!$('caller-voice').checked) return;
    try {
      var u = new SpeechSynthesisUtterance(text);
      u.rate = 0.95;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (e) { /* speech unavailable */ }
  }

  function renderCaller() {
    var c = callerSet();
    var pos = state.caller.pos;
    var disp = $('caller-display'), sub = $('caller-sub');
    if (!c) {
      disp.textContent = '—';
      sub.textContent = 'Generate a pack first (Create tab).';
      $('caller-status').textContent = '';
      $('caller-history').innerHTML = '';
      $('caller-board-wrap').innerHTML = '';
      return;
    }
    var seq = E.callerSequence(c.set);
    if (pos < 0) {
      disp.textContent = 'Ready when you are';
      sub.textContent = 'Set ' + c.set.setId + ' · ' + seq.length + ' calls · pattern: ' + BK.patternName(c.opts.pattern);
    } else {
      var lab = callText(c.set, c.opts, seq[pos]);
      disp.innerHTML = (lab.emoji ? '<span class="cd-emoji">' + BK.esc(lab.emoji) + '</span>' : '') +
        BK.esc(lab.main);
      sub.textContent = lab.clue ? ('Answer: ' + c.opts.items[seq[pos]].w + ' · ') : '';
      sub.textContent += 'Call ' + (pos + 1) + ' of ' + seq.length;
    }
    $('caller-status').textContent = pos >= seq.length - 1 && pos >= 0
      ? 'All calls made. Restart to play again.' : '';
    $('caller-history').innerHTML = seq.slice(0, pos + 1).map(function (v, i) {
      var lab = callText(c.set, c.opts, v);
      return '<span class="ch-chip' + (i === pos ? ' latest' : '') + '">' + (i + 1) + '. ' + BK.esc(lab.main) + '</span>';
    }).join('');
    /* board */
    var wrap = $('caller-board-wrap');
    if (c.set.mode === 'ball75' || c.set.mode === 'ball90') {
      var max = c.set.mode === 'ball75' ? 75 : 90;
      var calledSet = new Set(seq.slice(0, pos + 1));
      var html = '<h4>Number board</h4><table>';
      for (var b = 1; b <= max; b += 10) {
        html += '<tr>';
        for (var q = 0; q < 10 && b + q <= max; q++) {
          html += '<td class="' + (calledSet.has(b + q) ? 'called' : '') + '">' + (b + q) + '</td>';
        }
        html += '</tr>';
      }
      wrap.innerHTML = html + '</table>';
    } else {
      wrap.innerHTML = '';
    }
  }

  function callerStep(delta) {
    var c = callerSet();
    if (!c) { renderCaller(); return; }
    var seq = E.callerSequence(c.set);
    var next = state.caller.pos + delta;
    if (next < -1) next = -1;
    if (next > seq.length - 1) next = seq.length - 1;
    state.caller.pos = next;
    renderCaller();
    if (delta > 0 && next >= 0) {
      var lab = callText(c.set, c.opts, seq[next]);
      speak(lab.main);
    }
  }

  function stopAuto() {
    if (state.caller.timer) { clearInterval(state.caller.timer); state.caller.timer = null; }
    $('caller-auto').textContent = '▶ Auto-call';
  }

  function resetCaller() {
    stopAuto();
    state.caller.pos = -1;
    state.caller.setId = state.current ? state.current.set.setId : null;
    renderCaller();
  }

  function initCaller() {
    var setSel = $('caller-set');
    if (setSel) {
      setSel.addEventListener('change', function () { useCallerSet(parseInt(setSel.value, 10)); });
    }
    $('caller-next').addEventListener('click', function () { callerStep(1); });
    $('caller-prev').addEventListener('click', function () { stopAuto(); callerStep(-1); });
    $('caller-reset').addEventListener('click', resetCaller);
    $('caller-auto').addEventListener('click', function () {
      if (state.caller.timer) { stopAuto(); return; }
      var secs = parseInt($('caller-speed').value, 10) * 1000;
      $('caller-auto').textContent = '⏸ Auto-call';
      state.caller.timer = setInterval(function () {
        var c = callerSet();
        if (!c || state.caller.pos >= E.callerSequence(c.set).length - 1) { stopAuto(); return; }
        callerStep(1);
      }, secs);
      callerStep(1);
    });
    renderCaller();
  }

  /* ================= card checker ================= */

  function refreshCheckerSets() {
    var sel = $('checker-set');
    var records = state.sets;
    sel.innerHTML = records.map(function (r, i) {
      var sid = E.setIdFromSeed(r.cfg.seed);
      return '<option value="' + i + '">Set ' + sid + ' · ' + r.cfg.mode + ' · ' +
        r.cfg.count + ' cards · seed ' + BK.esc(r.cfg.seed) + '</option>';
    }).join('') || '<option value="">— no sets yet —</option>';
    $('checker-usecaller').disabled = !(state.current && state.caller.pos >= 0);
  }

  function loadCheckerCard() {
    var idx = parseInt($('checker-set').value, 10);
    var record = state.sets[idx];
    if (!record) { $('checker-status').textContent = 'Generate a set first.'; return; }
    var set = buildSet(record);
    var card = E.findCard(set, $('checker-id').value);
    if (!card) {
      $('checker-status').textContent = '⚠️ Card ID not found in that set. Check the ID printed on the card.';
      $('checker-card').innerHTML = '';
      $('checker-verify').disabled = true;
      return;
    }
    var opts = Object.assign({}, record.opts, { items: record.cfg.items, customImages: null });
    var design = resolveDesign(record.opts);
    state.checker = { set: set, record: record, card: card, marked: {} };
    $('checker-card').innerHTML = bookStyleTag(design, opts) + BK.cardHtml(set, card, opts, design);
    $('checker-status').textContent = 'Card ' + card.id + ' from set ' + set.setId +
      '. Tap the squares that have been called, then check.';
    $('checker-verdict').textContent = '';
    $('checker-verify').disabled = false;
    $('checker-clear').disabled = false;
    $('checker-usecaller').disabled = !(state.current && state.current.set.setId === set.setId && state.caller.pos >= 0);
    var tds = $('checker-card').querySelectorAll('td[data-cell]');
    tds.forEach(function (td) {
      var i = parseInt(td.getAttribute('data-cell'), 10);
      td.addEventListener('click', function () {
        if (card.cells[i] === -1 || card.cells[i] === null) return;
        td.classList.toggle('marked');
        state.checker.marked[i] = td.classList.contains('marked');
      });
    });
  }

  function verifyChecker() {
    var ch = state.checker;
    if (!ch.card) return;
    var called = new Set();
    Object.keys(ch.marked).forEach(function (i) {
      if (ch.marked[i]) called.add(ch.card.cells[i]);
    });
    var pattern = ch.record.opts.pattern || 'line';
    var res = E.checkPattern(ch.set, ch.card, called, pattern);
    var detail = E.checkCard(ch.set, ch.card, called);
    var v = $('checker-verdict');
    if (res.won) {
      v.className = 'checker-verdict win';
      v.textContent = '🎉 GENUINE WIN — card ' + ch.card.id + ' completes “' +
        BK.patternName(pattern) + '” with the marked calls.' +
        (detail.fullHouse ? ' It is also a full house!' : '');
    } else {
      v.className = 'checker-verdict nowin';
      v.textContent = '✋ Not a win yet — card ' + ch.card.id + ' does not complete “' +
        BK.patternName(pattern) + '” with the marked calls' +
        (detail.lineCount ? ' (it does have ' + detail.lineCount + ' line(s) covered)' : '') + '.';
    }
  }

  function initChecker() {
    $('checker-load').addEventListener('click', loadCheckerCard);
    $('checker-verify').addEventListener('click', verifyChecker);
    $('checker-clear').addEventListener('click', function () {
      state.checker.marked = {};
      $('checker-card').querySelectorAll('td.marked').forEach(function (td) { td.classList.remove('marked'); });
      $('checker-verdict').textContent = '';
    });
    $('checker-usecaller').addEventListener('click', function () {
      var ch = state.checker;
      if (!ch.card || !state.current) return;
      var seq = E.callerSequence(state.current.set).slice(0, state.caller.pos + 1);
      var called = new Set(seq);
      state.checker.marked = {};
      var tds = $('checker-card').querySelectorAll('td[data-cell]');
      tds.forEach(function (td) {
        var i = parseInt(td.getAttribute('data-cell'), 10);
        var val = ch.card.cells[i];
        var on = val !== -1 && val !== null && called.has(val);
        td.classList.toggle('marked', on);
        if (on) state.checker.marked[i] = true;
      });
      verifyChecker();
    });
  }

  /* ================= projects & samples ================= */

  var SAMPLE_PROJECTS = [
    {
      name: '🎄 Christmas Party Pack',
      desc: 'Word bingo · Christmas theme · 30 cards · Christmas Wonderland design',
      apply: { mode: 'word', themeId: 'christmas', grid: 5, free: true, count: 30, seed: 'XMAS2026', designId: 'christmas', title: 'Christmas Bingo', pattern: 'line' }
    },
    {
      name: '🦁 Classroom Animals',
      desc: 'Picture bingo with labels · Animals · 24 cards · Classroom Pro design',
      apply: { mode: 'picture', themeId: 'animals', grid: 4, free: true, count: 24, seed: 'CLASS25', designId: 'classroom', title: 'Animal Bingo', pattern: 'line' }
    },
    {
      name: '🔵 75-Ball Game Night',
      desc: 'Classic B-I-N-G-O · 50 cards · Retro Vintage design',
      apply: { mode: 'ball75', grid: 5, free: true, count: 50, seed: 'GAME75', designId: 'retro', title: 'Bingo Night', pattern: 'line' }
    }
  ];

  function applySettings(a) {
    setMode(a.mode);
    if (a.themeId) {
      var theme = bingoThemeById(a.themeId);
      $('theme-cat').value = theme.cat;
      $('theme-cat').dispatchEvent(new Event('change'));
      $('theme-sel').value = a.themeId;
    }
    $('custom-text').value = '';
    if (a.grid) $('grid-sel').value = String(a.grid);
    $('free-space').checked = !!a.free;
    $('count-in').value = a.count;
    $('seed-in').value = a.seed;
    $('design-sel').value = a.designId;
    $('design-sel').dispatchEvent(new Event('change'));
    $('title-in').value = a.title || '';
    $('pattern-sel').value = a.pattern || 'line';
    document.querySelector('[data-tab="create"]').click();
    generate(true);
  }

  function formSnapshot(name) {
    return {
      name: name,
      mode: state.mode,
      themeCat: $('theme-cat').value,
      themeId: $('theme-sel').value,
      customText: $('custom-text').value,
      grid: $('grid-sel').value,
      free: $('free-space').checked,
      freeText: $('free-text').value,
      count: $('count-in').value,
      seed: $('seed-in').value,
      designId: $('design-sel').value,
      inkSaver: $('ink-saver').checked,
      largePrint: $('large-print').checked,
      cutMarks: $('cut-marks').checked,
      paper: $('paper-sel').value,
      perPage: $('perpage-sel').value,
      cover: $('cover-on').checked,
      backCover: $('backcover-on').checked,
      coverImage: state.coverImage || '',
      markers: $('markers-on') ? $('markers-on').checked : true,
      pattern: $('pattern-sel').value,
      picStyle: $('pic-style').value,
      useClues: $('use-clues').checked,
      title: $('title-in').value,
      subtitle: $('subtitle-in').value,
      business: $('business-in').value
    };
  }

  function applySnapshot(p) {
    setMode(p.mode);
    $('theme-cat').value = p.themeCat;
    $('theme-cat').dispatchEvent(new Event('change'));
    $('theme-sel').value = p.themeId;
    $('custom-text').value = p.customText || '';
    $('grid-sel').value = p.grid;
    $('free-space').checked = !!p.free;
    $('free-text').value = p.freeText || '★ FREE';
    $('count-in').value = p.count;
    $('seed-in').value = p.seed;
    $('design-sel').value = p.designId;
    $('design-sel').dispatchEvent(new Event('change'));
    $('ink-saver').checked = !!p.inkSaver;
    $('large-print').checked = !!p.largePrint;
    $('cut-marks').checked = !!p.cutMarks;
    $('paper-sel').value = p.paper;
    $('perpage-sel').value = p.perPage;
    $('cover-on').checked = !!p.cover;
    $('backcover-on').checked = p.backCover !== false;
    setCoverImage(p.coverImage || null);
    if ($('markers-on')) $('markers-on').checked = p.markers !== false;
    $('pattern-sel').value = p.pattern;
    $('pic-style').value = p.picStyle;
    $('use-clues').checked = !!p.useClues;
    $('title-in').value = p.title;
    $('subtitle-in').value = p.subtitle;
    $('business-in').value = p.business;
    document.querySelector('[data-tab="create"]').click();
    generate(true);
  }

  function loadProjects() {
    try { return JSON.parse(localStorage.getItem(PROJECTS_KEY) || '[]'); }
    catch (e) { return []; }
  }
  function saveProjects(list) {
    try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(list)); } catch (e) { /* full */ }
  }

  function renderProjects() {
    $('sample-list').innerHTML = SAMPLE_PROJECTS.map(function (s, i) {
      return '<div class="sample-card"><h4>' + BK.esc(s.name) + '</h4><p>' + BK.esc(s.desc) +
        '</p><button type="button" class="btn btn-gold btn-small" data-sample="' + i + '">Load sample</button></div>';
    }).join('');
    $('sample-list').querySelectorAll('[data-sample]').forEach(function (b) {
      b.addEventListener('click', function () {
        applySettings(SAMPLE_PROJECTS[parseInt(b.getAttribute('data-sample'), 10)].apply);
      });
    });
    var list = loadProjects();
    $('project-list').innerHTML = list.length ? list.map(function (p, i) {
      return '<div class="project-row"><span class="p-name">' + BK.esc(p.name) + '</span>' +
        '<span class="p-meta">' + BK.esc(p.mode) + ' · ' + BK.esc(p.count) + ' cards · seed ' + BK.esc(p.seed) + '</span>' +
        '<button type="button" class="btn btn-teal btn-small" data-load="' + i + '">Load</button>' +
        '<button type="button" class="btn btn-teal btn-small" data-del="' + i + '">Delete</button></div>';
    }).join('') : '<p class="hint">No saved projects yet.</p>';
    $('project-list').querySelectorAll('[data-load]').forEach(function (b) {
      b.addEventListener('click', function () { applySnapshot(loadProjects()[parseInt(b.getAttribute('data-load'), 10)]); });
    });
    $('project-list').querySelectorAll('[data-del]').forEach(function (b) {
      b.addEventListener('click', function () {
        var l = loadProjects();
        l.splice(parseInt(b.getAttribute('data-del'), 10), 1);
        saveProjects(l); renderProjects();
      });
    });
  }

  function initProjects() {
    renderProjects();
    $('project-save').addEventListener('click', function () {
      var name = $('project-name').value.trim();
      if (!name) { $('project-name').focus(); return; }
      var list = loadProjects();
      list.unshift(formSnapshot(name));
      saveProjects(list.slice(0, 20));
      $('project-name').value = '';
      renderProjects();
    });
  }

  /* ================= file inputs ================= */

  /* The buyer's own cover picture: read as a data URL (downscaled
     to a print-sensible size so saved projects stay small), kept
     in state, and passed to the book builder by readForm. */
  function setCoverImage(dataUrl) {
    state.coverImage = dataUrl || null;
    var rm = $('cover-image-remove');
    if (rm) rm.hidden = !state.coverImage;
    var nm = $('cover-image-name');
    if (nm) nm.textContent = state.coverImage
      ? '✅ Cover picture set — press Generate and it becomes page 1.'
      : '';
  }

  function loadCoverImage(file) {
    var reader = new FileReader();
    reader.onload = function () {
      var raw = String(reader.result || '');
      var img = new Image();
      img.onload = function () {
        try {
          var maxSide = 1400;
          var scale = Math.min(1, maxSide / Math.max(img.width, img.height));
          if (scale >= 1) { setCoverImage(raw); return; }
          var canvas = document.createElement('canvas');
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
          setCoverImage(canvas.toDataURL('image/jpeg', 0.85));
        } catch (e) { setCoverImage(raw); }
      };
      img.onerror = function () { setCoverImage(raw); };
      img.src = raw;
    };
    reader.readAsDataURL(file);
  }

  function initFiles() {
    $('csv-file').addEventListener('change', function () {
      var f = this.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var text = String(reader.result || '');
        /* simple CSV: take the first column of each row */
        var lines = text.split(/\r?\n/).map(function (ln) {
          return ln.split(',').slice(0, 2).join(' | ');
        });
        $('custom-text').value = lines.join('\n');
        $('custom-box').open = true;
      };
      reader.readAsText(f);
    });
    $('img-files').addEventListener('change', function () {
      var files = Array.prototype.slice.call(this.files || []);
      state.customImages = {};
      var done = 0;
      files.forEach(function (f, i) {
        var reader = new FileReader();
        reader.onload = function () {
          state.customImages[i] = String(reader.result || '');
          done++;
          $('img-count').textContent = done + ' picture(s) loaded — they will be matched to your custom list in order.';
        };
        reader.readAsDataURL(f);
      });
    });
    $('custom-text').addEventListener('input', syncTitleFromTheme);
    var coverFile = $('cover-image-file');
    if (coverFile) {
      coverFile.addEventListener('change', function () {
        var f = this.files && this.files[0];
        if (f) loadCoverImage(f);
      });
    }
    var coverRemove = $('cover-image-remove');
    if (coverRemove) {
      coverRemove.addEventListener('click', function () {
        setCoverImage(null);
        if (coverFile) coverFile.value = '';
      });
    }
  }

  /* ================= init ================= */

  function initApp() {
    loadSets();
    initTabs();
    fillThemePickers();
    fillDesigns();
    initModes();
    $('seed-in').value = randomSeed();
    $('seed-rand').addEventListener('click', function () { $('seed-in').value = randomSeed(); });
    $('generate-btn').addEventListener('click', function () { generate(false); });
    $('print-btn').addEventListener('click', doPrint);
    $('png-btn').addEventListener('click', exportPng);
    $('zip-btn').addEventListener('click', exportZip);
    $('zoom-sel').addEventListener('change', applyZoom);
    initCaller();
    initChecker();
    initProjects();
    initFiles();
    restoreCurrent();
    refreshCheckerSets();
    refreshCallerSets();
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', initGate);
    } else {
      initGate();
    }
  }
})();
