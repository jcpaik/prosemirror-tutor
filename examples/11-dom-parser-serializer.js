// 11-dom-parser-serializer.js
// DOMParser & DOMSerializer: converting between HTML and ProseMirror documents.
//
// This example provides:
//   - An HTML textarea where you type raw HTML
//   - A "Parse → Editor" button that feeds HTML through DOMParser into the editor
//   - An "Editor → HTML" button that serializes the current doc back to an HTML string
//   - An output panel showing the serialized HTML

import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import { Schema, DOMParser, DOMSerializer } from "prosemirror-model";
import { keymap } from "prosemirror-keymap";
import { baseKeymap } from "prosemirror-commands";
import { undo, redo, history } from "prosemirror-history";

// ── Schema: paragraph, heading, strong, em ─────────────────
// We keep it minimal so the HTML round-trip is easy to follow.
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

// ── Build the parser and serializer from the schema ────────
// fromSchema reads the toDOM/parseDOM rules we defined above.
const parser = DOMParser.fromSchema(mySchema);
const serializer = DOMSerializer.fromSchema(mySchema);

// ── Default HTML to start with ─────────────────────────────
const defaultHTML =
  `<h1>Hello World</h1>\n` +
  `<p>This is <strong>bold</strong> and <em>italic</em> text.</p>\n` +
  `<p>Edit me, or type new HTML in the textarea above!</p>`;

// ── UI: textarea for raw HTML input ────────────────────────
const root = document.querySelector("#editor");

const textarea = document.createElement("textarea");
textarea.value = defaultHTML;
textarea.style.cssText =
  "width:100%;height:90px;font-family:monospace;font-size:13px;" +
  "padding:8px;box-sizing:border-box;border:1px solid #bbb;border-radius:4px;";
root.appendChild(textarea);

// ── UI: buttons ────────────────────────────────────────────
const btnRow = document.createElement("div");
btnRow.style.cssText = "display:flex;gap:8px;margin:8px 0;";

const parseBtn = document.createElement("button");
parseBtn.textContent = "Parse → Editor";
parseBtn.style.cssText = "padding:6px 14px;cursor:pointer;font-size:13px;";

const serializeBtn = document.createElement("button");
serializeBtn.textContent = "Editor → HTML";
serializeBtn.style.cssText = "padding:6px 14px;cursor:pointer;font-size:13px;";

btnRow.appendChild(parseBtn);
btnRow.appendChild(serializeBtn);
root.appendChild(btnRow);

// ── UI: editor mount point ─────────────────────────────────
const editorMount = document.createElement("div");
editorMount.style.cssText =
  "border:1px solid #bbb;border-radius:4px;min-height:80px;padding:4px;";
root.appendChild(editorMount);

// ── UI: output panel for serialized HTML ───────────────────
const outputLabel = document.createElement("div");
outputLabel.textContent = "Serialized HTML output:";
outputLabel.style.cssText = "margin-top:12px;font-weight:bold;font-size:13px;";
root.appendChild(outputLabel);

const outputEl = document.createElement("pre");
outputEl.style.cssText =
  "margin:4px 0;padding:10px;background:#f0f4f8;border:1px solid #c0d0e0;" +
  "font-size:12px;max-height:200px;overflow:auto;white-space:pre-wrap;" +
  "word-break:break-word;line-height:1.5;border-radius:4px;";
root.appendChild(outputEl);

// ── Helper: parse an HTML string into a ProseMirror doc ────
// We create a temporary DOM element, set innerHTML, then hand it to the parser.
function htmlToDoc(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return parser.parse(tmp);
}

// ── Helper: serialize a ProseMirror doc to an HTML string ──
// serializeFragment returns a DocumentFragment; we extract innerHTML from a wrapper.
function docToHTML(doc) {
  const fragment = serializer.serializeFragment(doc.content);
  const div = document.createElement("div");
  div.appendChild(fragment);
  return div.innerHTML;
}

// ── Create the editor with the default HTML ────────────────
const state = EditorState.create({
  doc: htmlToDoc(defaultHTML),
  plugins: [
    history(),
    keymap({ "Mod-z": undo, "Mod-Shift-z": redo }),
    keymap(baseKeymap),
  ],
});

const view = new EditorView(editorMount, { state });

// ── Button: Parse → Editor ─────────────────────────────────
// Reads HTML from the textarea, parses it, and replaces the editor content.
parseBtn.addEventListener("click", () => {
  const html = textarea.value;
  const newDoc = htmlToDoc(html);

  // Replace the entire editor document with the parsed result.
  const tr = view.state.tr.replaceWith(
    0,
    view.state.doc.content.size,
    newDoc.content,
  );
  view.dispatch(tr);
});

// ── Button: Editor → HTML ──────────────────────────────────
// Serializes the current editor document and displays the HTML string.
serializeBtn.addEventListener("click", () => {
  const html = docToHTML(view.state.doc);
  outputEl.textContent = html;
});

// ────────────────────────────────────────────────────────────
// Things to try:
//
//   1. Click "Parse → Editor" to load the default HTML. Edit the text in the
//      editor, then click "Editor → HTML" to see the round-trip output.
//
//   2. Type new HTML in the textarea (e.g., <h2>New heading</h2><p>Text</p>)
//      and click "Parse → Editor". The editor updates to match.
//
//   3. Notice how the parser handles unknown tags gracefully — try typing
//      <div>Some text</div>. Since our schema has no "div" node, the parser
//      wraps the text in a paragraph instead.
//
//   4. Try HTML with marks: <p><b>Bold</b> and <i>italic</i></p>. The parser
//      matches <b> to the "strong" mark (via parseDOM: [{tag: "b"}]) and <i>
//      to "em".
//
//   5. Compare the textarea HTML with the serialized output. ProseMirror
//      normalizes the structure through the schema — what goes in may not come
//      out character-for-character identical, but it's semantically equivalent.
