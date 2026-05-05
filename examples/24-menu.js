// 24-menu.js
// Menu Bar Basics: building a toolbar with prosemirror-menu.
//
// Demonstrates:
//   - MenuItem with run, label, select, active, and enable
//   - Dropdown grouping items under a collapsible label
//   - menuBar plugin rendering a toolbar above the editor
//   - Bold/italic toggles, heading dropdown, undo/redo buttons
//   - How select hides, enable disables, and active highlights

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, toggleMark, setBlockType } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";
import { MenuItem, Dropdown, menuBar, icons, blockTypeItem } from "prosemirror-menu";

// Menu CSS is loaded globally by the tutor page; this import is
// stripped by the import transform but shown here for documentation.
import "prosemirror-menu/style/menu.css";

// ── Schema: paragraph, heading (h1-h3), strong, em ──────────
const mySchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      toDOM() { return ["p", 0]; },
      parseDOM: [{ tag: "p" }],
    },
    heading: {
      group: "block",
      content: "inline*",
      attrs: { level: { default: 1 } },
      // Render as <h1>, <h2>, or <h3> depending on the level attribute.
      toDOM(node) { return ["h" + node.attrs.level, 0]; },
      parseDOM: [
        { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 3 } },
      ],
    },
    text: { group: "inline", inline: true },
  },
  marks: {
    strong: {
      toDOM() { return ["strong", 0]; },
      parseDOM: [{ tag: "strong" }, { tag: "b" }],
    },
    em: {
      toDOM() { return ["em", 0]; },
      parseDOM: [{ tag: "em" }, { tag: "i" }],
    },
  },
});

// ── Helper: check if a mark is active at the cursor ─────────
// Returns true when the cursor is inside text that carries the
// given mark type (or when the entire selection has it).
function markActive(state, markType) {
  const { from, $from, to, empty } = state.selection;
  if (empty) {
    // Collapsed cursor: check storedMarks (explicitly toggled) or
    // the marks at the cursor position.
    return !!(state.storedMarks || $from.marks())
      .some(m => m.type === markType);
  }
  // Range selection: check whether the mark covers the whole range.
  return state.doc.rangeHasMark(from, to, markType);
}

// ── Menu items ──────────────────────────────────────────────

// Bold toggle button.
// - run: toggles the strong mark on/off.
// - active: returns true when cursor is in bold text, so the
//   button gets a highlighted "pressed" style.
// - select: always true (bold is always applicable in inline content).
const boldItem = new MenuItem({
  run(state, dispatch) {
    toggleMark(mySchema.marks.strong)(state, dispatch);
  },
  // Use the built-in bold SVG icon from prosemirror-menu.
  icon: icons.strong,
  title: "Toggle bold (Mod-b)",
  // Highlight when the cursor is in bold text.
  active(state) {
    return markActive(state, mySchema.marks.strong);
  },
});

// Italic toggle button — same pattern as bold.
const italicItem = new MenuItem({
  run(state, dispatch) {
    toggleMark(mySchema.marks.em)(state, dispatch);
  },
  icon: icons.em,
  title: "Toggle italic (Mod-i)",
  active(state) {
    return markActive(state, mySchema.marks.em);
  },
});

// ── Heading dropdown ────────────────────────────────────────
// Each heading level is a MenuItem inside a Dropdown.
// blockTypeItem is a helper that creates a MenuItem for changing
// the block type around the selection. It automatically provides:
//   - run: calls setBlockType to change the block
//   - active: returns true when the current block matches
//   - select: returns false when the block can't be changed

const h1Item = blockTypeItem(mySchema.nodes.heading, {
  attrs: { level: 1 },
  label: "Heading 1",
  title: "Change to heading level 1",
});

const h2Item = blockTypeItem(mySchema.nodes.heading, {
  attrs: { level: 2 },
  label: "Heading 2",
  title: "Change to heading level 2",
});

const h3Item = blockTypeItem(mySchema.nodes.heading, {
  attrs: { level: 3 },
  label: "Heading 3",
  title: "Change to heading level 3",
});

// A "Paragraph" item to switch back from a heading to a paragraph.
const paragraphItem = blockTypeItem(mySchema.nodes.paragraph, {
  label: "Paragraph",
  title: "Change to plain paragraph",
});

// Group heading items under a single dropdown.
const headingDropdown = new Dropdown(
  [paragraphItem, h1Item, h2Item, h3Item],
  { label: "Type", title: "Change block type" },
);

// ── Undo / Redo buttons ─────────────────────────────────────
// These use `enable` to gray out when there's nothing to undo/redo,
// rather than `select` (which would hide them entirely).

const undoItem = new MenuItem({
  run(state, dispatch) { undo(state, dispatch); },
  icon: icons.undo,
  title: "Undo (Mod-z)",
  // enable returns false when there's no undo history,
  // which grays out the button but keeps it visible.
  enable(state) { return undo(state); },
});

const redoItem = new MenuItem({
  run(state, dispatch) { redo(state, dispatch); },
  icon: icons.redo,
  title: "Redo (Mod-Shift-z)",
  enable(state) { return redo(state); },
});

// ── Build the menu bar plugin ───────────────────────────────
// content is an array of groups. Each group is an array of
// MenuElement items. Groups are visually separated by dividers.
//
//   Group 1: inline mark toggles (bold, italic)
//   Group 2: block type dropdown (heading levels)
//   Group 3: history (undo, redo)

const myMenuBar = menuBar({
  content: [
    [boldItem, italicItem],
    [headingDropdown],
    [undoItem, redoItem],
  ],
});

// ── Initial document ────────────────────────────────────────
const initDoc = mySchema.node("doc", null, [
  mySchema.node("heading", { level: 1 }, [
    mySchema.text("Menu Bar Demo"),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Try the toolbar above. Click "),
    mySchema.text("Bold", [mySchema.marks.strong.create()]),
    mySchema.text(" or "),
    mySchema.text("Italic", [mySchema.marks.em.create()]),
    mySchema.text(" to toggle marks on selected text."),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Use the \"Type\" dropdown to switch this paragraph to a "),
    mySchema.text("heading"),
    mySchema.text(". Notice how the dropdown items highlight to show the "),
    mySchema.text("current", [mySchema.marks.strong.create()]),
    mySchema.text(" block type (that's the active callback)."),
  ]),
  mySchema.node("heading", { level: 2 }, [
    mySchema.text("Try undo/redo"),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Make some edits, then click the undo/redo buttons. "),
    mySchema.text("They gray out (via enable) when there's nothing to undo or redo."),
  ]),
]);

// ── Create editor state with menu bar + keybindings ─────────
const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap({
      "Mod-b": toggleMark(mySchema.marks.strong),
      "Mod-i": toggleMark(mySchema.marks.em),
    }),
    keymap(baseKeymap),
    // The menu bar plugin — must be included in the plugins array
    // just like history() or keymap(). It wraps the editor DOM and
    // inserts the toolbar above it.
    myMenuBar,
  ],
});

// ── Create the editor view ──────────────────────────────────
const view = new EditorView(document.querySelector("#editor"), { state });

// ────────────────────────────────────────────────────────────
// Exercises:
//   1. Select some text and click the Bold button. Notice it
//      becomes highlighted (active). Click again to remove bold.
//
//   2. Place your cursor inside a heading. Open the "Type"
//      dropdown — the matching heading level should be highlighted.
//      Select "Paragraph" to convert it back.
//
//   3. Look at the undo button before making any edits — it's
//      grayed out (enable returns false). Make an edit and watch
//      it become clickable.
//
//   4. Try adding a new MenuItem with label "Clear formatting"
//      that removes all marks from the selection. Hint: use
//      tr.removeMark(from, to) with no mark argument.
//
//   5. Experiment with `select` vs `enable`: change the undo
//      item to use `select` instead of `enable`. The button
//      disappears entirely instead of graying out. Which UX
//      is better?
