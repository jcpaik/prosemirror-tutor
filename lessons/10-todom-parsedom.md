# 10 - toDOM and parseDOM

## The Need

The editor loop keeps the document as ProseMirror nodes, but the browser shows
DOM. Each render needs an answer to this question:

> If the state contains this node or mark, what DOM should appear?

Paste, initial HTML, and copy/paste round trips need the reverse answer:

> If the browser gives us this DOM, what ProseMirror node or mark should it
> become?

`toDOM` and `parseDOM` put those answers on the schema. See
`examples/10-todom-parsedom.js` for a schema that renders notes, headings, and
a highlight mark, then shows the serialized HTML.

## Where This Sits in the Loop

```txt
EditorState.doc
  -> schema node/mark toDOM
  -> EditorView renders DOM

DOM from paste/load
  -> schema node/mark parseDOM
  -> EditorState.doc
```

The schema is the boundary contract. The view and parser can do their work
because each node and mark says how it crosses that boundary.

## toDOM: State to Browser DOM

`toDOM` returns a DOM output spec: a compact array that describes the DOM to
create.

```js
paragraph: {
  content: "inline*",
  group: "block",
  toDOM() { return ["p", 0] }
}
```

The first item is the tag name. The optional second item is an attributes
object. The `0` is the content hole, where the node's child content is rendered.

```js
note: {
  content: "block+",
  group: "block",
  toDOM() { return ["div", { class: "note" }, 0] }
}
```

Leaf nodes do not have a content hole:

```js
horizontal_rule: {
  group: "block",
  toDOM() { return ["hr"] }
}
```

Marks use the same idea. The `0` is the inline content being wrapped.

```js
strong: {
  toDOM() { return ["strong", 0] }
}
```

## parseDOM: Browser DOM to State

`parseDOM` is an array of parse rules. Each rule says which DOM shape should
become this node or mark.

```js
paragraph: {
  parseDOM: [{ tag: "p" }]
}

em: {
  parseDOM: [
    { tag: "em" },
    { tag: "i" },
    { style: "font-style=italic" }
  ]
}
```

When a rule needs to read or reject DOM, use `getAttrs`.

```js
note: {
  parseDOM: [{
    tag: "div",
    getAttrs(dom) {
      return dom.classList.contains("note") ? {} : false
    }
  }]
}
```

Returning an attrs object accepts the match. Returning `false` rejects it.

For attributes stored in the ProseMirror node, parse rules should reconstruct
the same information that `toDOM` writes.

```js
heading: {
  attrs: { level: { default: 1 } },
  toDOM(node) { return ["h" + node.attrs.level, 0] },
  parseDOM: [1, 2, 3, 4, 5, 6].map(level => ({
    tag: "h" + level,
    attrs: { level }
  }))
}
```

## The Control Need

Write `toDOM` when the editor needs to render or export content.

Write `parseDOM` when the editor needs to accept HTML from paste, load, or
clipboard content.

Keep them paired. If `toDOM` writes information that `parseDOM` cannot read
back, the document may look correct in the editor but lose meaning when it is
copied, pasted, saved as HTML, or loaded again.

## Try It

In `examples/10-todom-parsedom.js`, edit the document and watch the HTML panel.
Then change the `note` node's class in `toDOM` without changing `parseDOM`.
That mismatch is the bug this lesson is teaching you to notice.

## Takeaways

- `toDOM` is the schema's state-to-DOM rule.
- `parseDOM` is the schema's DOM-to-state rule.
- `0` is the content hole for non-leaf nodes and wrapping marks.
- `getAttrs` extracts attrs or returns `false` to reject a match.
- Round trips are only reliable when `toDOM` and `parseDOM` preserve the same
  meaning.
