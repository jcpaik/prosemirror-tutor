// 16-decorations.js
// Decorations: modifying how the document renders without changing its content.
//
// This example demonstrates all three decoration types working simultaneously:
//   1. Inline decorations — highlight all matches of a search term (yellow)
//   2. Widget decoration  — a paragraph-count badge injected at position 0
//   3. Node decoration    — the block containing the cursor gets class="active"
//
// Decorations are stored in plugin state and mapped through each transaction.
// The search term is communicated to the plugin via transaction metadata.

import { EditorState, Plugin, PluginKey } from "prosemirror-state";
import { EditorView, Decoration, DecorationSet } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── Schema ─────────────────────────────────────────────────────
const schema = new Schema({
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
      attrs: { level: { default: 2 } },
      toDOM(node) { return ["h" + node.attrs.level, 0]; },
      parseDOM: [{ tag: "h2", attrs: { level: 2 } }],
    },
    text: { group: "inline", inline: true },
  },
  marks: {
    strong: {
      toDOM() { return ["strong", 0]; },
      parseDOM: [{ tag: "strong" }],
    },
    em: {
      toDOM() { return ["em", 0]; },
      parseDOM: [{ tag: "em" }],
    },
  },
});

// ── Initial document ───────────────────────────────────────────
const initDoc = schema.node("doc", null, [
  schema.node("heading", { level: 2 }, [
    schema.text("Decorations Demo"),
  ]),
  schema.node("paragraph", null, [
    schema.text("Type a search term in the box above the editor. "),
    schema.text("All matches", [schema.marks.strong.create()]),
    schema.text(" in this document will be highlighted with a yellow background."),
  ]),
  schema.node("paragraph", null, [
    schema.text("Click in different paragraphs to see the "),
    schema.text("active block", [schema.marks.em.create()]),
    schema.text(" decoration — the current block gets a blue left border."),
  ]),
  schema.node("paragraph", null, [
    schema.text("The paragraph count badge at the top is a widget decoration. "),
    schema.text("Try adding or removing paragraphs to see it update."),
  ]),
]);

// ── Plugin key for metadata communication ──────────────────────
const decoKey = new PluginKey("decorations");

// ── Helper: find all occurrences of a search string in the doc ─
// Returns an array of {from, to} ranges.
function findMatches(doc, searchTerm) {
  if (!searchTerm) return [];
  const results = [];
  const lowerTerm = searchTerm.toLowerCase();
  // Walk every text node in the document
  doc.descendants((node, pos) => {
    if (node.isText) {
      const text = node.text.toLowerCase();
      let index = 0;
      // Find all occurrences within this text node
      while ((index = text.indexOf(lowerTerm, index)) !== -1) {
        results.push({ from: pos + index, to: pos + index + searchTerm.length });
        index += 1; // advance by 1 to catch overlapping matches
      }
    }
  });
  return results;
}

// ── Helper: count paragraph nodes ──────────────────────────────
function countParagraphs(doc) {
  let count = 0;
  doc.descendants((node) => {
    if (node.type.name === "paragraph") count++;
  });
  return count;
}

// ── Helper: build all three decoration types ───────────────────
function buildDecorations(doc, searchTerm, cursorPos) {
  const decorations = [];

  // --- 1. Inline decorations: search highlights ---
  // Each match gets a yellow background via an inline decoration.
  const matches = findMatches(doc, searchTerm);
  for (const { from, to } of matches) {
    decorations.push(
      Decoration.inline(from, to, {
        style: "background: #fde68a; border-radius: 2px;",
      })
    );
  }

  // --- 2. Widget decoration: paragraph count badge ---
  // Inserted at position 0 (before all document content).
  // The `side: -1` ensures it renders before content at that position.
  const paraCount = countParagraphs(doc);
  decorations.push(
    Decoration.widget(0, () => {
      const badge = document.createElement("div");
      badge.style.cssText =
        "display:inline-block;padding:2px 10px;margin-bottom:8px;" +
        "background:#dbeafe;color:#1e40af;border-radius:12px;" +
        "font-size:12px;font-weight:600;";
      badge.textContent = `${paraCount} paragraph${paraCount !== 1 ? "s" : ""}`;
      return badge;
    }, { side: -1, key: "para-count" })
    // `key` lets ProseMirror identify this widget across updates,
    // so it can reuse or replace the DOM node instead of destroying it.
  );

  // --- 3. Node decoration: active block ---
  // Find the top-level block that contains the cursor and give it a class.
  if (cursorPos != null) {
    const $pos = doc.resolve(cursorPos);
    // Walk up to depth 1 (direct child of doc) to find the top-level block.
    if ($pos.depth >= 1) {
      const blockStart = $pos.before(1); // position right before the block node
      const blockNode = $pos.node(1);    // the block node itself
      const blockEnd = blockStart + blockNode.nodeSize;
      decorations.push(
        Decoration.node(blockStart, blockEnd, {
          class: "active",
          style: "border-left: 3px solid #3b82f6; padding-left: 8px;",
        })
      );
    }
  }

  return decorations;
}

// ── The decoration plugin ──────────────────────────────────────
// Stores {decoSet, searchTerm} in plugin state.
// - On normal edits: maps existing decorations and rebuilds
//   (since cursor position and paragraph count can change on any edit).
// - On search term change: receives the new term via tr.getMeta(decoKey)
//   and does a full rebuild.
const decorationPlugin = new Plugin({
  key: decoKey,

  state: {
    init(_, { doc }) {
      // No search term initially; still build widget + active-block decos
      const searchTerm = "";
      const decos = buildDecorations(doc, searchTerm, null);
      return {
        decoSet: DecorationSet.create(doc, decos),
        searchTerm,
      };
    },

    apply(tr, prev, _oldState, newState) {
      // Check if the search term changed via metadata
      const meta = tr.getMeta(decoKey);
      const searchTerm = meta != null ? meta.searchTerm : prev.searchTerm;

      // We rebuild decorations on every transaction because the cursor
      // position and paragraph count can change with any edit.
      // For a large document you might map + selectively update instead.
      const cursorPos = newState.selection.from;
      const decos = buildDecorations(tr.doc, searchTerm, cursorPos);
      return {
        decoSet: DecorationSet.create(tr.doc, decos),
        searchTerm,
      };
    },
  },

  props: {
    // This is how the view reads decorations from plugin state.
    decorations(state) {
      return decoKey.getState(state).decoSet;
    },
  },
});

// ── Search input UI ────────────────────────────────────────────
// We build a text input above the editor. Typing dispatches a transaction
// with metadata so the plugin knows to update its search term.
const wrapper = document.querySelector("#editor");
wrapper.style.cssText = "display:flex;flex-direction:column;height:100%;";

const searchBar = document.createElement("div");
searchBar.style.cssText = "padding:6px 0;display:flex;align-items:center;gap:8px;";

const label = document.createElement("label");
label.textContent = "Search: ";
label.style.cssText = "font-size:13px;font-weight:600;color:#374151;";

const searchInput = document.createElement("input");
searchInput.type = "text";
searchInput.placeholder = "type to highlight matches...";
searchInput.style.cssText =
  "flex:1;padding:4px 8px;border:1px solid #d1d5db;border-radius:4px;" +
  "font-size:13px;outline:none;";

searchBar.appendChild(label);
searchBar.appendChild(searchInput);
wrapper.appendChild(searchBar);

const editorMount = document.createElement("div");
wrapper.appendChild(editorMount);

// ── Create the editor ──────────────────────────────────────────
const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap(baseKeymap),
    decorationPlugin,
  ],
});

const view = new EditorView(editorMount, {
  state,
  dispatchTransaction(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
  },
});

// When the user types in the search box, dispatch a transaction with
// the new search term as metadata. The plugin picks it up in apply().
searchInput.addEventListener("input", () => {
  const tr = view.state.tr;
  tr.setMeta(decoKey, { searchTerm: searchInput.value });
  view.dispatch(tr);
});

// Focus the editor initially
view.focus();

// ────────────────────────────────────────────────────────────────
// Exercises:
//   1. Type "the" in the search box. Notice how all case-insensitive
//      matches highlight in yellow — these are inline decorations.
//
//   2. Click in different paragraphs. The blue left border moves to
//      the block containing your cursor — that's a node decoration.
//
//   3. Add new paragraphs (press Enter) and watch the badge update
//      its count — that's a widget decoration being rebuilt.
//
//   4. Try typing inside a highlighted match. The highlight adjusts
//      because decorations are rebuilt on every transaction.
//
//   5. (Challenge) Modify the code to highlight the *current match*
//      in orange and other matches in yellow, like a real find dialog.
