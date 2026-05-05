import "./tutor.css";
import { marked } from "marked";

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
import * as pmInputRules from "prosemirror-inputrules";
import * as pmMenu from "prosemirror-menu";
import * as pmTransform from "prosemirror-transform";
import * as pmGapCursor from "prosemirror-gapcursor";
import * as pmDropCursor from "prosemirror-dropcursor";
import * as pmCollab from "prosemirror-collab";

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
  "prosemirror-inputrules": pmInputRules,
  "prosemirror-menu": pmMenu,
  "prosemirror-transform": pmTransform,
  "prosemirror-gapcursor": pmGapCursor,
  "prosemirror-dropcursor": pmDropCursor,
  "prosemirror-collab": pmCollab,
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
const lessonBtn = document.querySelector("#lesson-btn");
const codeEditorEl = document.querySelector("#code-editor");
const editorContainer = document.querySelector("#editor-container");
const errorOutput = document.querySelector("#error-output");
const lessonPanel = document.querySelector("#lesson-panel");
const divider = document.querySelector("#divider");
const codePanel = document.querySelector("#code-panel");
const resultPanel = document.querySelector("#result-panel");

let lessonMap = {};
let exampleMap = {};
let selectedRunnablePath = null;
let showingLesson = true;

// ---------- Draggable divider ----------
{
  let startX, startCodeWidth, startResultWidth;
  const panels = document.querySelector("#panels");

  divider.addEventListener("mousedown", (e) => {
    e.preventDefault();
    startX = e.clientX;
    startCodeWidth = codePanel.getBoundingClientRect().width;
    startResultWidth = resultPanel.getBoundingClientRect().width;
    divider.classList.add("active");
    document.body.classList.add("dragging");

    function onMouseMove(e) {
      const dx = e.clientX - startX;
      const totalWidth = startCodeWidth + startResultWidth;
      const newCode = Math.max(100, Math.min(totalWidth - 100, startCodeWidth + dx));
      const newResult = totalWidth - newCode;
      codePanel.style.flexBasis = (newCode / panels.getBoundingClientRect().width * 100) + "%";
      resultPanel.style.flexBasis = (newResult / panels.getBoundingClientRect().width * 100) + "%";
    }

    function onMouseUp() {
      divider.classList.remove("active");
      document.body.classList.remove("dragging");
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });
}

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
  const [lessonsResp, examplesResp, exercisesResp] = await Promise.all([
    fetch("/lessons/manifest.json"),
    fetch("/examples/manifest.json"),
    fetch("/exercises/manifest.json"),
  ]);
  const lessons = await lessonsResp.json();
  const examples = await examplesResp.json();
  const exercises = await exercisesResp.json();

  lessonMap = {};
  exampleMap = {};

  for (const entry of lessons) {
    lessonMap[entry.num] = entry.file;
  }

  for (const entry of examples) {
    const match = entry.file.match(/^(\d{2})-/);
    if (match) exampleMap[match[1]] = entry.file;
  }

  const lessonGroup = document.createElement("optgroup");
  lessonGroup.label = "Lessons";
  for (const entry of lessons) {
    const opt = document.createElement("option");
    opt.value = `lesson:${entry.num}`;
    opt.textContent = `${entry.num} - ${entry.title}`;
    lessonGroup.appendChild(opt);
  }
  select.appendChild(lessonGroup);

  const exerGroup = document.createElement("optgroup");
  exerGroup.label = "Exercises";
  for (const entry of exercises) {
    const opt = document.createElement("option");
    opt.value = `exercise:${entry.file}`;
    opt.textContent = entry.title;
    exerGroup.appendChild(opt);
  }
  select.appendChild(exerGroup);

  if (lessons.length > 0) {
    select.value = `lesson:${lessons[0].num}`;
    await loadSelection();
  }
}

// Fetch raw source via Vite's ?raw query to bypass JS transforms
async function loadFile(path) {
  const mod = await import(/* @vite-ignore */ `/${path}?raw`);
  setCode(mod.default);
}

function setCode(text) {
  cmView.dispatch({
    changes: { from: 0, to: cmView.state.doc.length, insert: text },
  });
}

select.addEventListener("change", loadSelection);

async function loadSelection() {
  clearExampleOutput();

  if (select.value.startsWith("exercise:")) {
    const file = select.value.slice("exercise:".length);
    selectedRunnablePath = `exercises/${file}`;
    setCodeAvailable(true);
    lessonBtn.disabled = true;
    lessonBtn.textContent = "Lesson";
    await loadFile(selectedRunnablePath);
    setLessonMode(false);
    return;
  }

  const num = getSelectedNum();
  const exampleFile = num ? exampleMap[num] : null;
  selectedRunnablePath = exampleFile ? `examples/${exampleFile}` : null;

  setCodeAvailable(Boolean(selectedRunnablePath));
  await showLesson(num);

  if (selectedRunnablePath) {
    await loadFile(selectedRunnablePath);
  } else {
    setCode("");
  }

  setLessonMode(true);
}

function setCodeAvailable(hasCode) {
  codePanel.style.display = hasCode ? "" : "none";
  divider.style.display = hasCode ? "" : "none";
  runBtn.disabled = !hasCode;
  lessonBtn.disabled = !hasCode;
}

// ---------- Execute user code ----------
function clearExampleOutput() {
  cleanupViews();
  editorContainer.innerHTML = "";
  errorOutput.textContent = "";
  errorOutput.classList.remove("visible");

  // Remove any extra nodes appended to the result panel by previous examples
  // (log panels, status bars, debug panels, injected <style> elements, etc.)
  const rp = editorContainer.parentNode;
  for (let i = rp.childNodes.length - 1; i >= 0; i--) {
    const child = rp.childNodes[i];
    if (child !== editorContainer && child !== errorOutput && child !== lessonPanel) {
      rp.removeChild(child);
    }
  }
}

function runCode() {
  if (!selectedRunnablePath) return;

  clearExampleOutput();
  setLessonMode(false);

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

// ---------- Lesson panel toggle ----------
function getSelectedNum() {
  const val = select.value;
  if (val.startsWith("lesson:")) return val.slice("lesson:".length);

  const match = val.match(/(\d{2})-/);
  return match ? match[1] : null;
}

async function showLesson(num = getSelectedNum()) {
  if (!num || !lessonMap[num]) {
    lessonPanel.innerHTML = "<p><em>No lesson found.</em></p>";
    return;
  }
  const resp = await fetch(`/lessons/${lessonMap[num]}`);
  const md = await resp.text();
  lessonPanel.innerHTML = marked(md);
}

function hideExtraResultNodes() {
  for (const child of resultPanel.children) {
    if (child !== editorContainer && child !== errorOutput && child !== lessonPanel) {
      child.style.display = "none";
    }
  }
}

function showExtraResultNodes() {
  for (const child of resultPanel.children) {
    if (child !== editorContainer && child !== errorOutput && child !== lessonPanel) {
      child.style.display = "";
    }
  }
}

function setLessonMode(showLessonView) {
  showingLesson = showLessonView;

  if (showingLesson) {
    editorContainer.style.display = "none";
    errorOutput.classList.remove("visible");
    hideExtraResultNodes();
    lessonPanel.classList.remove("hidden");
    lessonBtn.classList.add("active");
    lessonBtn.textContent = selectedRunnablePath ? "Example" : "No Example";
  } else {
    editorContainer.style.display = "";
    showExtraResultNodes();
    lessonPanel.classList.add("hidden");
    lessonBtn.classList.remove("active");
    lessonBtn.textContent = "Lesson";
  }
}

lessonBtn.addEventListener("click", () => {
  if (selectedRunnablePath) setLessonMode(!showingLesson);
});

// ---------- Init ----------
loadManifest();
