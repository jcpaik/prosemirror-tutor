import "./tutor.css";

// ProseMirror CSS (menu bar, example-setup)
import "prosemirror-menu/style/menu.css";
import "prosemirror-example-setup/style/style.css";

// ---------- CodeMirror (code editor panel) ----------
import { EditorView as CMEditorView, basicSetup } from "codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState as CMEditorState } from "@codemirror/state";

// ---------- Module registry ----------
// Pre-import all ProseMirror packages so user code's `import` statements
// can be rewritten to look them up from this table.
import * as pmState from "prosemirror-state";
import * as pmView from "prosemirror-view";
import * as pmModel from "prosemirror-model";
import * as pmSchemaBasic from "prosemirror-schema-basic";
import * as pmSchemaList from "prosemirror-schema-list";
import * as pmKeymap from "prosemirror-keymap";
import * as pmCommands from "prosemirror-commands";
import * as pmHistory from "prosemirror-history";
import * as pmExampleSetup from "prosemirror-example-setup";

const MODULE_REGISTRY = {
  "prosemirror-state": pmState,
  "prosemirror-view": pmView,
  "prosemirror-model": pmModel,
  "prosemirror-schema-basic": pmSchemaBasic,
  "prosemirror-schema-list": pmSchemaList,
  "prosemirror-keymap": pmKeymap,
  "prosemirror-commands": pmCommands,
  "prosemirror-history": pmHistory,
  "prosemirror-example-setup": pmExampleSetup,
};

// ---------- Import rewriting ----------
// Transforms ES module import statements into registry lookups:
//   import { X, Y } from "mod"  →  const { X, Y } = __modules__["mod"];
//   import * as Z from "mod"    →  const Z = __modules__["mod"];
//   import "mod.css"            →  (stripped)
function transformImports(code) {
  // Strip CSS imports
  code = code.replace(/^\s*import\s+["'][^"']+\.css["']\s*;?\s*$/gm, "");

  // Named imports: import { X, Y } from "mod"
  code = code.replace(
    /^\s*import\s+\{([^}]+)\}\s+from\s+["']([^"']+)["']\s*;?\s*$/gm,
    (_, names, mod) => `const {${names}} = __modules__["${mod}"];`
  );

  // Namespace imports: import * as X from "mod"
  code = code.replace(
    /^\s*import\s+\*\s+as\s+(\w+)\s+from\s+["']([^"']+)["']\s*;?\s*$/gm,
    (_, name, mod) => `const ${name} = __modules__["${mod}"];`
  );

  // Default imports: import X from "mod"
  code = code.replace(
    /^\s*import\s+(\w+)\s+from\s+["']([^"']+)["']\s*;?\s*$/gm,
    (_, name, mod) => `const ${name} = __modules__["${mod}"].default;`
  );

  return code;
}

// ---------- Document proxy ----------
// Redirects querySelector("#editor") to the result container.
function createDocumentProxy(container) {
  return new Proxy(document, {
    get(target, prop) {
      if (prop === "querySelector") {
        return (selector) => {
          if (selector === "#editor") return container;
          return target.querySelector(selector);
        };
      }
      const val = target[prop];
      return typeof val === "function" ? val.bind(target) : val;
    },
  });
}

// ---------- EditorView tracking ----------
// We monkey-patch the EditorView constructor so we can destroy old instances
// on re-run. The registry's EditorView is wrapped in a subclass.
let activeViews = [];

function createTrackedModules() {
  const modules = {};
  for (const [name, mod] of Object.entries(MODULE_REGISTRY)) {
    if (name === "prosemirror-view") {
      // Wrap EditorView to track instances
      const TrackedEditorView = class extends mod.EditorView {
        constructor(place, props) {
          super(place, props);
          activeViews.push(this);
        }
      };
      modules[name] = { ...mod, EditorView: TrackedEditorView };
    } else {
      modules[name] = mod;
    }
  }
  return modules;
}

function cleanupViews() {
  for (const view of activeViews) {
    try {
      view.destroy();
    } catch (_) {
      // ignore
    }
  }
  activeViews = [];
}

// ---------- DOM references ----------
const select = document.querySelector("#example-select");
const runBtn = document.querySelector("#run-btn");
const codeEditorEl = document.querySelector("#code-editor");
const editorContainer = document.querySelector("#editor-container");
const errorOutput = document.querySelector("#error-output");

// ---------- CodeMirror setup ----------
let cmView = new CMEditorView({
  state: CMEditorState.create({
    doc: "",
    extensions: [basicSetup, javascript()],
  }),
  parent: codeEditorEl,
});

// ---------- Load manifest & populate dropdown ----------
async function loadManifest() {
  const resp = await fetch("/examples/manifest.json");
  const manifest = await resp.json();
  for (const entry of manifest) {
    const opt = document.createElement("option");
    opt.value = entry.file;
    opt.textContent = entry.title;
    select.appendChild(opt);
  }
  // Auto-load the first example
  if (manifest.length > 0) {
    await loadExample(manifest[0].file);
  }
}

// Fetch raw source via Vite's ?raw query to bypass JS transforms
async function loadExample(filename) {
  const mod = await import(/* @vite-ignore */ `/examples/${filename}?raw`);
  cmView.dispatch({
    changes: { from: 0, to: cmView.state.doc.length, insert: mod.default },
  });
}

select.addEventListener("change", () => loadExample(select.value));

// ---------- Execute user code ----------
function runCode() {
  // Clear previous state
  cleanupViews();
  editorContainer.innerHTML = "";
  errorOutput.textContent = "";
  errorOutput.classList.remove("visible");

  const code = cmView.state.doc.toString();
  const transformed = transformImports(code);
  const modules = createTrackedModules();
  const docProxy = createDocumentProxy(editorContainer);

  try {
    const fn = new Function("__modules__", "document", transformed);
    fn(modules, docProxy);
  } catch (err) {
    errorOutput.textContent = err.message;
    errorOutput.classList.add("visible");
  }
}

runBtn.addEventListener("click", runCode);

// ---------- Init ----------
loadManifest();
