# 27 - Putting It Together

## Start with the loop

Every ProseMirror feature eventually routes through the same loop:

```text
DOM event or app event
  -> command, input rule, plugin handler, or node view
  -> transaction
  -> state.apply(tr)
  -> view.updateState(newState)
  -> DOM reflects state
```

State is the source of truth. The DOM is the rendered projection. When you need
to add a feature, decide which part of this loop you need to control.

The matching example is `examples/27-putting-it-together.js`.

## The feature-routing guide

Use the user's need to choose the extension point.

| User need | Control this part | Tool |
| --- | --- | --- |
| Allow a kind of content | Document grammar | Schema node/mark specs |
| Render normal content as HTML | Schema DOM mapping | `toDOM`, `parseDOM` |
| Run an edit from a shortcut | Event to command | `keymap` |
| Run an edit from a toolbar | UI to command | `MenuItem`, custom button |
| Toggle marks or block types | Transaction creation | Command |
| Turn typed text into structure | Text pattern to transaction | Input rule |
| Undo and redo edits | Step history | `history`, `undo`, `redo` |
| Track derived data | State across transactions | Plugin state |
| Add visual highlights | View projection | Decorations |
| Replace rendering for a node | Custom DOM island | Node view |
| Reject invalid app behavior | Transaction gate | `filterTransaction` |
| Add follow-up edits | Transaction pipeline | `appendTransaction` |
| Keep positions alive | Position translation | `tr.mapping` |
| Edit together remotely | Steps over network | `prosemirror-collab` |
| Improve cursor/drop affordance | View event behavior | Gap/drop cursor plugins |

If two tools could work, choose the one that controls the smallest necessary
part of the loop.

## Build an editor by owning the array

A custom editor is usually just explicit composition:

```js
const state = EditorState.create({
  doc,
  plugins: [
    history(),
    inputRules({ rules }),
    keymap({ Backspace: undoInputRule }),
    keymap(customKeys),
    keymap(baseKeymap),
    wordCountPlugin,
    todoHighlightPlugin,
  ],
});

const view = new EditorView(place, {
  state,
  dispatchTransaction(tr) {
    const newState = view.state.apply(tr);
    view.updateState(newState);
    updateExternalUI(newState);
  },
});
```

Plugin order is part of control. Specific keymaps go before general keymaps.
`undoInputRule` must get a chance before the base Backspace handler. History
must be installed for undo and redo commands to have anything to operate on.

## Ask the loop question first

Before naming an abstraction, ask what must happen in the loop.

### "The user should press Mod-b for bold"

You need event-to-command control:

```js
keymap({ "Mod-b": toggleMark(schema.marks.strong) });
```

### "Typing ## space should make a heading"

You need typed-pattern-to-transaction control:

```js
textblockTypeInputRule(/^(#{1,3})\s$/, schema.nodes.heading, match => ({
  level: match[1].length,
}));
```

### "Show TODO in red without changing the document"

You need view projection control:

```js
Decoration.inline(from, to, { class: "todo-highlight" });
```

### "A counter node should be clickable"

You need a custom rendering island that dispatches transactions:

```js
nodeViews: {
  counter(node, view, getPos) {
    return new CounterView(node, view, getPos);
  },
}
```

### "An annotation must stay attached while people type"

You need position mapping:

```js
apply(tr, value) {
  return tr.docChanged ? { pos: tr.mapping.map(value.pos) } : value;
}
```

## Where the final example fits

`examples/27-putting-it-together.js` builds a small notes editor without
`exampleSetup`.

It owns:

- Schema: paragraphs, headings, blockquotes, horizontal rules, marks.
- Commands and keymaps: bold, italic, code, undo, redo.
- Input rules: headings, blockquotes, horizontal rules.
- Plugin state: word count.
- Decorations: TODO highlights.
- Dispatch loop: apply transaction, update view, refresh external UI.

That is the main lesson: a ProseMirror editor is not one large abstraction. It
is a loop plus carefully placed control points.

## Practical decision rules

- If content shape is impossible, change the schema.
- If content shape is possible but not happening, write or wire a command.
- If the trigger is keyboard-specific, use a keymap.
- If the trigger is typed text, use an input rule.
- If the feature is visual only, use decorations.
- If the feature owns DOM behavior for a node, use a node view.
- If the feature remembers data over time, use plugin state.
- If stored positions drift, map them through transactions.
- If multiple clients edit, send and receive steps.

## Takeaways

- Start from the rendering loop, not from API names.
- Each ProseMirror abstraction answers a concrete control need.
- `exampleSetup` is a bundle; production editors usually own the plugin list.
- The safest design is the smallest extension point that controls the behavior
  the user actually asked for.
