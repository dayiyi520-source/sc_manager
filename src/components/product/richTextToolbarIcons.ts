// Stroke-based toolbar glyphs keep the same visual weight at compact sizes.
const paths: Record<string, string> = {
  undo: 'M8 6 4 10l4 4 M4 10h9a6 6 0 0 1 0 12',
  redo: 'm16 6 4 4-4 4 M20 10h-9a6 6 0 0 0 0 12',
  'remove-formatting': 'M9 3h6v6H9z M4 9h16v4H4z M6 13l-2 8h16l-2-8 M9 17v4 M15 17v4',
  'chevron-down': 'm6 9 6 6 6-6',
  bold: 'M6 4h7a4 4 0 0 1 0 8H6 M6 12h8a4 4 0 0 1 0 8H6V4',
  italic: 'M10 4h9 M5 20h9 M15 4 9 20',
  'strike-through': 'M17 7c-1-4-10-4-10 1 0 2 2 3 5 4 M4 12h16 M7 17c1 4 10 4 10-1',
  underline: 'M6 4v8a6 6 0 0 0 12 0V4 M4 21h16',
  'text-color': 'm6 16 6-12 6 12 M9 11h6 M4 21h16',
  'highlight-bg-color': 'm5 9 7-7 8 8-7 7z M8 3l7 7 M5 9h14 M20 14c-3 3-3 5 0 5s3-2 0-5 M3 22h18',
  image: 'M3 4h18v16H3z M3 17l5-5 4 4 3-3 6 6 M9 8h.01',
  table: 'M3 4h18v16H3z M3 9h18 M3 14h18 M9 4v16 M15 4v16',
  link: 'm10 14 4-4 M8 16l-1 1a4 4 0 0 1-6-6l5-5a4 4 0 0 1 6 0 M16 8l1-1a4 4 0 0 1 6 6l-5 5a4 4 0 0 1-6 0',
  quote: 'M3 4h12v12H3z M9 10h12v12H9z',
  'code-sample': 'M3 3h18v18H3z m4 5 4 4-4 4 M13 16h4',
  'align-left': 'M3 4h18 M3 9h12 M3 14h18 M3 19h12',
  'align-center': 'M3 4h18 M6 9h12 M3 14h18 M6 19h12',
  'align-right': 'M3 4h18 M9 9h12 M3 14h18 M9 19h12',
  'unordered-list': 'M8 5h13 M8 12h13 M8 19h13 M3 5h.01 M3 12h.01 M3 19h.01',
  'ordered-list': 'M9 5h12 M9 12h12 M9 19h12 M3 2h1v5 M2 7h4 M2 10c3-2 5 1 1 3l-1 1h4 M2 17h4l-2 2c3 0 3 3-2 2',
  outdent: 'M3 4h18 M10 9h11 M10 14h11 M3 19h18 m3-11-4 4 4 4',
  indent: 'M3 4h18 M10 9h11 M10 14h11 M3 19h18 M2 8l4 4-4 4',
  'line-height': 'M3 5h12 M9 5v15 M5 20h8 M20 3v18 m-3-15 3-3 3 3 m-6 12 3 3 3-3',
  'format-painter': 'M3 3h15v6H3z M18 6h3v7H10v4 M8 17h4v5H8z',
};

export const toolbarIconMarkup = Object.fromEntries(Object.entries(paths).map(([name, path]) => [
  name,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" data-icon="${name === 'image' ? 'picture' : name}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path fill="none" d="${path}" /></svg>`,
]));
