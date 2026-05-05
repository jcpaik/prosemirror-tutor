# 03 - The Rendering Loop

## The loop we are trying to build

An editor is a loop:

```txt
current state -> render DOM -> user input -> transaction -> next state -> render DOM
```

ProseMirror gives names to the parts of that loop:

- `Schema`: what document shapes are allowed.
- `EditorState`: the current document, selection, stored marks, and plugin
  state.
- `EditorView`: the DOM renderer and input bridge.
- `Transaction`: the description of one attempted change.

The example for this lesson is `examples/03-transactions.js`.

## Minimal loop

```js
const state = EditorState.create({
  schema,
  plugins: [history(), keymap(baseKeymap)],
});

const view = new EditorView(document.querySelector("#editor"), {
  state,
  dispatchTransaction(tr) {
    const nextState = this.state.apply(tr);
    this.updateState(nextState);
  },
});
```

That `dispatchTransaction` function is the main loop in miniature. A change
arrives as a transaction, the old immutable state produces a new state, and the
view updates the DOM from that new state.

## Why schema comes first

Before a state can exist, ProseMirror must know what a valid document is.

```js
const schema = new Schema({
  nodes: {
    doc: { content: "paragraph+" },
    paragraph: {
      content: "text*",
      toDOM() { return ["p", 0]; },
      parseDOM: [{ tag: "p" }],
    },
    text: { inline: true },
  },
});
```

This is not decoration around the loop. It is the loop's validity rule. If the
schema does not define bold, bold cannot appear. If `doc` requires paragraphs,
transactions must preserve that shape.

## State is the source of truth

`EditorState` is an immutable snapshot. It contains the document and selection,
plus plugin state such as undo history.

The DOM is not the source of truth. The view can be destroyed and recreated from
the same state, and the editor will render the same content.

## View connects state to the browser

`EditorView` renders the state into a `contenteditable` DOM and listens to
browser input. Its job is to keep the rendered DOM and state connected without
letting the DOM become the authority.

## Two ways input enters the loop

Some input is handled before the browser changes the DOM:

```txt
Mod-b -> keymap plugin -> command -> transaction -> dispatchTransaction
```

Other input starts as a native DOM change:

```txt
type "a" -> browser edits DOM -> view observes change -> transaction
```

Both paths meet at `dispatchTransaction`. That is why it is the best place to
log, inspect, reject, modify, or sync changes.

## Steps inside transactions

A transaction contains steps: atomic document operations such as replacing a
range, inserting text, or splitting a paragraph. Typing a character usually
creates one replace step. Pressing Enter creates a step that splits a block.

You can also create transactions yourself:

```js
const tr = view.state.tr.insertText("Hello! ", 1);
view.dispatch(tr);
```

`view.state.tr` starts from the current state. Dispatching sends the transaction
through the same loop as user input.

## Where this sits in the loop

This lesson is the center of the map. Later lessons mostly zoom into one edge
of this loop:

- Positions explain where a transaction changes the document.
- Commands turn user intent into transactions.
- Keymaps choose commands from keyboard input.
- Marks and content expressions define what valid document data can be.

## Key idea

ProseMirror editing is not "mutate the DOM." It is "describe a valid change,
apply it to immutable state, and render the next state."
