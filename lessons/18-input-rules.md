# 18 - Input Rules

## The Need

Typing often carries intent before the user runs a command:

- `--` should become an em dash
- `...` should become an ellipsis
- `# ` at the start of a block should become a heading
- `> ` at the start of a block should become a blockquote

Input rules watch typed text patterns and turn them into transactions.

See `examples/18-input-rules.js` for typographic replacements, heading and
blockquote shortcuts, a custom text replacement, and Backspace undo.

## Where This Sits in the Loop

```txt
user types text
  -> view receives text input
  -> inputRules plugin checks text before cursor
  -> first matching rule returns a transaction
  -> dispatch
  -> new state
```

Input rules are not key bindings. Keymaps react to key events. Input rules
react to text that now exists before the cursor.

## A Small Replacement Rule

An `InputRule` has a regular expression and a handler.

```js
import { InputRule } from "prosemirror-inputrules"

const trademarkRule = new InputRule(/\(tm\)$/, "TM")
```

Here the matched text `(tm)` is replaced with `TM`. The built-in typographic
rules use the same shape, but replace with non-ASCII punctuation.

The regexp should match up to the cursor, so it normally ends with `$`.

The handler can be a string for a simple replacement, or a function that
returns a transaction.

```js
const smileRule = new InputRule(/:\)$/, (state, match, start, end) => {
  return state.tr.replaceWith(start, end, state.schema.text(":D"))
})
```

The function receives:

- `state`: current editor state
- `match`: the regexp match
- `start` and `end`: document positions for the matched text

Return a transaction to apply the rule, or `null` to do nothing.

## Built-In Text Rules

`prosemirror-inputrules` includes ready-made typographic rules.

```js
import { emDash, ellipsis } from "prosemirror-inputrules"
```

`emDash` converts `--`. `ellipsis` converts `...`.

## Block Rules

Use `wrappingInputRule` when the typed pattern should wrap the current
textblock in another node.

```js
import { wrappingInputRule } from "prosemirror-inputrules"

const blockquoteRule = wrappingInputRule(
  /^\s*>\s$/,
  schema.nodes.blockquote
)
```

Use `textblockTypeInputRule` when the typed pattern should change the current
textblock type.

```js
import { textblockTypeInputRule } from "prosemirror-inputrules"

const headingRule = textblockTypeInputRule(
  /^(#{1,3})\s$/,
  schema.nodes.heading,
  match => ({ level: match[1].length })
)
```

Both helpers remove the matched shortcut text as part of the transaction.

## Installing Rules

Rules run only when installed through the input rules plugin.

```js
import { inputRules, undoInputRule } from "prosemirror-inputrules"
import { keymap } from "prosemirror-keymap"

const rulesPlugin = inputRules({
  rules: [emDash, ellipsis, blockquoteRule, headingRule, smileRule]
})

const state = EditorState.create({
  schema,
  plugins: [
    rulesPlugin,
    keymap({ Backspace: undoInputRule })
  ]
})
```

`undoInputRule` is a command. Bind it before the base keymap so Backspace can
first undo the latest input-rule transformation, then fall through to normal
Backspace behavior when no input rule applies.

## The Control Need

Use an input rule when the trigger is typed text in the document.

Use a keymap when the trigger is a key command that may not insert text.

Use a normal command or toolbar action when the user intent comes from UI
outside the text stream.

## Takeaways

- Input rules convert typed text patterns into transactions.
- Regexps usually end with `$` because they match text before the cursor.
- String handlers do simple replacements.
- Function handlers can build custom transactions.
- `wrappingInputRule` wraps the current block.
- `textblockTypeInputRule` changes the current textblock type.
- `undoInputRule` gives users a Backspace escape hatch.
