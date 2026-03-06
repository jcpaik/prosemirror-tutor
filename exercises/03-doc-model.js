// ============================================================
// Exercise 03 — Explore the Document Model
// ============================================================
// Goal: Use ProseMirror's document inspection methods to
// answer questions about a built document. Log your answers
// to a results panel.
//
// Instructions:
//   1. A document is already created below.
//   2. Use doc methods to fill in each TODO.
//   3. Call log(label, value) to display your answers.
//
// Hints:
//   - doc.nodeSize — total size including open/close tokens
//   - doc.content.size — size of the content (no outer tokens)
//   - doc.childCount — number of direct children
//   - doc.child(n) — get the nth direct child
//   - doc.resolve(pos) — get a ResolvedPos at a position
//   - doc.nodeAt(pos) — get the node that starts at a position
//   - doc.descendants((node, pos) => { ... }) — walk all nodes
// ============================================================

import { schema } from "prosemirror-schema-basic";

// Build a document to explore
const doc = schema.node("doc", null, [
  schema.node("heading", { level: 1 }, [schema.text("Title")]),
  schema.node("paragraph", null, [schema.text("First paragraph.")]),
  schema.node("paragraph", null, [
    schema.text("Second "),
    schema.text("paragraph."),
  ]),
  schema.node("horizontal_rule"),
  schema.node("paragraph", null, [schema.text("After the rule.")]),
]);

// --- Helper: display results in the output panel ---
const container = document.querySelector("#editor");
container.style.fontFamily = "monospace";
container.style.fontSize = "14px";
container.style.whiteSpace = "pre-wrap";
container.style.padding = "12px";

function log(label, value) {
  const line = document.createElement("div");
  line.style.marginBottom = "6px";
  line.innerHTML =
    `<strong>${label}:</strong> ` +
    `<span style="color:#0057b7">${JSON.stringify(value)}</span>`;
  container.appendChild(line);
}

// ============================================================
// Questions — fill in the TODOs
// ============================================================

// Q1: What is doc.nodeSize? What is doc.content.size?
//     Why are they different?
// TODO: log both values
// log("doc.nodeSize", ???)
// log("doc.content.size", ???)

// Q2: How many direct children does the doc have?
// TODO: log doc.childCount
// log("doc.childCount", ???)

// Q3: What is the type name of the node at position 0?
//     What about position 1?
// TODO: use doc.nodeAt() for both positions and log the type names
// Hint: doc.nodeAt(pos)?.type.name
// log("nodeAt(0).type", ???)
// log("nodeAt(1).type", ???)

// Q4: Use doc.resolve(8) to get a ResolvedPos.
//     Log its depth, parent node type, and the index within the parent.
// TODO:
// const $pos = doc.resolve(8)
// log("resolve(8).depth", ???)
// log("resolve(8).parent.type", ???)
// log("resolve(8).index()", ???)

// Q5: Use doc.descendants() to collect the text content of
//     every text node. Log the resulting array.
// TODO:
// const texts = []
// doc.descendants((node) => { ... })
// log("All text nodes", texts)

// Q6: What is the position right before "horizontal_rule"?
//     Use descendants() to find it. What does doc.nodeAt(thatPos) return?
// TODO:
// log("horizontal_rule pos", ???)
// log("nodeAt that pos", ???)
