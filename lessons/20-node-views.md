# 20 - Node Views (Custom Rendering Islands)

## Start with the rendering need

Most nodes can be rendered from `toDOM`: paragraph in, paragraph out. But some
features need a small island of custom DOM inside the editor: a clickable
counter, an embed preview, a widget with buttons, or a paragraph that manages a
placeholder class.

That need belongs in the view layer:

```text
state node -> node view factory -> custom DOM island -> events dispatch tx
```

The matching example is `examples/20-node-views.js`.

## Register the island on the view

Node views are provided through the `nodeViews` prop on `EditorView`. The key is
the node type name.

```js
const view = new EditorView(place, {
  state,
  nodeViews: {
    counter(node, view, getPos) {
      return new CounterView(node, view, getPos);
    },
  },
});
```

The factory receives:

| Argument | Use |
| --- | --- |
| `node` | The current ProseMirror node |
| `view` | Dispatch transactions back into the loop |
| `getPos` | Find this node's current document position |

`getPos` matters because positions move. Do not cache the original position for
later edits.

## Required shape of a node view

A node view object must expose `dom`, the outer element ProseMirror inserts
into the editor DOM.

```js
class CounterView {
  constructor(node, view, getPos) {
    this.node = node;
    this.view = view;
    this.getPos = getPos;
    this.dom = document.createElement("button");
    this.dom.textContent = node.attrs.count;
  }
}
```

For leaf or atom nodes, `dom` is enough. For nodes with editable child content,
also provide `contentDOM`.

```js
class ParagraphView {
  constructor(node) {
    this.dom = this.contentDOM = document.createElement("p");
    this.dom.classList.toggle("empty", node.content.size === 0);
  }
}
```

`contentDOM` tells ProseMirror where to render and manage the node's children.
Without it, ProseMirror treats the node view as a leaf from the DOM side.

## Events still re-enter the transaction loop

A node view may own DOM events, but it should still change editor content by
dispatching transactions.

```js
this.dom.addEventListener("mousedown", event => {
  event.preventDefault();
  const pos = this.getPos();
  const count = this.node.attrs.count + 1;
  view.dispatch(view.state.tr.setNodeMarkup(pos, null, { count }));
});
```

This keeps state as the source of truth. The button click does not directly edit
the document. It creates a transaction, the state updates, and the view receives
the new node.

## Lifecycle hooks answer view-control needs

Use the optional methods only when the island needs them:

| Need | Method |
| --- | --- |
| Patch DOM when the node changes | `update(node, decorations, innerDecorations)` |
| Show node-selection state | `selectNode()` and `deselectNode()` |
| Keep ProseMirror from handling an event | `stopEvent(event)` |
| Ignore DOM mutations you intentionally made | `ignoreMutation(mutation)` |
| Clean up timers/listeners | `destroy()` |

`update` should return `true` when the existing DOM can represent the new node.
Return `false` to make ProseMirror destroy and recreate the view.

```js
update(node) {
  if (node.type !== this.node.type) return false;
  this.node = node;
  this.dom.textContent = node.attrs.count;
  return true;
}
```

## Node views vs decorations

Use a decoration when normal rendering is fine and you only need visual overlay:
highlights, classes, widgets beside content.

Use a node view when the node itself needs custom DOM structure, event handling,
or lifecycle. The node view replaces rendering for that node type in the editor.
`toDOM` is still useful for serialization, parsing round trips, and fallback
rendering outside the live view.

## Where this sits in the loop

```text
EditorState doc
  contains normal schema nodes

EditorView nodeViews
  chooses custom DOM for selected node types

Node view event
  dispatches a transaction instead of mutating document state directly
```

Node views are powerful because they sit close to the DOM. Keep their document
changes routed through transactions so the rest of the editor stays coherent.

## Takeaways

- A node view is a custom rendering island for one node type.
- `dom` is required; `contentDOM` is needed for editable child content.
- Use `view.dispatch` and `getPos()` when the island changes document data.
- Reach for node views after decorations are too weak for the interaction.
