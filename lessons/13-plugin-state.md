# 13 - Plugin State

## The Need

The editor loop already remembers the document and selection. Plugins often
need their own memory in that same loop:

- a word count
- whether a toolbar mode is active
- a cached `DecorationSet`
- the last search query sent through transaction metadata

Global variables fall out of sync with immutable editor states. Plugin state
solves this by attaching memory to `EditorState` and updating it on every
transaction.

See `examples/13-plugin-state.js` for counters stored in plugin state and read
back through plugin keys.

## Where This Sits in the Loop

```txt
EditorState
  -> dispatch(transaction)
  -> plugin.state.apply(...)
  -> new EditorState with updated plugin value
```

Plugin state is not a side channel. It is one field in the state update cycle.

## The State Field Shape

A plugin gets state by declaring `state: { init, apply }`.

```js
import { Plugin } from "prosemirror-state"

const wordCountPlugin = new Plugin({
  state: {
    init(_, state) {
      return countWords(state.doc)
    },
    apply(tr, value, oldState, newState) {
      return tr.docChanged ? countWords(newState.doc) : value
    }
  }
})
```

`init` runs when the editor state is created. `apply` runs for every
transaction and must return the plugin's next value.

Treat the value as immutable. Return a new object, array, number, or set rather
than mutating the old one in place.

## Reading Plugin State

Use a `PluginKey` when other code needs to read the plugin's value.

```js
import { Plugin, PluginKey } from "prosemirror-state"

const wordCountKey = new PluginKey("wordCount")

const wordCountPlugin = new Plugin({
  key: wordCountKey,
  state: {
    init(_, state) {
      return countWords(state.doc)
    },
    apply(tr, value, _oldState, newState) {
      return tr.docChanged ? countWords(newState.doc) : value
    }
  }
})

const count = wordCountKey.getState(view.state)
```

The plugin instance also has `plugin.getState(state)`, but a key is easier to
share without importing the plugin object everywhere.

## Transaction Metadata: Intent for Plugins

Sometimes the document change is not enough information. A plugin may need to
know why a transaction happened.

```js
const tr = view.state.tr.insertText("hello")
tr.setMeta(wordCountKey, { source: "button" })
view.dispatch(tr)
```

Inside `apply`, read the same key.

```js
apply(tr, value) {
  const meta = tr.getMeta(wordCountKey)
  if (meta?.source === "button") return value
  return tr.docChanged ? value + 1 : value
}
```

Metadata belongs to the transaction only. It is a message traveling through one
state update, not stored state by itself.

## The Control Need

Use plugin state when a plugin needs memory that must stay synchronized with
undoable, immutable editor state.

Use transaction metadata when code dispatching a transaction needs to tell
plugins how to interpret that transaction.

Use `tr.docChanged` when your plugin only cares about document edits and should
ignore cursor moves or metadata-only transactions.

## Takeaways

- Plugin state is memory attached to the editor state loop.
- `init` creates the first value; `apply` returns the next value.
- Do not mutate plugin state in place.
- `PluginKey.getState(state)` is the normal way to read plugin state.
- `tr.setMeta` and `tr.getMeta` pass one-transaction messages to plugins.
