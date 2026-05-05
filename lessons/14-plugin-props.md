# 14 - Plugin Props and View Lifecycle

## The Need

Plugin state is memory in the state loop. But plugins also need to talk to the
view:

- intercept a key or paste event
- make the editor read-only
- provide decorations for rendering
- set up and clean up external DOM

Those are view concerns, so they live in plugin props and plugin view
lifecycle hooks.

See `examples/14-plugin-props.js` for plugins that handle events, control
editability, and update side UI.

## Where This Sits in the Loop

```txt
browser event or view update
  -> EditorView checks direct props
  -> EditorView checks plugin props in order
  -> prop may dispatch a transaction, return decorations, or handle the event
```

Props are how plugins participate in the view's runtime behavior.

## Event Props: Handle or Pass On

Event handler props return a boolean.

- `true`: handled; stop looking for handlers
- `false`: not handled; let the next handler try

```js
import { Plugin } from "prosemirror-state"

const tabPlugin = new Plugin({
  props: {
    handleKeyDown(view, event) {
      if (event.key !== "Tab") return false

      view.dispatch(view.state.tr.insertText("  "))
      return true
    }
  }
})
```

Useful event props include:

- `handleKeyDown(view, event)`
- `handleClick(view, pos, event)`
- `handleDoubleClick(view, pos, event)`
- `handlePaste(view, event, slice)`

For normal keyboard shortcuts, prefer the `keymap` plugin. Reach for raw event
props when you need the native event or custom view behavior.

## editable: Let the View Accept Input

`editable(state)` tells the view whether its DOM should be editable.

```js
function maxSizePlugin(max) {
  return new Plugin({
    props: {
      editable(state) {
        return state.doc.content.size < max
      }
    }
  })
}
```

When multiple plugins provide `editable`, one `false` is enough to make the
view read-only. Users can still select content, but typing and paste are
blocked by the view.

## decorations: Render State Without Changing the Doc

The `decorations(state)` prop lets a plugin return visual overlays for the
current state.

```js
const highlightPlugin = new Plugin({
  props: {
    decorations(state) {
      return DecorationSet.create(state.doc, [
        Decoration.inline(1, 6, { class: "highlight" })
      ])
    }
  }
})
```

This is still a view prop: the document is unchanged. The decorations lesson goes deeper on
decorations and when to store them in plugin state.

## view: Side Effects With a Lifecycle

Some plugin work needs a live `EditorView`: external DOM, event listeners,
timers, network connections, or UI outside the editable document.

```js
const counterPlugin = new Plugin({
  view(editorView) {
    const counter = document.createElement("div")
    editorView.dom.parentNode.appendChild(counter)

    function refresh(state) {
      counter.textContent = String(state.doc.textContent.length)
    }

    refresh(editorView.state)

    return {
      update(view, prevState) {
        if (view.state.doc !== prevState.doc) refresh(view.state)
      },
      destroy() {
        counter.remove()
      }
    }
  }
})
```

Use plugin state for data that belongs to immutable editor state. Use `view`
for side effects that exist because this particular view exists.

## Takeaways

- Props are how plugins talk to the `EditorView`.
- Event props return `true` to handle and `false` to pass on.
- `editable(state)` controls whether the view accepts user input.
- `decorations(state)` lets plugins affect rendering without changing the doc.
- `view(editorView)` sets up side effects; `update` refreshes them; `destroy`
  cleans them up.
