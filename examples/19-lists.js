// 19-lists.js
// Lists: schema integration and commands for ordered/bullet lists.
//
// This example extends a basic schema with list nodes using addListNodes,
// then wires up toolbar buttons and keyboard shortcuts for full list editing:
//   - Buttons to wrap the selection in bullet or ordered lists
//   - Enter to split (or exit) list items
//   - Tab / Shift-Tab to indent / un-indent (nest / lift)
//
// Try creating a list, then pressing Tab to nest items deeper.

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, DOMParser } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── List imports ──────────────────────────────────────────────
// addListNodes adds ordered_list, bullet_list, and list_item to a schema.
// The four commands handle all core list interactions.
import {
  addListNodes,
  wrapInList,
  splitListItem,
  liftListItem,
  sinkListItem,
} from "prosemirror-schema-list";

// ── Schema: extend basicSchema with list nodes ────────────────
// addListNodes(nodes, itemContent, listGroup):
//   - nodes: the existing OrderedMap of node specs
//   - itemContent: content expression for list_item ("paragraph block*"
//     means each item starts with a paragraph and can hold further blocks,
//     including nested lists)
//   - listGroup: the group to assign list types to ("block" so they
//     appear wherever blocks are allowed)
const mySchema = new Schema({
  nodes: addListNodes(basicSchema.spec.nodes, "paragraph block*", "block"),
  marks: basicSchema.spec.marks,
});

// ── Initial document with some starter content ────────────────
// We build it from HTML so you can see how the parser handles lists.
const startHTML = document.createElement("div");
startHTML.innerHTML = `
  <h2>List Commands Demo</h2>
  <p>Select a paragraph and click a list button to wrap it. Use
     <strong>Tab</strong> to indent and <strong>Shift-Tab</strong>
     to un-indent list items.</p>
  <ul>
    <li><p>First bullet item</p></li>
    <li>
      <p>Second item (try pressing Tab here to nest it)</p>
      <ul>
        <li><p>Already nested child</p></li>
      </ul>
    </li>
    <li><p>Third item</p></li>
  </ul>
  <ol>
    <li><p>Ordered item one</p></li>
    <li><p>Ordered item two</p></li>
  </ol>
  <p>A paragraph outside any list. Select it, then click "Bullet List".</p>
`;

// ── Keyboard shortcuts ────────────────────────────────────────
// splitListItem: Enter inside a list item splits it. If the item is empty,
//   it lifts out of the list (so pressing Enter twice exits a list).
// sinkListItem: Tab nests the item one level deeper under the previous sibling.
// liftListItem: Shift-Tab un-nests the item (moves it up one level).
const listKeymap = keymap({
  Enter: splitListItem(mySchema.nodes.list_item),
  Tab: sinkListItem(mySchema.nodes.list_item),
  "Shift-Tab": liftListItem(mySchema.nodes.list_item),
});

const state = EditorState.create({
  doc: DOMParser.fromSchema(mySchema).parse(startHTML),
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    // List keymap goes BEFORE baseKeymap so Enter is handled for lists first.
    // If the cursor isn't in a list, splitListItem returns false and
    // baseKeymap's Enter (createParagraphNear, etc.) takes over.
    listKeymap,
    keymap(baseKeymap),
  ],
});

// ── Create the editor view ────────────────────────────────────
const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
    updateButtons();
  },
});

// ── Toolbar ───────────────────────────────────────────────────
const toolbar = document.createElement("div");
toolbar.style.cssText =
  "margin:12px 0;display:flex;gap:8px;flex-wrap:wrap;align-items:center;";
document.querySelector("#editor").parentNode.appendChild(toolbar);

// Status line for feedback.
const statusEl = document.createElement("div");
statusEl.style.cssText =
  "margin:8px 0;padding:8px 12px;background:#f0f4f8;border:1px solid #c0d0e0;" +
  "font-size:13px;min-height:20px;border-radius:4px;";
document.querySelector("#editor").parentNode.appendChild(statusEl);

function setStatus(msg) {
  statusEl.textContent = msg;
}

// Helper: create a toolbar button wired to a command.
// Uses the dry-run pattern: call command without dispatch to check
// if it's applicable, then enable/disable the button accordingly.
function addButton(label, command, description) {
  const btn = document.createElement("button");
  btn.textContent = label;
  btn.title = description;
  btn.style.cssText = "padding:4px 12px;font-size:13px;cursor:pointer;";
  btn.addEventListener("mousedown", (e) => {
    e.preventDefault(); // Don't steal focus from the editor.
    const ran = command(view.state, view.dispatch, view);
    if (ran) {
      setStatus(`"${label}" applied.`);
    } else {
      setStatus(`"${label}" is not applicable here.`);
    }
    view.focus();
  });
  toolbar.appendChild(btn);
  return btn;
}

// wrapInList creates a command that wraps the selection in a list.
// Each call returns a new command function.
const wrapBullet = wrapInList(mySchema.nodes.bullet_list);
const wrapOrdered = wrapInList(mySchema.nodes.ordered_list);
const liftItem = liftListItem(mySchema.nodes.list_item);
const sinkItem = sinkListItem(mySchema.nodes.list_item);

const btnBullet = addButton("Bullet List", wrapBullet,
  "Wrap selection in a bullet list");
const btnOrdered = addButton("Ordered List", wrapOrdered,
  "Wrap selection in an ordered list");
const btnLift = addButton("Lift (un-nest)", liftItem,
  "Un-nest / lift out of list (Shift-Tab)");
const btnSink = addButton("Sink (indent)", sinkItem,
  "Nest one level deeper (Tab)");

// ── Update button enabled/disabled state ──────────────────────
// Dry run: call each command without dispatch. If it returns false,
// the command can't apply — so we gray out the button.
function updateButtons() {
  const buttons = [
    [btnBullet, wrapBullet],
    [btnOrdered, wrapOrdered],
    [btnLift, liftItem],
    [btnSink, sinkItem],
  ];
  for (const [btn, cmd] of buttons) {
    const applicable = cmd(view.state);
    btn.disabled = !applicable;
    btn.style.opacity = applicable ? "1" : "0.4";
  }
}

// Initial button state.
updateButtons();

// ────────────────────────────────────────────────────────────────
// Exercises:
//   1. Put your cursor on the paragraph at the bottom ("A paragraph
//      outside any list"). Click "Bullet List" — it becomes a list item.
//
//   2. Inside the bullet list, put your cursor at the end of "First
//      bullet item" and press Enter. A new empty item appears. Press
//      Enter again on the empty item — it exits the list.
//
//   3. Put your cursor on "Second item" and press Tab. It nests under
//      "First bullet item". Press Shift-Tab to un-nest it.
//
//   4. Notice the "Sink" button is disabled on the first item in a list.
//      Why? Because there's no preceding sibling to nest under.
//
//   5. Try selecting multiple paragraphs and clicking "Ordered List".
//      Each paragraph becomes a separate list item.
//
//   6. Look at the schema creation:
//        addListNodes(basicSchema.spec.nodes, "paragraph block*", "block")
//      Change "paragraph block*" to "paragraph" and re-run. Now try
//      pressing Tab to nest — it won't work because the content
//      expression forbids nested blocks inside list items.
