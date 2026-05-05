# 16 - Decorations

## The Need

Sometimes the view should show something that is not part of the document:

- search highlights
- lint underlines
- the active block
- a placeholder
- a collaborator cursor

Do not insert these into `doc`. They are rendering overlays derived from state.
That is what decorations are for.

See `examples/16-decorations.js` for inline search highlights, a widget badge,
and an active-block node decoration.

## Where This Sits in the Loop

```txt
EditorState
  -> plugin computes DecorationSet
  -> props.decorations(state)
  -> EditorView overlays DOM
  -> document stays unchanged
```

Decorations belong to rendering, not document content.

## The Three Decoration Shapes

Inline decorations style a range of inline content.

```js
Decoration.inline(from, to, { class: "search-match" })
```

Widget decorations insert a DOM node at a document position without changing
the document.

```js
Decoration.widget(0, () => {
  const badge = document.createElement("span")
  badge.textContent = "3 matches"
  return badge
})
```

Node decorations add attributes to the outer DOM element of a node. The range
must exactly cover that node.

```js
Decoration.node(blockStart, blockEnd, { class: "active-block" })
```

## Returning Decorations to the View

For cheap decorations, recompute them directly from state.

```js
const searchPlugin = new Plugin({
  props: {
    decorations(state) {
      const decos = findMatches(state.doc, "todo").map(({ from, to }) =>
        Decoration.inline(from, to, { class: "match" })
      )
      return DecorationSet.create(state.doc, decos)
    }
  }
})
```

This is simple and often enough.

## Keeping Decorations in Plugin State

If decorations are expensive or controlled by plugin metadata, store a
`DecorationSet` in plugin state and expose it with the `decorations` prop.

```js
const decoKey = new PluginKey("deco")

const decoPlugin = new Plugin({
  key: decoKey,
  state: {
    init(_, { doc }) {
      return DecorationSet.create(doc, buildDecorations(doc))
    },
    apply(tr, oldSet) {
      return oldSet.map(tr.mapping, tr.doc)
    }
  },
  props: {
    decorations(state) {
      return decoKey.getState(state)
    }
  }
})
```

`DecorationSet.map(tr.mapping, tr.doc)` keeps decoration positions aligned as
steps insert and delete content. Without mapping, old positions can point at
the wrong content or be dropped.

When external UI changes the decoration source, dispatch metadata and rebuild
in `apply`.

```js
apply(tr, oldSet) {
  const query = tr.getMeta(decoKey)
  if (query != null) {
    return DecorationSet.create(tr.doc, buildSearchDecorations(tr.doc, query))
  }
  return oldSet.map(tr.mapping, tr.doc)
}
```

## The Control Need

Use decorations when a visual change should follow editor state but should not
be saved as content.

Use plain `props.decorations` when recomputing is cheap. Use plugin state when
you need memory, mapping, or metadata-driven rebuilds.

## Takeaways

- Decorations change rendering without changing `doc`.
- Inline decorations style text ranges.
- Widget decorations add non-document DOM at a position.
- Node decorations style a node's outer DOM.
- `DecorationSet` stores decorations efficiently.
- Map stored decorations through `tr.mapping` when the document changes.
