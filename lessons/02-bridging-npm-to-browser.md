# 02 - Bridging npm Packages to the Browser

## The immediate need

The editor loop must run in a browser page. But the code we installed with npm
lives in `node_modules/`, and browser imports need URLs. Vite is the bridge
between those two worlds.

## What the browser can load

When you open `http://localhost:5173`, the browser asks a web server for files:

1. `index.html`
2. An example script such as `./examples/03-transactions.js`
3. Any modules imported by that script

Relative imports are already URLs:

```js
import "./src/tutor.css";
```

Bare package imports are not URLs:

```js
import { EditorState } from "prosemirror-state";
```

The browser does not know where `"prosemirror-state"` lives. npm knows the
package. The browser knows URLs. Something must translate.

## Why a plain file server is not enough

A simple server can send `index.html` and local files. It cannot automatically
turn `"prosemirror-state"` into the right file path inside `node_modules/`.

You could try importing from `./node_modules/...`, but ProseMirror packages
also import other packages by bare names. Editing third-party package files is
fragile and would be lost on reinstall.

## Vite's role

Vite is a development web server that understands npm package names. When the
browser asks for an example module, Vite rewrites bare imports to browser-loadable
module URLs before serving the code.

That means our example can stay clean:

```js
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
```

The browser receives working modules. The editor can create state, create a
view, handle input, and render.

## Build tool, not editor framework

Vite is not part of ProseMirror's editing model. It does not own the document,
the state, or the DOM rendering loop. It just serves JavaScript in a form the
browser can execute.

Other tools can fill the same role: webpack, Parcel, esbuild, or CDN module
URLs. Vite is convenient here because it is small and fast.

## What this lets examples do

The runnable examples are normal browser JavaScript with normal imports. There
is no Vite-specific editor code inside them; Vite is only the bridge that makes
their package imports load in the browser.

## Key idea

npm gets package code onto disk. Vite gets that package code into the browser.
Only after that bridge exists can ProseMirror's runtime loop begin.
