// 25-gapcursor-dropcursor.js
// Gap Cursor and Drop Cursor: placing the cursor in otherwise unreachable
// positions, and showing a visual indicator during drag-and-drop.
//
// This editor has consecutive horizontal rules and a code block — places
// where a normal text cursor can't go. The gapCursor plugin lets you
// arrow-key or click into those gaps. The dropCursor plugin draws a line
// when you drag content over the editor.

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";
import { gapCursor } from "prosemirror-gapcursor";
import { dropCursor } from "prosemirror-dropcursor";

// CSS imports are stripped by the tutor's import rewriter, so we must
// inject the gap cursor styles manually via a <style> element.
import "prosemirror-gapcursor/style/gapcursor.css";

const gapCursorCSS = `
.ProseMirror-gapcursor {
  display: none;
  pointer-events: none;
  position: absolute;
}
.ProseMirror-gapcursor:after {
  content: "";
  display: block;
  position: absolute;
  top: -2px;
  width: 20px;
  border-top: 1px solid black;
  animation: ProseMirror-cursor-blink 1.1s steps(2, start) infinite;
}
@keyframes ProseMirror-cursor-blink {
  to { visibility: hidden; }
}
.ProseMirror-focused .ProseMirror-gapcursor {
  display: block;
}
`;

// Inject the CSS into the document head
const styleEl = document.createElement("style");
styleEl.textContent = gapCursorCSS;
document.head.appendChild(styleEl);

// ── Schema ─────────────────────────────────────────────────
// We include horizontal_rule and code_block as non-text blocks that
// create gaps where a normal cursor can't be placed.
const mySchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      // draggable: false is the default — paragraphs can still be
      // dragged via browser selection drag
      toDOM() { return ["p", 0]; },
      parseDOM: [{ tag: "p" }],
    },
    heading: {
      group: "block",
      content: "inline*",
      attrs: { level: { default: 2 } },
      toDOM(node) { return ["h" + node.attrs.level, 0]; },
      parseDOM: [{ tag: "h2", attrs: { level: 2 } }],
    },
    code_block: {
      group: "block",
      content: "text*",
      code: true,
      toDOM() {
        return ["pre", ["code", 0]];
      },
      parseDOM: [{ tag: "pre", preserveWhitespace: "full" }],
    },
    horizontal_rule: {
      group: "block",
      // Leaf block node — no content, no text cursor position inside it.
      // This is the classic gap-cursor scenario.
      toDOM() { return ["hr"]; },
      parseDOM: [{ tag: "hr" }],
    },
    text: { group: "inline", inline: true },
  },
  marks: {
    strong: {
      toDOM() { return ["strong", 0]; },
      parseDOM: [{ tag: "strong" }],
    },
  },
});

// ── Initial document ───────────────────────────────────────
// Two horizontal rules in a row create a gap that only gapCursor can reach.
// The code block also creates gaps before/after it.
const initDoc = mySchema.node("doc", null, [
  mySchema.node("heading", { level: 2 }, [
    mySchema.text("Gap Cursor & Drop Cursor Demo"),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Use arrow keys to move down through the horizontal rules below."),
  ]),
  // ── Two adjacent horizontal rules — the classic gap scenario ──
  mySchema.node("horizontal_rule"),
  mySchema.node("horizontal_rule"),
  mySchema.node("horizontal_rule"),
  mySchema.node("paragraph", null, [
    mySchema.text("You can place a gap cursor between those three rules. " +
      "Try arrow-keying down from the paragraph above, or clicking in the gap."),
  ]),
  mySchema.node("code_block", null, [
    mySchema.text("// This is a code block.\n// There's a gap before and after it\n// when adjacent to non-text blocks."),
  ]),
  mySchema.node("horizontal_rule"),
  mySchema.node("paragraph", null, [
    mySchema.text("Try dragging this paragraph up or down — " +
      "the blue drop cursor shows where it will land."),
  ]),
]);

// ── Editor state with both plugins ────────────────────────
// gapCursor() — enables GapCursor selection in unreachable spots.
// dropCursor() — draws a colored line during drag-and-drop.
const state = EditorState.create({
  doc: initDoc,
  plugins: [
    gapCursor(),
    dropCursor({ color: "#4a9eff", width: 2 }),
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap(baseKeymap),
  ],
});

// ── Debug panel ───────────────────────────────────────────
// Shows the current selection type so you can see when a GapCursor is active.
const debugEl = document.createElement("pre");
debugEl.style.cssText =
  "margin:12px 0;padding:12px;background:#f0f4f8;border:1px solid #c0d0e0;" +
  "font-size:12px;max-height:250px;overflow:auto;line-height:1.6;" +
  "white-space:pre-wrap;word-break:break-word;";
document.querySelector("#editor").parentNode.appendChild(debugEl);

function updateDebug(view) {
  const { selection } = view.state;
  const lines = [];

  // Detect the selection type by constructor name.
  // GapCursor comes from prosemirror-gapcursor; it extends Selection.
  const typeName = selection.constructor.name || "Selection";

  lines.push("═══ SELECTION ═══");
  lines.push(`  type:   ${typeName}`);
  lines.push(`  from:   ${selection.from}`);
  lines.push(`  to:     ${selection.to}`);
  lines.push(`  empty:  ${selection.empty}`);

  // When a GapCursor is active, show extra context
  if (typeName === "GapCursor") {
    lines.push("");
    lines.push("═══ GAP CURSOR DETAIL ═══");
    lines.push("  A blinking line should appear in the gap.");
    lines.push("  Type text to insert a new paragraph here.");
    const $pos = selection.$from;
    lines.push(`  depth:  ${$pos.depth}`);
    lines.push(`  parent: <${$pos.parent.type.name}>`);

    // Show what's on either side of the gap
    const index = $pos.index($pos.depth);
    const before = $pos.nodeBefore;
    const after = $pos.nodeAfter;
    lines.push(`  before: ${before ? "<" + before.type.name + ">" : "(start of parent)"}`);
    lines.push(`  after:  ${after ? "<" + after.type.name + ">" : "(end of parent)"}`);
  }

  debugEl.textContent = lines.join("\n");
}

// ── Create the editor view ─────────────────────────────────
const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
    updateDebug(this);
  },
});

// Initial render
updateDebug(view);

// ────────────────────────────────────────────────────────────
// Exercises:
//   1. Place your cursor in the first paragraph and press the down arrow
//      key repeatedly. Watch the debug panel — the selection type changes
//      to "GapCursor" when you enter the gap between horizontal rules.
//
//   2. While the gap cursor is active (blinking line visible), type some
//      text. A new paragraph is inserted at that position.
//
//   3. Click directly in the small space between two <hr> elements.
//      The gap cursor should activate there too.
//
//   4. Select some text, then drag it to a different position in the
//      editor. The blue line from dropCursor shows the drop target.
//
//   5. Try removing the gapCursor() plugin from the plugins array.
//      Arrow-key past the horizontal rules — the cursor jumps over the
//      gap entirely. You can no longer place the cursor there.
//
//   6. Try changing the dropCursor options: set color to "red" and
//      width to 4. Drag content again to see the thicker red indicator.
