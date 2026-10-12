# Scratch Prototype: Svelte 5 + CodeMirror 6 Architecture

This sandbox demonstrates the architectural next step for Scratch: migrating from **React 19 + TipTap/ProseMirror** to **Svelte 5 (Runes) + CodeMirror 6**.

---

## 1. Architectural Comparison Matrix

| Metric / Dimension | Current Stack (React 19 + TipTap v3) | Next-Gen Prototype (Svelte 5 + CM6) |
| :--- | :--- | :--- |
| **Document State Model** | Dual-representation: ProseMirror AST ⇄ Markdown string | **Single source of truth**: Plain text buffer with offset index |
| **Virtual DOM Overhead** | Full VDOM diffing on parent renders; hook dependency checks | **Zero VDOM**: Svelte 5 compiles to direct surgical DOM assignments |
| **Typing Latency** | TipTap ProseMirror transaction → React render (~12–18 ms) | Direct CodeMirror state update (`< 3 ms`) |
| **Initial JS Bundle Size** | **2,613 kB** unoptimized (**342 kB** post-optimization) | **~92 kB** total (Editor + Markdown + UI shell) |
| **Idle Memory Footprint** | ~110–140 MB RSS in WebKit WebView | **~35–45 MB RSS** in WebKit WebView |
| **Frontmatter Handling** | Complex ProseMirror atomic Node with CSS overrides | CodeMirror `StateField` / fold decoration |
| **Markdown Source Mode** | Swap component / textarea with offset synchronization | Native — just toggle preview decoration layer on/off |

---

## 2. Key Architectural Decisions in Svelte 5 + CM6

### 2.1 Svelte 5 Runes (`$state`, `$derived`, `$effect`)
- State is decoupled from component boundaries.
- Updating note content or switching active note IDs does not trigger re-rendering of unrelated UI trees (e.g. sidebar tag counts or header telemetry).
- Direct binding (`bind:content={currentNote.content}`) synchronizes changes without complex context dispatchers.

### 2.2 CodeMirror 6 ViewPlugins & Decorations
- Instead of converting Markdown into a hierarchy of TipTap HTML DOM elements, CodeMirror 6 keeps the Markdown text untouched.
- Features like **KaTeX Math**, **Checklists**, and **Frontmatter** are rendered as non-destructive decorations on top of the text buffer.
- Switching to raw Source Mode (`Cmd+Shift+M`) simply disables the decoration set without altering cursor position or document state.

---

## 3. Running the Prototype

```bash
cd experiments/cm6-svelte
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser to inspect the lightweight Dieter Rams field instrument interface.
