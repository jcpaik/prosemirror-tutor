# 04 - Document Model and Positions

## The loop need

Transactions must say exactly where a change happens. "Insert text at the
cursor" or "delete the selection" only works if the document has a stable
addressing system.

ProseMirror's answer is:

- The document is an immutable node tree.
- Positions are integers inside that tree.
- Resolved positions explain what an integer means in context.

The related example is `examples/04-document-model.js`.

## The document is a tree

```txt
doc
  heading
    "Document Model Demo"
  paragraph
    "Click anywhere..."
  blockquote
    paragraph
      "This is inside..."
```

Block nodes, such as paragraphs and blockquotes, make the tree shape. Inline
content, such as text, lives inside textblocks.

## Inline content stays flat

HTML nests inline tags:

```html
<p>This is <strong>bold <em>and italic</em></strong></p>
```

ProseMirror stores a flat sequence of text nodes with marks:

```txt
paragraph
  "This is "
  "bold "        [strong]
  "and italic"   [strong, em]
```

This keeps inline positions simple. A character can be addressed by an integer
offset instead of a path through nested inline DOM.

## Positions are integer addresses

Positions count through document content:

- Entering or leaving a non-leaf node counts as 1.
- Each text character counts as 1.
- A leaf node, such as `horizontal_rule`, counts as 1.

For this shape:

```txt
doc(paragraph("One"), blockquote(paragraph("Two")))
```

The document content positions run from `0` to `doc.content.size`. The doc
node's own open and close tokens are not counted.

Useful landmarks:

- `0`: before the first top-level node.
- `1`: inside the first paragraph, before `O`.
- `4`: inside the first paragraph, after `e`.
- `5`: after the first paragraph, before the blockquote.

## Resolved positions answer "where am I?"

An integer is compact, but commands often need context. `doc.resolve(pos)`
returns a `ResolvedPos`.

```js
const $pos = doc.resolve(8);

$pos.parent;       // the parent node at this position
$pos.depth;        // depth in the tree
$pos.parentOffset; // offset inside the parent
$pos.index();      // child index at this depth
```

The `$` prefix, as in `$pos`, `$from`, and `$to`, is a common ProseMirror
convention for resolved positions.

## Walking the document

Use tree APIs when you need to inspect or display the current state:

```js
doc.forEach((child, offset, index) => {
  console.log(index, offset, child.type.name);
});

doc.descendants((node, pos) => {
  console.log(node.type.name, pos);
});
```

Useful node fields include `childCount`, `child(index)`, `firstChild`,
`textContent`, and `nodeAt(pos)`.

## Slices represent selected content

Selections can start and end inside nodes. A `Slice` records both the content
and how open its edges are.

```js
const slice = doc.slice(from, to);

slice.content;
slice.openStart;
slice.openEnd;
```

If you copy text from inside a paragraph, the paragraph wrapper is open at the
edges. If you copy whole paragraphs, the slice is closed. This is why paste can
fit partial content into the destination.

## Creating nodes

Schema methods create valid nodes:

```js
const doc = schema.node("doc", null, [
  schema.node("paragraph", null, [
    schema.text("Hello "),
    schema.text("world", [schema.marks.strong.create()]),
  ]),
]);
```

Nodes are immutable. To edit, use transactions rather than mutating the node
tree directly.

## Where this sits in the loop

The view renders `state.doc`. Commands and input handlers create transactions
that target integer positions inside `state.doc`. Applying a transaction
produces a new document tree, and the view renders that tree.

## Key idea

Positions are the address system that lets small transactions change a precise
part of an immutable document tree.
