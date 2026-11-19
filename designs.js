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
    id: 'classroom', name: 'Classroom & Teacher',
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
  },
  {
    id: 'ocean', name: 'Ocean Blue',
    blurb: 'Deep-sea blues & teals — beach parties, summer camps',
    pageBg: '#e8f4f8', cardBg: '#ffffff', headerBg: '#0b5e7a', headerText: '#eafcff',
    cellBg: '#ffffff', cellAlt: '#e2f1f7', cellText: '#0d3b4c', cellBorder: '#8fc3d4',
    accent: '#0e86a8', freeBg: '#bdeef7', borderStyle: 'solid', radius: 10,
    headerFont: '"Segoe UI", Arial, sans-serif',
    cellFont: '"Segoe UI", Arial, sans-serif'
  },
  {
    id: 'space', name: 'Space Adventure',
    blurb: 'Starry navy & gold — kids’ space parties, STEM classes',
    pageBg: '#141b34', cardBg: '#1d2748', headerBg: '#3b2a7a', headerText: '#ffe66d',
    cellBg: '#232f57', cellAlt: '#2a3866', cellText: '#e8ecff', cellBorder: '#5a6db3',
    accent: '#ffb703', freeBg: '#3b2a7a', borderStyle: 'dotted', radius: 12,
    headerFont: '"Trebuchet MS", "Segoe UI", sans-serif',
    cellFont: '"Segoe UI", Arial, sans-serif'
  },
  {
    id: 'jungle', name: 'Jungle Safari',
    blurb: 'Leafy greens & warm amber — animal themes, school trips',
    pageBg: '#eef5e2', cardBg: '#fffef5', headerBg: '#2e6b30', headerText: '#f1f8d8',
    cellBg: '#ffffff', cellAlt: '#e7f2d5', cellText: '#2c4a22', cellBorder: '#9dbe7f',
    accent: '#e08a1e', freeBg: '#ffe9a8', borderStyle: 'solid', radius: 10,
    headerFont: 'Georgia, "Times New Roman", serif',
    cellFont: '"Segoe UI", Arial, sans-serif'
  },
  {
    id: 'sports', name: 'Sports Day',
    blurb: 'Stadium red & blue, bold type — team parties, fundraisers',
    pageBg: '#f0f3f7', cardBg: '#ffffff', headerBg: '#c8102e', headerText: '#ffffff',
    cellBg: '#ffffff', cellAlt: '#e8eef7', cellText: '#16283f', cellBorder: '#7f9cc4',
    accent: '#0b4ea2', freeBg: '#ffe08a', borderStyle: 'solid', radius: 6,
    headerFont: '"Arial Black", "Trebuchet MS", Arial, sans-serif',
    cellFont: 'Arial, Helvetica, sans-serif'
  },
  {
    id: 'princess', name: 'Princess Party',
    blurb: 'Blush pink, lavender & gold — birthdays, dress-up parties',
    pageBg: '#fdf0f7', cardBg: '#fffafd', headerBg: '#b052a8', headerText: '#fff3fa',
    cellBg: '#ffffff', cellAlt: '#fbe9f6', cellText: '#5e2a56', cellBorder: '#e3a8d8',
    accent: '#d4a017', freeBg: '#ffe3f1', borderStyle: 'double', radius: 14,
    headerFont: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
    cellFont: 'Georgia, "Times New Roman", serif'
  },
  {
    id: 'dino', name: 'Dinosaur World',
    blurb: 'Earthy greens & fossil browns — dino-mad kids, museums',
    pageBg: '#f2efe3', cardBg: '#fffdf2', headerBg: '#4a6741', headerText: '#f5efc8',
    cellBg: '#ffffff', cellAlt: '#ecead2', cellText: '#3c4630', cellBorder: '#a8a06a',
    accent: '#c96f1e', freeBg: '#f7df8e', borderStyle: 'dashed', radius: 8,
    headerFont: '"Trebuchet MS", "Segoe UI", sans-serif',
    cellFont: '"Segoe UI", Arial, sans-serif'
  },
  {
    id: 'autumn', name: 'Autumn Harvest',
    blurb: 'Rust, pumpkin & cream — Thanksgiving, harvest festivals',
    pageBg: '#faf0e2', cardBg: '#fffaf0', headerBg: '#9c4a12', headerText: '#ffedd5',
    cellBg: '#ffffff', cellAlt: '#f7e7cf', cellText: '#5a3418', cellBorder: '#d3a05f',
    accent: '#b3541e', freeBg: '#ffd98a', borderStyle: 'double', radius: 8,
    headerFont: 'Georgia, "Times New Roman", serif',
    cellFont: 'Georgia, "Times New Roman", serif'
  },
  {
    id: 'neon', name: 'Neon Arcade',
    blurb: 'Black-light neon pink & cyan — teen parties, game nights',
    pageBg: '#0d0d12', cardBg: '#16161f', headerBg: '#ff2e88', headerText: '#ffffff',
    cellBg: '#1b1b28', cellAlt: '#221b33', cellText: '#e6fbff', cellBorder: '#00e5ff',
    accent: '#00e5ff', freeBg: '#7a1e4f', borderStyle: 'solid', radius: 10,
    headerFont: '"Courier New", ui-monospace, monospace',
    cellFont: '"Segoe UI", Arial, sans-serif'
  },
  {
    id: 'watercolor', name: 'Soft Watercolor',
    blurb: 'Pale painted washes — baby showers, gentle celebrations',
    pageBg: '#f7f3ee', cardBg: '#fffefb', headerBg: '#7d9dbd', headerText: '#ffffff',
    cellBg: '#ffffff', cellAlt: '#eef3f0', cellText: '#44586a', cellBorder: '#b9cdc9',
    accent: '#c48b9a', freeBg: '#fbe3ec', borderStyle: 'solid', radius: 12,
    headerFont: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
    cellFont: 'Georgia, "Times New Roman", serif'
  },
  {
    id: 'circus', name: 'Vintage Circus',
    blurb: 'Big-top red & cream, poster type — carnivals, fairs',
    pageBg: '#f9efdc', cardBg: '#fffaf0', headerBg: '#a31621', headerText: '#ffedb8',
    cellBg: '#fffdf6', cellAlt: '#fbeed3', cellText: '#4a1f1f', cellBorder: '#c98d5f',
    accent: '#1d5c99', freeBg: '#ffd23e', borderStyle: 'double', radius: 8,
    headerFont: 'Georgia, "Times New Roman", serif',
    cellFont: '"Segoe UI", Arial, sans-serif'
  },
  {
    id: 'halloween', name: 'Halloween Spooktacular',
    blurb: 'Cute-spooky pumpkins & ghosts — Halloween parties, classrooms',
    pageBg: '#fff8ec', cardBg: '#fffdf6', headerBg: '#e88932', headerText: '#fff8ec',
    cellBg: '#ffffff', cellAlt: '#fdeeda', cellText: '#2b2b2b', cellBorder: '#d9b48f',
    accent: '#9b7ede', freeBg: '#dcebd9', borderStyle: 'dotted', radius: 12,
    headerFont: '"Trebuchet MS", "Segoe UI", sans-serif',
    cellFont: '"Segoe UI", Arial, sans-serif'
  },
  {
    id: 'valentine', name: 'Valentine\u2019s Sweetheart',
    blurb: 'Cherry red & blush hearts — Valentine\u2019s parties, Galentine\u2019s, classrooms',
    pageBg: '#fff9f4', cardBg: '#fffdfb', headerBg: '#c94b59', headerText: '#fff5f6',
    cellBg: '#ffffff', cellAlt: '#fdeef1', cellText: '#57222b', cellBorder: '#d99ba8',
    accent: '#c94b59', freeBg: '#f6d6dc', borderStyle: 'double', radius: 12,
    headerFont: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
    cellFont: 'Georgia, "Times New Roman", serif'
  },
  {
    id: 'coquette', name: 'Coquette Pink Bow',
    blurb: 'Satin bows & ballet pink — bridal & baby showers, teen birthdays',
    pageBg: '#ffffff', cardBg: '#ffffff', headerBg: '#f4c2d7', headerText: '#3a3537',
    cellBg: '#ffffff', cellAlt: '#fdf0f5', cellText: '#3a3537', cellBorder: '#e89eb8',
    accent: '#d87a9e', freeBg: '#fbe3ee', borderStyle: 'double', radius: 14,
    headerFont: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
    cellFont: 'Georgia, "Times New Roman", serif'
  },
  {
    id: 'babybeginnings', name: 'Baby Shower Sweet Beginnings',
    blurb: 'Sage, beige & soft terracotta — baby showers, gender-neutral & gentle',
    pageBg: '#fff9f0', cardBg: '#fffdf8', headerBg: '#c98f78', headerText: '#fff9f0',
    cellBg: '#ffffff', cellAlt: '#f3eee1', cellText: '#4f4438', cellBorder: '#a8b9a0',
    accent: '#a8b9a0', freeBg: '#e8dccb', borderStyle: 'solid', radius: 14,
    headerFont: '"Palatino Linotype", "Book Antiqua", Georgia, serif',
    cellFont: 'Georgia, "Times New Roman", serif'
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
