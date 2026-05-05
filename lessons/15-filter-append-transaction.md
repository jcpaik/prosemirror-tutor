# 15 - filterTransaction and appendTransaction

## The Need

Most transactions should flow straight through:

```txt
dispatch(tr) -> apply(tr) -> new state
```

But some plugins need control points around that apply step:

- reject a transaction before it changes state
- add a follow-up transaction after seeing the new state

`filterTransaction` and `appendTransaction` are those control points. See
`examples/15-filter-append-transaction.js` for a character limit filter and an
automatic follow-up correction.

## Where This Sits in the Loop

```txt
dispatch(tr)
  -> filterTransaction(tr, oldState)
  -> apply accepted transactions
  -> appendTransaction(transactions, oldState, newState)
  -> maybe apply appended transaction
  -> repeat append checks until none are returned
```

Filters run before apply. Appenders run after apply.

## filterTransaction: Say No Before State Changes

Use `filterTransaction` when the rule is "this transaction must not happen."

```js
function maxSizePlugin(max) {
  return new Plugin({
    filterTransaction(tr, state) {
      if (!tr.docChanged) return true
      return tr.doc.content.size <= max
    }
  })
}
```

If any plugin returns `false`, the transaction is dropped. The state does not
change, and there is no automatic error UI. If the user needs feedback, your
app must provide it separately.

Check `tr.docChanged` when the rule should apply only to content changes.
Selection moves and metadata-only transactions pass through the same hook.

## appendTransaction: Add a Follow-Up

Use `appendTransaction` when the rule is "after this change, another change
should also happen."

```js
const ensureTitlePlugin = new Plugin({
  appendTransaction(transactions, oldState, newState) {
    if (!transactions.some(tr => tr.docChanged)) return null
    if (newState.doc.firstChild?.type.name === "heading") return null

    const heading = newState.schema.nodes.heading.create(
      { level: 1 },
      newState.schema.text("Untitled")
    )
    return newState.tr.insert(0, heading)
  }
})
```

The hook receives:

- `transactions`: the transactions just applied
- `oldState`: the state before them
- `newState`: the state after them

Return a transaction to apply more changes, or `null` when no follow-up is
needed.

## Guard Against Loops

An appended transaction causes append hooks to run again. That is powerful and
dangerous.

```js
// Bad: always appends another transaction.
appendTransaction(_transactions, _oldState, newState) {
  return newState.tr.insertText("!")
}
```

Always check whether the invariant is already satisfied before returning a
transaction.

```js
appendTransaction(transactions, oldState, newState) {
  const first = newState.doc.firstChild
  if (first?.type.name === "heading") return null
  return newState.tr.insert(0, makeHeading(newState.schema))
}
```

The safe shape is: inspect the new state, return `null` if nothing is needed,
and only then build a transaction.

## Choosing the Hook

Use `filterTransaction` for hard gates:

- maximum document length
- read-only ranges
- blocking a transaction marked as forbidden

Use `appendTransaction` for derived changes:

- adding a required heading
- updating computed attributes
- normalizing content after paste

If the unwanted state should never exist, filter. If you need to inspect the
new state and repair or extend it, append.

## Takeaways

- `filterTransaction(tr, state)` runs before apply; return `false` to reject.
- `appendTransaction(transactions, oldState, newState)` runs after apply; return
  a follow-up transaction or `null`.
- Appended transactions re-run append hooks, so guard with an invariant check.
- Use `tr.docChanged` when selection-only transactions should pass through.
