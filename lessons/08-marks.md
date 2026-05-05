# 08 - Marks

## The loop need

Formatting must survive the render loop. If bold were only a DOM style,
ProseMirror would lose it whenever state is serialized, transformed, copied, or
re-rendered.

ProseMirror stores inline formatting as document data called marks.

The related example is `examples/08-marks.js`.

## Marks are metadata on inline content

Marks describe text. They do not wrap the document tree the way HTML tags do.

```txt
paragraph
  "This is "
  "bold "        [strong]
  "and italic"   [strong, em]
```

When rendered, those marks become DOM such as `<strong>` and `<em>`, but the
state stores them as mark values attached to text nodes.

## Defining marks

Marks live in the schema's `marks` field.

```js
const schema = new Schema({
  nodes,
  marks: {
    strong: {
      toDOM() { return ["strong", 0]; },
      parseDOM: [{ tag: "strong" }, { tag: "b" }],
    },
    link: {
      attrs: { href: {} },
      inclusive: false,
      toDOM(mark) {
        return ["a", { href: mark.attrs.href }, 0];
      },
      parseDOM: [{
        tag: "a[href]",
        getAttrs(dom) {
          return { href: dom.getAttribute("href") };
        },
      }],
    },
  },
});
```

Important `MarkSpec` fields:

- `toDOM`: how the mark renders.
- `parseDOM`: how DOM is parsed back into the mark.
- `attrs`: data carried by the mark, such as a link `href`.
- `inclusive`: whether typing at the edge continues the mark.
- `excludes`: which marks cannot coexist with this one.
- `group`: a named family of marks.

## Nodes can allow or reject marks

Node specs can control which marks may appear inside them:

```js
heading: {
  content: "text*",
  marks: "",
},
paragraph: {
  content: "inline*",
  marks: "_",
},
```

`marks: ""` allows no marks. `marks: "_"` allows all marks. Omitting `marks`
uses the default behavior for that node type.

## Toggling marks is a command

`toggleMark(markType, attrs)` returns a command:

```js
keymap({
  "Mod-b": toggleMark(schema.marks.strong),
  "Mod-i": toggleMark(schema.marks.em),
  "Mod-`": toggleMark(schema.marks.code),
});
```

With a text selection, the command adds or removes the mark on that range. With
a collapsed cursor, there is no selected text to change, so the command updates
stored marks.

## Stored marks

Stored marks are pending formatting for the next typed character.

```txt
cursor only, storedMarks = [strong]
type "x"
next state contains "x" with [strong]
```

Relevant transaction methods:

```js
tr.setStoredMarks(marks);
tr.addStoredMark(mark);
tr.removeStoredMark(mark);
tr.ensureMarks(marks);
```

When `state.storedMarks` is `null`, ProseMirror inherits marks from nearby
text. When it is an array, that exact set applies to the next typed content.

## Exclusion keeps formatting valid

Inline code usually should not be bold, italic, or linked:

```js
code: {
  excludes: "_",
  toDOM() { return ["code", 0]; },
  parseDOM: [{ tag: "code" }],
}
```

`"_"` means this mark excludes every mark. ProseMirror checks mark compatibility
when adding marks, so invalid combinations do not enter the document.

## Where this sits in the loop

Marks are part of `state.doc`. Commands create transactions that add, remove,
or store marks. The view renders marks to DOM, and DOM parsing can turn marked
HTML back into document data.

```txt
Mod-b -> toggleMark -> transaction -> state.doc marks -> rendered DOM
```

## Key idea

Formatting is not a DOM afterthought. In ProseMirror, formatting that matters
belongs in the document model as marks.
