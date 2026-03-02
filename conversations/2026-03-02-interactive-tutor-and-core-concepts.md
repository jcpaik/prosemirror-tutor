# 2026-03-02 — Interactive Tutor Page & Core Concepts

## Interactive Tutorial Page

Built a split-screen tutorial environment: code editor on the left, live
ProseMirror result on the right.

### How it works

- `src/tutor.js` pre-imports all ProseMirror packages into a **module registry**
- User code's `import` statements are regex-rewritten to registry lookups
- Code is executed via `new Function()` with a document proxy that redirects
  `querySelector("#editor")` to the result panel
- EditorView instances are tracked and `.destroy()`'d on re-run

### Files created/modified

- `index.html` — rewritten with split layout (toolbar, code panel, result panel)
- `src/tutor.js` — module registry, import transform, execution engine, UI wiring
- `src/tutor.css` — split-panel layout styling
- `examples/manifest.json` — JSON list of examples for the dropdown
- `vite.config.js` — suppress chunk size warning (CodeMirror is large)
- `SETUP.md` — updated project structure docs

### Issues fixed

1. **Vite transforming fetched JS files** — example source was being served with
   resolved imports and sourcemap artifacts. Fixed by using
   `import('/examples/file.js?raw')` with `/* @vite-ignore */` to get raw source.
2. **No syntax highlighting** — replaced plain `<textarea>` with CodeMirror 6
   (`codemirror` + `@codemirror/lang-javascript`). Provides line numbers, syntax
   highlighting, bracket matching out of the box.
3. **Vite build warnings** — added `@vite-ignore` comment for dynamic import,
   created `vite.config.js` with `chunkSizeWarningLimit: 800`.

## Core Concepts Discussion

### Confusion about terminology

Student found Schema/State/View terms confusing, and `exampleSetup` made
everything feel like a black box with no control.

### Key insights reached

1. **Schema = rulebook**, **State = snapshot**, **View = renderer**. The flow:
   Schema defines what's possible → State holds the document → View renders it.

2. **Why State needs Schema and Plugins (not the View)** — student's own
   insight: "View is not responsible for this, so this design choice makes
   sense." State is the source of truth, not the DOM. This is the fundamental
   inversion from traditional contenteditable editors.

3. **Transactions** — State is immutable. Every edit creates a Transaction
   (containing Steps), which produces a new State. `dispatchTransaction` is
   the single chokepoint — you can log, reject, or modify any change.

### Examples created

| File | Purpose |
|---|---|
| `02-from-scratch.js` | Build editor without exampleSetup — manual schema, plugins, keymaps |
| `03-transactions.js` | Override `dispatchTransaction` to log every transaction and its steps |

### Lesson saved

- `lessons/03-schema-state-view-transactions.md`
