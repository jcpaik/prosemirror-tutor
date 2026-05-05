# 11 - DOMParser and DOMSerializer

## The Need

The previous lesson put DOM rules on node and mark specs. Now the loop needs engines
that use those rules:

- load HTML into an editor document
- export the current document back to HTML
- parse clipboard HTML as content that can be inserted

`DOMParser` and `DOMSerializer` are those engines. See
`examples/11-dom-parser-serializer.js` for a small HTML textarea that parses
into the editor and serializes the editor back out.

## Where This Sits in the Loop

```txt
HTML element
  -> DOMParser.fromSchema(schema).parse(...)
  -> EditorState.doc
  -> transactions
  -> DOMSerializer.fromSchema(schema).serializeFragment(...)
  -> HTML again
```

The schema owns the rules. The parser and serializer run them.

## Parsing Initial HTML

The most common parser use is editor bootstrapping.

```js
import { DOMParser } from "prosemirror-model"

const content = document.querySelector("#content")

const state = EditorState.create({
  doc: DOMParser.fromSchema(schema).parse(content),
  plugins: []
})
```

`DOMParser.fromSchema(schema)` collects the schema's `parseDOM` rules. Calling
`parse(domNode)` walks that DOM tree and produces a ProseMirror document.

If the DOM does not exactly match your schema, the parser tries to fit the
content into valid document structure. This is useful, but it also means HTML
input is normalized through your schema rather than preserved byte for byte.

## Parsing Pasted Content

Full documents and pasted fragments are different control problems.

```js
const doc = parser.parse(domNode)        // complete document
const slice = parser.parseSlice(domNode) // partial content
```

`parseSlice` returns a `Slice`, which can have open edges. That is what paste
handling needs: content from the clipboard must be fitted into the current
selection, not become a whole new document.

You usually let the view handle clipboard parsing, but the distinction explains
why paste can insert partial blocks and inline content.

## Serializing for Export

To turn editor content into DOM, build a serializer from the same schema.

```js
import { DOMSerializer } from "prosemirror-model"

const serializer = DOMSerializer.fromSchema(schema)
const fragment = serializer.serializeFragment(state.doc.content)
```

`serializeFragment` returns a real `DocumentFragment`. To get an HTML string,
append it to a temporary element.

```js
function docToHTML(doc) {
  const div = document.createElement("div")
  div.appendChild(serializer.serializeFragment(doc.content))
  return div.innerHTML
}
```

Use `serializeNode(node)` when you want the DOM for one node including that
node's own wrapper.

## The Implementation Pattern

Keep the parser and serializer near the boundary where HTML enters or leaves
your app.

```js
const parser = DOMParser.fromSchema(schema)
const serializer = DOMSerializer.fromSchema(schema)

function htmlToDoc(html) {
  const tmp = document.createElement("div")
  tmp.innerHTML = html
  return parser.parse(tmp)
}

function docToHTML(doc) {
  const tmp = document.createElement("div")
  tmp.appendChild(serializer.serializeFragment(doc.content))
  return tmp.innerHTML
}
```

This keeps the editor loop itself simple: transactions still operate on
ProseMirror documents, while import and export code handles DOM conversion at
the edge.

## Takeaways

- `DOMParser.fromSchema(schema)` runs the schema's `parseDOM` rules.
- `parse(dom)` creates a full document; `parseSlice(dom)` creates paste-shaped
  content.
- `DOMSerializer.fromSchema(schema)` runs the schema's `toDOM` rules.
- `serializeFragment(doc.content)` is the usual export path for document HTML.
- Parser and serializer behavior follows the schema, so schema rules are where
  round-trip bugs usually start.
