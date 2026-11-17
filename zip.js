/*
 * ============================================================
 *  Bingo Card Generator Pro — minimal ZIP writer
 * ============================================================
 *  Store-only (no compression) ZIP archive builder. Pure
 *  byte logic: works in the browser (Blob download) and is
 *  unit-testable in Node. Used for the "Download game pack
 *  (.zip)" export — PNG cards + call sheet text.
 * ============================================================
 */
'use strict';

var ZIP_CRC_TABLE = null;
function zipCrc32(bytes) {
  if (!ZIP_CRC_TABLE) {
    ZIP_CRC_TABLE = [];
    for (var n = 0; n < 256; n++) {
      var c = n;
      for (var k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      ZIP_CRC_TABLE[n] = c >>> 0;
    }
  }
  var crc = 0xFFFFFFFF;
  for (var i = 0; i < bytes.length; i++) {
    crc = ZIP_CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function zipToBytes(data) {
  if (typeof data === 'string') {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(data);
    var s = unescape(encodeURIComponent(data));
    var out = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xFF;
    return out;
  }
  return data instanceof Uint8Array ? data : new Uint8Array(data);
}

/*
 * createZip([{ name, data }]) -> Uint8Array of the archive.
 * data may be a string (stored UTF-8) or a Uint8Array.
 */
function createZip(files) {
  var chunks = [];
  var central = [];
  var offset = 0;

  function u16(v) { return [v & 0xFF, (v >>> 8) & 0xFF]; }
  function u32(v) { return [v & 0xFF, (v >>> 8) & 0xFF, (v >>> 16) & 0xFF, (v >>> 24) & 0xFF]; }
  function push(arr) {
    var b = arr instanceof Uint8Array ? arr : new Uint8Array(arr);
    chunks.push(b); offset += b.length;
  }

  files.forEach(function (f) {
    var nameBytes = zipToBytes(f.name);
    var data = zipToBytes(f.data);
    var crc = zipCrc32(data);
    var localOffset = offset;
    push([].concat(
      u32(0x04034b50), u16(20), u16(0x0800), u16(0),
      u16(0), u16(0x21), u32(crc), u32(data.length), u32(data.length),
      u16(nameBytes.length), u16(0)
    ));
    push(nameBytes);
    push(data);
    central.push({ nameBytes: nameBytes, crc: crc, size: data.length, offset: localOffset });
  });

  var centralStart = offset;
  central.forEach(function (c) {
    push([].concat(
      u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(0),
      u16(0), u16(0x21), u32(c.crc), u32(c.size), u32(c.size),
      u16(c.nameBytes.length), u16(0), u16(0), u16(0), u16(0),
      u32(0), u32(c.offset)
    ));
    push(c.nameBytes);
  });
  var centralSize = offset - centralStart;
  push([].concat(
    u32(0x06054b50), u16(0), u16(0), u16(central.length), u16(central.length),
    u32(centralSize), u32(centralStart), u16(0)
  ));

  var total = 0;
  chunks.forEach(function (b) { total += b.length; });
  var out = new Uint8Array(total);
  var pos = 0;
  chunks.forEach(function (b) { out.set(b, pos); pos += b.length; });
  return out;
}

var BingoZip = { createZip: createZip, crc32: zipCrc32 };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BingoZip;
}
