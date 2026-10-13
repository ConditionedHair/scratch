# Scratch — Agent & Contributor Development Guide

Welcome to the Scratch codebase. This document is written specifically for AI coding agents and human contributors to understand the system architecture, design principles, invariants, and workflows of Scratch.

---

## 1. Project Overview & Philosophy

**Scratch** is a high-performance, offline-first markdown note-taking instrument designed exclusively for macOS.

### Key Tenets

1. **Plain Markdown Files You Own**: Notes are stored directly as standard `.md` files on the local filesystem. There is no proprietary database, no lock-in, and no mandatory cloud service.
2. **Braun / Dieter Rams Design Ethos**: The interface embodies minimalist industrial design inspired by classic Dieter Rams field instruments — matte hardware textures, subtle tactile feedback, signal yellow/orange accents, and strict elimination of visual clutter.
3. **Seamless WYSIWYG + Transparent Raw Source**: Users write in a fluid rich-text editor (powered by TipTap/ProseMirror), but can toggle into raw Markdown source mode (`Cmd+Shift+M`) at any moment.
4. **Local & Autonomous AI Integration**: Built-in support for pairing with local agent CLIs (Claude Code, OpenAI Codex, OpenCode, Ollama) and external filesystem watchers.

---

## 2. Tech Stack Architecture

| Layer                 | Technologies                                                                                                                        |
| :-------------------- | :---------------------------------------------------------------------------------------------------------------------------------- |
| **Desktop Shell**     | [Tauri v2](https://tauri.app/) (Rust backend)                                                                                       |
| **Frontend UI**       | [Svelte 5](https://svelte.dev/) (Runes), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS v4](https://tailwindcss.com/) |
| **Editor Core**       | [TipTap v3](https://tiptap.dev/) / [ProseMirror](https://prosemirror.net/)                                                          |
| **Search Engine**     | [Tantivy](https://github.com/quickwit-oss/tantivy) (Embedded Rust full-text search index)                                           |
| **Math & Diagrams**   | [KaTeX](https://katex.org/) (Block & inline math), [Mermaid](https://mermaid.js.org/) (Diagrams)                                    |
| **Design Components** | [Bits UI](https://bits-ui.com/) primitives, [Lucide-style custom SVG icons](./src/components/icons)                                 |

---

## 3. Directory Layout

```
scratch/
├── src/                          # Frontend Svelte 5/TypeScript application
│   ├── components/
│   │   ├── ai/                   # AI pairing modal (Claude, Codex, Ollama)
│   │   ├── command-palette/      # Global search & command palette (`Cmd+P`)
│   │   ├── editor/               # TipTap editor & formatting toolbars
│   │   │   ├── Editor.svelte     # Main editor view & floating toolbar
│   │   │   ├── Frontmatter.ts    # Atomic frontmatter TipTap extension
│   │   │   ├── TagBar.svelte     # Drag-and-drop tag management bar
│   │   │   ├── CodeBlockView.svelte # Syntax highlighted code blocks
│   │   │   ├── MathExtensions.ts # KaTeX block math extensions
│   │   │   └── SlashCommand.ts   # Quick insert `/` command menu
│   │   ├── layout/               # BraunHeader, BraunLibrary, Sidebar
│   │   ├── notes/                # Note list items, folders, tag list
│   │   ├── settings/             # Settings sections (General, Appearance, Tools)
│   │   └── ui/                   # Reusable buttons, dialogs, dropdowns, tooltips
│   ├── context/
│   │   ├── notes.svelte.ts       # Svelte 5 state management for notes
│   │   ├── theme.svelte.ts       # Braun themes, typography, custom colors
│   │   ├── git.svelte.ts         # Git sync status & commit actions
│   │   ├── calendar.svelte.ts    # Google Calendar integration state
│   │   └── mail.svelte.ts        # Gmail integration state
│   ├── lib/
│   │   ├── markdownSpacing.ts    # Markdown AST spacing normalization
│   │   ├── plainText.ts          # Frontmatter-stripping plain text parser
│   │   ├── shortcuts.ts          # Central keyboard shortcuts dictionary
│   │   └── tags.ts               # 24-color Braun palette for note tags
│   └── services/
│       ├── notes.ts              # Tauri IPC invoke wrappers for note operations
│       ├── files.ts              # Direct file read/write operations
│       └── pdf.ts                # PDF print & Markdown download exports
├── src-tauri/                    # Rust backend
│   ├── src/
│   │   ├── lib.rs                # Tauri command dispatchers & note filesystem handlers
│   │   ├── icloud.rs             # macOS iCloud Drive folder sync daemon integration
│   │   ├── git.rs                # Git push, pull, commit operations
│   │   └── search.rs             # Tantivy search index lifecycle & query logic
│   └── capabilities/             # Tauri v2 security & permission rules
└── docs/                         # Documentation assets, app icon, screenshots
```

---

## 4. Key Subsystems & Design Invariants

### 4.1 Frontmatter & Tags System

- **File Storage**: Tags are serialized directly into the `.md` file as flow-style YAML frontmatter:
    ```markdown
    ---
    tags: [Personal, Research]
    ---

    # Note Title

    Note body...
    ```
- **Editor Representation**:
    - In WYSIWYG mode, [`Frontmatter.ts`](./src/components/editor/Frontmatter.ts) defines frontmatter as an **atomic, unselectable, and non-draggable** TipTap node (`atom: true`, `selectable: false`, `draggable: false`).
    - In CSS, `.prose pre.frontmatter` is styled with `display: none !important`. This completely hides the raw frontmatter block from the visual editor canvas, preventing accidental cursor trapping or backspace deletions.
    - In raw Source Mode (`Cmd+Shift+M`), the raw markdown source is shown directly in the editor textarea, allowing users to view and edit YAML frontmatter.
    - In PDF Export and Plain Text / HTML copy, frontmatter is automatically stripped. In `.md` file export, frontmatter is preserved.
    - Tags are actively viewed, added, removed, reordered, and recolored via [`TagBar.svelte`](./src/components/editor/TagBar.svelte) at the top of the editor.

### 4.2 Hovering Formatting Toolbar (`FloatingFormatBar`)

- Sits at the bottom center of the editor canvas.
- **Compact Dropdowns**:
    - **Headings**: A single trigger dynamically showing `H` (normal text) or `H1` / `H2` / `H3` (with accent highlight).
    - **Lists**: A single trigger dynamically showing `ListIcon`, `ListOrderedIcon`, or `CheckSquareIcon` depending on the active block.
- **Responsive Collapse**: Monitored via a `ResizeObserver`. When the editor container width is under 700px, secondary tools (Blockquote, Code, Block Math, Horizontal Rule, Wikilink, Image, Table picker) collapse into a sleek **More (`...`)** overflow menu. Primary tools remain always accessible.

### 4.3 Command Palette vs. Link Shortcuts

- **`Cmd+P` (`Ctrl+P`)**: Global shortcut for **Search or Jump / Command Palette**.
- **`Cmd+K` (`Ctrl+K`)**: Editor shortcut for **Add / Edit Hyperlink**.
- _Agent Warning_: Never assign `Cmd+K` to the command palette, as it conflicts with universal markdown link insertion.

### 4.4 Multi-Device Sync

1. **iCloud Drive (macOS only)**: Operates at the filesystem layer inside `~/Library/Mobile Documents/com~apple~CloudDocs/`. Detects `.icloud` placeholder files on demand and invokes `brctl download` via [`icloud.rs`](./src-tauri/src/icloud.rs).
2. **Git Sync**: Built-in git repo detection, stage, commit, and remote push/pull via [`git.rs`](./src-tauri/src/git.rs).

### 4.5 Svelte 5 Runes State Management

- [`notes.svelte.ts`](./src/context/notes.svelte.ts) encapsulates note state using Svelte 5 runes:
    1. Reactive states (`notesState.notes`, `notesState.currentNote`, `notesState.selectedNoteId`) are declared with `$state`.
    2. Actions and helpers (`saveNote`, `deleteNote`, `selectNote`, `setTags`) are methods on the singleton `notesState` instance.
- _Agent Rule_: Import `notesState` directly from `./context/notes.svelte` in Svelte components.

---

## 5. Development Workflows & Commands

```bash
# Frontend development server (Vite only)
npm run dev

# Full application in development mode (Rust + Tauri + Vite)
npm run tauri dev

# Type check & bundle frontend
npm run build

# Check Rust backend compilation & clippy
cargo check --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml

# Build release desktop bundles
npm run tauri build
```

---

## 6. Coding Standards for AI Agents

1. **Strict TypeScript & Zero `any`**: All new types, props, and IPC return types must be explicitly defined in [`src/types/`](./src/types).
2. **No Dead Code**: Never commit commented-out code blocks or unaddressed `TODO` comments.
3. **Preserve Documentation Integrity**: Retain all docstrings and comments in files you touch.
4. **Fine-Grained Reactivity**:
    - Leverage Svelte 5 `$derived` and `$state` rather than redundant manual subscribers.
    - Use key blocks `{#each items as item (item.id)}` for optimized list rendering.
5. **Debounced Operations**: Debounce user-triggered writes and search queries:
    - Auto-save: ~300ms
    - Tantivy search: ~150ms
    - Filesystem watcher: ~500ms
6. **Always Verify**: Run `npm run build` before concluding any turn modifying frontend code.
