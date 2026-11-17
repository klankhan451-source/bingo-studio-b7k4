/*
 * ============================================================
 *  Bingo Card Generator Pro — design presets
 * ============================================================
 *  Each preset is a complete coordinated look: palette, border
 *  style and font pairing. The app maps a preset onto CSS
 *  variables; "Ink Saver" can also be forced by the ink-saver
 *  toggle on any preset.
 * ============================================================
 */
'use strict';

var BINGO_DESIGNS = [
  {
    id: 'elegant', name: 'Elegant Minimalist',
    blurb: 'Cream & ivory, fine lines — weddings, showers, gifts',
    pageBg: '#f7f2e9', cardBg: '#fffdf7', headerBg: '#3d3125', headerText: '#f5e9d0',
    cellBg: '#ffffff', cellAlt: '#faf5ea', cellText: '#3d3125', cellBorder: '#c9b896',
    accent: '#b98a1d', freeBg: '#f5e9d0', borderStyle: 'double', radius: 6,
    headerFont: 'Georgia, "Times New Roman", serif',
    cellFont: 'Georgia, "Times New Roman", serif'
  },
  {
    id: 'kids', name: 'Cute Kids',
    blurb: 'Pastel rainbow, rounded & friendly — preschool, parties',
    pageBg: '#fdf3f8', cardBg: '#ffffff', headerBg: '#e56aa0', headerText: '#ffffff',
    cellBg: '#fff7fb', cellAlt: '#eef7ff', cellText: '#5b3a5e', cellBorder: '#f2b8d0',
    accent: '#e56aa0', freeBg: '#ffe98a', borderStyle: 'rounded', radius: 14,
    headerFont: '"Comic Sans MS", "Segoe UI Rounded", "Trebuchet MS", sans-serif',
    cellFont: '"Comic Sans MS", "Trebuchet MS", sans-serif'
  },
  {
    id: 'classroom', name: 'Classroom Pro',
    blurb: 'Clean, high-contrast, print-friendly — teachers & TPT',
    pageBg: '#eef4fb', cardBg: '#ffffff', headerBg: '#1f5fa6', headerText: '#ffffff',
    cellBg: '#ffffff', cellAlt: '#eef4fb', cellText: '#173a5e', cellBorder: '#9dbfdd',
    accent: '#1f5fa6', freeBg: '#d7e9ff', borderStyle: 'solid', radius: 4,
    headerFont: '"Segoe UI", Arial, sans-serif',
    cellFont: '"Segoe UI", Arial, sans-serif'
  },
  {
    id: 'floral', name: 'Luxury Floral',
    blurb: 'Muted gold & sage with delicate frames — elegant events',
    pageBg: '#f4f1ea', cardBg: '#fffefb', headerBg: '#5d7052', headerText: '#f7efdc',
    cellBg: '#ffffff', cellAlt: '#f3efe4', cellText: '#44503e', cellBorder: '#b3bfa5',
    accent: '#a8873a', freeBg: '#efe6cd', borderStyle: 'floral', radius: 10,
    headerFont: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
    cellFont: '"Palatino Linotype", "Book Antiqua", Georgia, serif'
  },
  {
    id: 'retro', name: 'Retro Vintage',
    blurb: 'Warm cream, classic bingo-hall styling — seniors, music bingo',
    pageBg: '#f6e8d4', cardBg: '#fff8ea', headerBg: '#8c3b1d', headerText: '#ffe9c9',
    cellBg: '#fffdf4', cellAlt: '#fbeed3', cellText: '#5e2c14', cellBorder: '#c98d5f',
    accent: '#8c3b1d', freeBg: '#ffd98a', borderStyle: 'double', radius: 8,
    headerFont: '"Courier New", ui-monospace, monospace',
    cellFont: 'Georgia, serif'
  },
  {
    id: 'inksaver', name: 'Ink Saver',
    blurb: 'White background, crisp outlines — bulk school/church printing',
    pageBg: '#ffffff', cardBg: '#ffffff', headerBg: '#ffffff', headerText: '#111111',
    cellBg: '#ffffff', cellAlt: '#ffffff', cellText: '#111111', cellBorder: '#555555',
    accent: '#111111', freeBg: '#eeeeee', borderStyle: 'solid', radius: 2,
    headerFont: 'Arial, Helvetica, sans-serif',
    cellFont: 'Arial, Helvetica, sans-serif'
  },
  {
    id: 'christmas', name: 'Christmas Wonderland',
    blurb: 'Deep red & green with gold — holiday parties & sellers',
    pageBg: '#f3efe4', cardBg: '#fffef8', headerBg: '#7a1f1f', headerText: '#ffe9a8',
    cellBg: '#ffffff', cellAlt: '#eef5ea', cellText: '#274d2a', cellBorder: '#a3b899',
    accent: '#b98a1d', freeBg: '#ffe9a8', borderStyle: 'garland', radius: 8,
    headerFont: 'Georgia, serif',
    cellFont: '"Segoe UI", Arial, sans-serif'
  },
  {
    id: 'party', name: 'Bold Party',
    blurb: 'Bright, loud & fun — birthdays, office games, events',
    pageBg: '#eef0ff', cardBg: '#ffffff', headerBg: '#4b2fd6', headerText: '#ffffff',
    cellBg: '#ffffff', cellAlt: '#ffeef7', cellText: '#2c1a6e', cellBorder: '#a79bff',
    accent: '#e5328f', freeBg: '#8affd1', borderStyle: 'rounded', radius: 12,
    headerFont: '"Trebuchet MS", "Segoe UI", sans-serif',
    cellFont: '"Trebuchet MS", "Segoe UI", sans-serif'
  }
];

function bingoDesignById(id) {
  for (var i = 0; i < BINGO_DESIGNS.length; i++) {
    if (BINGO_DESIGNS[i].id === id) return BINGO_DESIGNS[i];
  }
  return BINGO_DESIGNS[0];
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { BINGO_DESIGNS: BINGO_DESIGNS, bingoDesignById: bingoDesignById };
}
