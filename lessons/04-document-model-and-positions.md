# 04 — The Document Model and Positions

## Documents are Node Trees

A ProseMirror document is a **tree of nodes**, just like the DOM — but with a
critical difference in how inline content works.

```
doc
├── paragraph
│   ├── "Hello "        (text node)
│   ├── "world"         (text node, with bold mark)
│   └── "!"             (text node)
└── paragraph
    └── "Second para."  (text node)
```

### Block vs. inline

- **Block nodes** (paragraphs, headings, blockquotes) form the tree structure.
- **Inline content** (text, images) lives *inside* block nodes.
- Block and inline can't be siblings — a paragraph can't contain another
  paragraph.

### Flat inline model — the big difference from HTML

In HTML, bold and italic create nested tags:

```html
<p>This is <strong>strong <em>and emphasized</em></strong></p>
```

ProseMirror flattens this. Inline content is a **flat sequence of text nodes**
with **marks** (bold, italic, etc.) attached as metadata:

```
paragraph
  "This is "
  "strong "          [bold]
  "and emphasized"   [bold, italic]
```

Why? Because it lets us address any position inside a paragraph with a simple
**character offset** instead of navigating a tree. This makes positions simple
integers, which makes everything else simpler.

## Positions — the Numbering System

Every spot in a document has an integer **position**. Understanding how
positions work is essential for manipulating documents programmatically.

### Counting rules

1. **Entering or leaving** a non-leaf node costs 1 token each (like `<p>` and
   `</p>` in HTML).
2. Each **character** in a text node costs 1 token.
3. **Leaf nodes** (like images, horizontal rules) cost 1 token.

### Example

```
Document: <doc><p>One</p><blockquote><p>Two</p></blockquote></doc>

Position map:
0   1 2 3 4    5            6   7 8 9 10   11            12
 <p> O n e </p> <blockquote> <p> T w o </p> </blockquote>
```

- Position 0 = before the first `<p>` (start of the document's content)
- Position 1 = inside `<p>`, before "O"
- Position 4 = inside `<p>`, after "e"
- Position 5 = after `</p>`, before `<blockquote>`
- Position 12 = end of document content

**Important**: the document node's own open/close tokens don't count. So the
document's content runs from 0 to `doc.content.size`, not from 0 to
`doc.nodeSize`.

### `node.resolve(pos)` — understanding a position

Given a position, `doc.resolve(pos)` returns a `ResolvedPos` with rich context:

```js
const $pos = doc.resolve(8);   // position 8 in the example above
$pos.parent;      // → the <p> node inside the blockquote
$pos.depth;       // → 2 (doc → blockquote → paragraph)
$pos.parentOffset; // → 1 (one character into the paragraph: "w")
$pos.index();     // → which child of the parent this position is in/before
```

The `$` prefix (`$pos`, `$from`, `$to`) is a ProseMirror convention for
resolved positions.

## Navigating the Tree

Nodes expose methods for walking the tree:

```js
doc.content            // Fragment containing child nodes
doc.childCount         // Number of children
doc.child(0)           // First child node
doc.firstChild         // Same as child(0)
node.textContent       // Concatenated text of all descendants
node.nodeAt(pos)       // Node at the given position (relative to this node)
```

### node.forEach and node.descendants

```js
// Iterate direct children
doc.forEach((child, offset, index) => {
  console.log(`Child ${index} at offset ${offset}: ${child.type.name}`);
});

// Walk all descendants (depth-first)
doc.descendants((node, pos) => {
  console.log(`${node.type.name} at position ${pos}`);
  // Return false to skip this node's children
});
```

## Slices — Portions of a Document

A `Slice` represents content between two positions. It handles the tricky case
where the selection might start and end partway through nodes.

```js
const slice = doc.slice(1, 4);    // "One" from the first paragraph
slice.content;     // Fragment with the extracted nodes
slice.openStart;   // How many levels are "open" at the start
slice.openEnd;     // How many levels are "open" at the end
```

When `openStart` or `openEnd` is > 0, it means the slice doesn't include the
full wrapping node — just part of it. This matters for copy/paste: if you
select text *within* a paragraph, the slice is "open" on both sides (the `<p>`
is not closed and reopened). If you select entire paragraphs, openStart and
openEnd are 0.

## Creating Nodes Programmatically

You can build document fragments from scratch using the schema:

```js
const { schema } = require("prosemirror-schema-basic");

// Build nodes from the schema
const doc = schema.node("doc", null, [
  schema.node("paragraph", null, [
    schema.text("Hello "),
    schema.text("world", [schema.marks.strong.create()]),
  ]),
  schema.node("paragraph", null, [
    schema.text("Second paragraph."),
  ]),
]);
```

Every node is **immutable** — you never modify a node in place. To change the
document, you create new nodes (or more commonly, use transactions).

## Key Takeaways

1. Documents are trees of nodes, but **inline content is flat** (not nested
   like HTML). Marks are metadata on text nodes, not wrapper elements.
2. Positions are **integers** counting tokens from the start of the document.
   Entering/leaving a node = 1 token. Each character = 1 token.
3. `doc.resolve(pos)` gives you the full context of a position: parent node,
   depth, offset within the parent.
4. **Slices** represent sub-documents with open/closed boundaries, enabling
   correct copy/paste behavior.
5. All nodes are **immutable** — you derive new nodes rather than mutating.
