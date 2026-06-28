/**
 * ASCII char vocabulary for the e2e grid renderer.
 *
 * Each Node in the fixture tree is mapped to a single char from this
 * list (cycled via `charIndex % NODE_CHARS.length`). A 15-char alphabet
 * is enough for every fixture in the suite — deeper trees would need
 * a denser encoding (digits, Greek, etc.), but TUI layouts rarely go
 * beyond 3-4 levels.
 *
 * Why "A" first and not the root's char by depth: the renderer writes
 * parent → child, child → subchild in stack order, and the FIRST
 * character in the alphabet goes to the root so reading the snapshot
 * top-down reads "A" → "B" → "C" in document order.
 *
 * EMPTY_CHAR is a Unicode LIGHT SHADE (░, U+2591) so empty grid cells
 * are visually distinct from any node char. Picking a real Unicode
 * block element (vs. plain space) makes the snapshot easy to skim in
 * a code review — you can see at a glance "A fills 5 columns, then
 * 12 empty cells, then B fills 7 columns".
 */
export const NODE_CHARS = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'I',
  'J',
  'K',
  'L',
  'M',
  'N',
  'O',
] as const;

/** A cell that no node filled. */
export const EMPTY_CHAR = '░';
