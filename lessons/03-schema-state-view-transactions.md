# 03 — Schema, State, View, and Transactions

## The Three Core Concepts

ProseMirror separates concerns into three layers:

### Schema — the rulebook

Defines what kinds of content are allowed: which node types exist (paragraphs,
headings, etc.), which marks exist (bold, italic), and how they can nest. The
document must obey the schema at all times — you can't even construct an
invalid document.

```js
const mySchema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },       // root: one or more paragraphs
    paragraph: {
      content: "text*",                   // contains zero or more text nodes
      toDOM() { return ["p", 0]; },       // how to render to DOM
      parseDOM: [{ tag: "p" }],           // how to parse from DOM
    },
    text: { inline: true },
  },
});
```

If a node type isn't in the schema, it doesn't exist. No bold mark defined?
Bold is impossible. This is by design — you control exactly what the editor
can do.

### State — a snapshot

An immutable snapshot of the document content, cursor/selection position, and
plugin state. State is created from a schema (to know the rules) and plugins
(to track their state, e.g. undo history).

```js
const state = EditorState.create({
  schema: mySchema,
  plugins: [history(), keymap(baseKeymap)],
});
```

State knows nothing about the DOM. You could serialize it, send it over a
network, and reconstruct it elsewhere.

### View — the renderer

Renders state to the DOM and captures user input. The View is deliberately
*not* the source of truth — it's just a display layer. You could destroy a
view and create a new one from the same state, and everything would look
identical.

```js
new EditorView(document.querySelector("#editor"), { state });
```

## Why State needs Schema and Plugins (not the View)

This was a key insight: the View doesn't own the document. State does. So
State needs the schema (to enforce rules) and plugins (to track their state
like undo history). The View just renders whatever State tells it to.

This inversion — compared to editors where the DOM is the source of truth —
is what makes ProseMirror's architecture clean and enables things like
collaborative editing.

## Transactions — how State changes

State is immutable. You never modify it directly. Instead, you create a
**Transaction** — a recipe describing an edit — and apply it to get a new
State.

```
old State  →  Transaction  →  new State
```

### The flow

```
User types "a"
  → View creates a Transaction with a ReplaceStep (insert "a" at cursor)
  → dispatchTransaction(tr) is called
  → new state = old state.apply(tr)
  → view.updateState(newState)
  → View re-renders
```

### dispatchTransaction — the single chokepoint

Every change flows through one function on the View:

```js
new EditorView(element, {
  state,
  dispatchTransaction(tr) {
    const newState = this.state.apply(tr);
    this.updateState(newState);
  },
});
```

Because everything goes through this function, you can:
- **Log** every change (inspect the transaction's steps)
- **Reject** changes (don't call `updateState`)
- **Modify** transactions before applying
- **Sync** changes to a server for collaboration

### Steps — atomic operations inside a Transaction

A transaction contains **steps**. Each step is an atomic operation like
"replace characters at positions 3–3 with 'a'" (inserting) or "replace
positions 5–8 with nothing" (deleting). Pressing Enter produces a step that
splits a paragraph node into two.

### Programmatic transactions

You can also dispatch transactions from code:

```js
const tr = view.state.tr.insertText("Hello! ", 1);
view.dispatch(tr);
```

`view.state.tr` creates a new transaction from the current state. You chain
methods on it (`insertText`, `delete`, `setSelection`, etc.) then dispatch it.

## Examples

| File | What it demonstrates |
|---|---|
| `01-basic-editor.js` | `exampleSetup` hides everything — quick start but opaque |
| `02-from-scratch.js` | Build schema, plugins, state, view manually — full control |
| `03-transactions.js` | Override `dispatchTransaction` to log every change |

## Key Takeaways

1. **Schema** = what's allowed. **State** = what's there now. **View** = what you see.
2. State is immutable. Edits produce new states via transactions.
3. The View is a dumb renderer — State is the source of truth.
4. `dispatchTransaction` is the single chokepoint for all changes.
5. `exampleSetup` is a convenience wrapper — real control comes from building
   the schema, plugins, and keymaps yourself.
