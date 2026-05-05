// 20-node-views.js
// Node Views: custom rendering for individual node types.
//
// This example demonstrates two node views:
//   1. A "counter" node — an inline leaf that renders as a clickable button.
//      Clicking it increments the count via a transaction (setNodeMarkup).
//   2. A "paragraph" node view — adds an "empty" CSS class when the paragraph
//      has no text, while keeping content editable via contentDOM.

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── Schema ──────────────────────────────────────────────────
// We define a schema with a custom inline "counter" node that stores
// a numeric `count` attribute and renders as an atom (no editable content).

const mySchema = new Schema({
  nodes: {
    doc: { content: "block+" },
    paragraph: {
      group: "block",
      content: "inline*",
      // toDOM is still needed as a fallback and for serialization,
      // but our node view will override rendering in the editor.
      toDOM() { return ["p", 0]; },
      parseDOM: [{ tag: "p" }],
    },
    // The counter node: inline, leaf (no content), atom (treated as a unit).
    // It stores a `count` attribute that the node view will display.
    counter: {
      group: "inline",
      inline: true,
      atom: true,
      attrs: { count: { default: 0 } },
      toDOM(node) {
        return ["button", {
          class: "counter-btn",
          "data-count": node.attrs.count,
        }, `${node.attrs.count}`];
      },
      parseDOM: [{
        tag: "button.counter-btn",
        getAttrs(dom) {
          return { count: Number(dom.getAttribute("data-count")) || 0 };
        },
      }],
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

// ── Counter Node View ───────────────────────────────────────
// This node view renders a <button> showing the current count.
// Clicking the button dispatches a transaction that increments the count.

class CounterView {
  constructor(node, view, getPos) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;

    // Create the outer DOM element — a styled <button>.
    this.dom = document.createElement("button");
    this.dom.className = "counter-btn";
    this.dom.textContent = node.attrs.count;
    this.dom.title = "Click to increment";

    // Attach a click handler that dispatches a transaction.
    this.dom.addEventListener("mousedown", (e) => {
      e.preventDefault(); // Prevent ProseMirror from treating this as a selection
      const pos = this.getPos();
      const newCount = this.node.attrs.count + 1;
      // setNodeMarkup replaces the node at `pos` with one that has new attrs.
      const tr = this.view.state.tr.setNodeMarkup(pos, null, {
        count: newCount,
      });
      this.view.dispatch(tr);
    });
  }

  // update() is called when the node's attrs or content change.
  // We check if the node type still matches and patch the DOM.
  update(node) {
    if (node.type !== this.node.type) return false;
    this.node = node;
    this.dom.textContent = node.attrs.count;
    return true;
  }

  // stopEvent: we handle mousedown ourselves, so tell ProseMirror
  // not to process it. Let other events (e.g., arrow keys) through.
  stopEvent(event) {
    return event.type === "mousedown";
  }

  // ignoreMutation: we manage our own DOM text content, so ignore
  // text changes that ProseMirror's MutationObserver might see.
  ignoreMutation() {
    return true;
  }

  // selectNode / deselectNode: visual feedback when the node is
  // selected with node selection (e.g., clicking the atom).
  selectNode() {
    this.dom.classList.add("ProseMirror-selectednode");
  }

  deselectNode() {
    this.dom.classList.remove("ProseMirror-selectednode");
  }

  destroy() {
    // No timers or external resources to clean up in this case,
    // but this is where you would do it.
  }
}

// ── Paragraph Node View ─────────────────────────────────────
// This node view adds a CSS class "empty" when the paragraph has no
// text content. It uses contentDOM so ProseMirror still manages the
// paragraph's inline children (text, counters, etc.).

class ParagraphView {
  constructor(node) {
    // When dom and contentDOM are the same element, ProseMirror renders
    // the node's children directly inside it.
    this.dom = this.contentDOM = document.createElement("p");
    if (node.content.size === 0) {
      this.dom.classList.add("empty");
    }
  }

  // update(): toggle the "empty" class based on new content.
  // Return true to accept the update (no need to recreate the view).
  update(node) {
    if (node.content.size > 0) {
      this.dom.classList.remove("empty");
    } else {
      this.dom.classList.add("empty");
    }
    return true;
  }
}

// ── Styles ──────────────────────────────────────────────────
// Inject some CSS so the node views look presentable.

const style = document.createElement("style");
style.textContent = `
  .counter-btn {
    display: inline-block;
    min-width: 2em;
    padding: 2px 8px;
    margin: 0 2px;
    border: 1px solid #4a90d9;
    border-radius: 4px;
    background: #e8f0fe;
    color: #1a56db;
    font: inherit;
    font-weight: bold;
    cursor: pointer;
    vertical-align: baseline;
    line-height: 1.4;
  }
  .counter-btn:hover {
    background: #d0e0fd;
  }
  .counter-btn.ProseMirror-selectednode {
    outline: 2px solid #4a90d9;
  }

  /* Empty paragraphs get a placeholder via CSS ::before */
  p.empty::before {
    content: "Type something here...";
    color: #aaa;
    font-style: italic;
    pointer-events: none;
  }
`;
document.head.appendChild(style);

// ── Build the initial document ──────────────────────────────
// A heading-like intro, a paragraph with inline counters, and an
// empty paragraph to show the "empty" class behavior.

const initDoc = mySchema.node("doc", null, [
  mySchema.node("paragraph", null, [
    mySchema.text("Node Views Demo", [mySchema.marks.strong.create()]),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("Click the counters to increment: "),
    mySchema.node("counter", { count: 0 }),
    mySchema.text(" and "),
    mySchema.node("counter", { count: 10 }),
    mySchema.text(". Each click dispatches a transaction."),
  ]),
  mySchema.node("paragraph", null, [
    mySchema.text("This paragraph has content, so no placeholder appears."),
  ]),
  // Empty paragraph — the ParagraphView will add class="empty"
  mySchema.node("paragraph"),
]);

// ── Editor setup ────────────────────────────────────────────

const state = EditorState.create({
  doc: initDoc,
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap(baseKeymap),
  ],
});

const view = new EditorView(document.querySelector("#editor"), {
  state,

  // nodeViews: the key maps a node type name to a factory function.
  // The factory receives (node, view, getPos) and returns a node view object.
  nodeViews: {
    counter(node, view, getPos) {
      return new CounterView(node, view, getPos);
    },
    paragraph(node) {
      return new ParagraphView(node);
    },
  },
});

// ────────────────────────────────────────────────────────────
// Exercises:
//   1. Click each counter button. Watch the number increment. Open
//      the browser console — each click dispatches a transaction with
//      setNodeMarkup that updates the counter's `count` attribute.
//
//   2. Click into the empty paragraph at the bottom. The placeholder
//      ("Type something here...") disappears as you type. Delete all
//      text and it reappears — that's the ParagraphView toggling the
//      "empty" CSS class in its update() method.
//
//   3. Try selecting a counter with arrow keys (place cursor next to
//      it and press arrow). Notice the blue outline — that's the
//      selectNode() / deselectNode() methods in action.
//
//   4. Challenge: add a "reset" button next to each counter that sets
//      the count back to 0. Hint: dispatch a setNodeMarkup transaction
//      with { count: 0 }.
//
//   5. Challenge: modify ParagraphView so the empty placeholder text
//      is configurable via a node attribute instead of being hardcoded
//      in CSS.
