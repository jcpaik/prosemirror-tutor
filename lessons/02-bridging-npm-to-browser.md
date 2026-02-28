# Lesson 02: Bridging npm Packages to the Browser

## The fundamental gap

npm packages are pure JS code meant to be consumed by other JS code — not webpages. There is always a gap between "npm packages on disk" and "working webpage in a browser." Something has to bridge it.

## How a browser loads a webpage

1. You type `http://localhost:5173` in the browser.
2. Browser sends a request to that address: "give me the page."
3. A **web server** listening at that address sends back `index.html`.
4. Browser reads the HTML, sees `<script src="./examples/01-basic-editor.js">`, makes another request: "give me that file too."
5. Server sends back that JS file.
6. Browser reads the JS, sees `import ... from "prosemirror-state"`, and needs that too.

**Step 6 is where the problem hits.** `"prosemirror-state"` is just a name — not a URL, not a file path. The browser only knows how to fetch things by URL (like `./something.js`). It doesn't know that the code lives somewhere deep in `node_modules/prosemirror-state/`.

## A simple web server can't solve this

Python has a built-in web server: `python3 -m http.server`. It serves files from your directory — browser asks for `index.html`, it sends it. But when the browser hits `import ... from "prosemirror-state"`, the simple server can't help. Nobody told the browser where that package actually is.

## Why not just use relative imports?

You could rewrite your own imports to relative paths like `./node_modules/prosemirror-state/src/index.js`. But the code _inside_ those packages also uses bare imports like `import { ... } from "prosemirror-model"`. You'd have to edit third-party code inside `node_modules/` — code that gets wiped and re-downloaded on every `npm install`.

Relative imports work for **your own** code. The problem is that **packages themselves** use bare import names internally, and you can't change that.

## Vite = a web server that understands npm package names

When Vite sees the browser request a file containing `import ... from "prosemirror-state"`, it rewrites that to the actual path inside `node_modules/` before sending it back. The browser never even knows — it just gets working code.

So Vite is a **smart web server** that bridges the gap between npm packages on disk and the browser that needs URLs. That's the core of it.

## Vite is a build tool, not a framework

That bridge doesn't have to be Vite. It could be webpack, parcel, esbuild, or others. They all solve the same core problem. Vite is just the lightest-weight option right now.

The key distinction:

- **Framework dependency** (React, Vue, etc.) — your code is written _for_ it, painful to leave.
- **Build tool** (Vite, webpack, etc.) — your code doesn't know it exists, swappable anytime.

Vite is the second kind. Look at `01-basic-editor.js` — there's nothing Vite-specific in it. It's standard JS with standard imports. If you swapped Vite for webpack, you'd change zero lines of application code. Only the dev tooling config changes.

## Without Vite, alternatives are:

- **Copy-paste** source files into your project and use relative imports (fragile, manual)
- **CDN URLs** — instead of bare names, import directly from a URL like `https://esm.sh/prosemirror-state`. The browser can fetch URLs. This skips npm entirely but loses version control and offline dev.
