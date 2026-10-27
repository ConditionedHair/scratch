# Graph Report - scratch  (2026-10-27)

## Corpus Check
- 218 files · ~174,812 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1140 nodes · 2440 edges · 99 communities (42 shown, 40 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.79)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7060a235`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lib.rs
- ui/index.ts
- ThemeState
- tauri.conf.json
- devDependencies
- SvelteRenderer
- git.rs
- compilerOptions
- gmail.rs
- tags.ts
- permissions
- MailState
- notes.ts
- Editor.svelte
- calendar.svelte.ts
- platform.ts
- SettingsPage.svelte
- ai.ts
- dependencies
- CalendarManager
- NotesState
- theme.svelte.ts
- compilerOptions
- SearchIndex
- GitState
- Scratch App Screenshot
- icloud.rs
- Scratch — Agent & Contributor Development Guide
- Project Overview (Tauri v2 + React/TypeScript/Tailwind + TipTap + Tantivy)
- Key Patterns Section
- Release Workflow
- Folders Dark Illustration (Cat holding folder)
- notes.svelte.ts
- CI Workflow
- Note Dark Illustration (Cat Writing in Notepad)
- Dev Commands (npm run dev/build/tauri dev/tauri build)
- App.svelte
- markdownSpacing.ts
- highlight.js
- katex
- lowlight
- tokens.ts
- CodeBlockNodeView
- motion.ts
- clsx
- bits-ui
- colord
- svelte
- tailwind-merge
- @tauri-apps/api
- @tauri-apps/plugin-clipboard-manager
- svelte-dnd-action
- @tauri-apps/plugin-opener
- @tauri-apps/plugin-updater
- svelte-sonner
- @tiptap/extension-code-block-lowlight
- @tiptap/extension-image
- @tiptap/extension-link
- @tiptap/extension-mathematics
- @tiptap/core
- @tiptap/extension-table
- @tiptap/extension-table-cell
- @tiptap/extension-table-header
- @tiptap/extension-table-row
- @tiptap/extension-task-item
- @tiptap/extension-task-list
- @tiptap/markdown
- @tiptap/pm
- @tiptap/starter-kit
- @tiptap/suggestion
- Coding Conventions
- Contributing Guidelines
- Keyboard Shortcuts Table
- Scratch Project Description
- pdf.ts
- CommandPalette.svelte
- BraunNoteList.svelte
- workspaceMotion.ts
- Scratch
- files.ts
- SearchHighlight.ts
- workspaceMotion

## God Nodes (most connected - your core abstractions)
1. `AppState` - 55 edges
2. `ThemeState` - 32 edges
3. `GmailManager` - 30 edges
4. `NotesState` - 30 edges
5. `CalendarManager` - 26 edges
6. `MailState` - 20 edges
7. `GitState` - 19 edges
8. `permissions` - 16 edges
9. `setup_file_watcher()` - 16 edges
10. `getSettings()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `Built With (Tauri, React, TipTap, Tailwind CSS, Tantivy)` --semantically_similar_to--> `Project Overview (Tauri v2 + React/TypeScript/Tailwind + TipTap + Tantivy)`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Dev Commands (npm run dev/build/tauri dev/tauri build)` --semantically_similar_to--> `Installation Instructions (Homebrew, manual download, from source)`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md
- `index.html App Entry Point (mounts #root, loads /src/main.tsx)` --conceptually_related_to--> `Project Overview (Tauri v2 + React/TypeScript/Tailwind + TipTap + Tantivy)`  [INFERRED]
  index.html → CLAUDE.md
- `Serena Project Config (scratch, typescript language server)` --conceptually_related_to--> `Project Overview (Tauri v2 + React/TypeScript/Tailwind + TipTap + Tantivy)`  [INFERRED]
  .serena/project.yml → CLAUDE.md
- `Features List` --conceptually_related_to--> `Project Overview (Tauri v2 + React/TypeScript/Tailwind + TipTap + Tantivy)`  [INFERRED]
  README.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CI Validation Flow (frontend build + cargo check/clippy)** — github_workflows_ci_workflow, github_workflows_ci_checkjob, claude_ci_section [INFERRED 0.85]
- **Release Process (tag push -> multi-platform build -> deb repack -> draft release)** — github_workflows_release_workflow, github_workflows_release_buildandreleasejob, github_workflows_release_renamedebpackagejob, claude_releasing_steps [INFERRED 0.85]

## Communities (99 total, 40 thin omitted)

### Community 0 - "lib.rs"
Cohesion: 0.06
Nodes (139): AppHandle, Default, DirEntry, GitResult, GitStatus, HashMap, IcloudStatus, Instant (+131 more)

### Community 1 - "ui/index.ts"
Cohesion: 0.13
Nodes (4): AlertDialog, AlertDialogPortal, AlertDialogTrigger, cn()

### Community 2 - "ThemeState"
Cohesion: 0.15
Nodes (6): isTextDirection(), migrateCustomColors(), ThemeState, getSettings(), updateSettings(), ThemeColorKey

### Community 3 - "tauri.conf.json"
Cohesion: 0.05
Nodes (38): dmg, $HOME/**, https://github.com/erictli/scratch/releases/latest/download/latest.json, icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, app (+30 more)

### Community 5 - "devDependencies"
Cohesion: 0.06
Nodes (32): devDependencies, prettier, prettier-plugin-svelte, svelte-check, @sveltejs/vite-plugin-svelte, tailwindcss, @tailwindcss/typography, @tailwindcss/vite (+24 more)

### Community 6 - "SvelteRenderer"
Cohesion: 0.15
Nodes (11): SLASH_COMMANDS, SlashCommand, SlashCommandItem, slashCommandPluginKey, SvelteRenderer, SvelteRendererOptions, Wikilink, WikilinkStorage (+3 more)

### Community 7 - "git.rs"
Cohesion: 0.24
Nodes (25): Command, add_remote(), commit_all(), fetch(), get_remote_url(), get_status(), git_cmd(), git_init() (+17 more)

### Community 8 - "compilerOptions"
Cohesion: 0.08
Nodes (24): DOM, DOM.Iterable, ES2020, src/**/*.d.ts, src/**/*.js, src/**/*.svelte, src/**/*.ts, compilerOptions (+16 more)

### Community 9 - "gmail.rs"
Cohesion: 0.16
Nodes (37): AttachmentData, decode_base64_url(), extract_body_and_attachments(), get_header(), GmailAuth, GmailManager, html_to_clean_markdown(), mail_disconnect() (+29 more)

### Community 10 - "tags.ts"
Cohesion: 0.21
Nodes (7): #each(), idx(), assignTagColor(), getTagColor(), hashTag(), TAG_PALETTE, tokens

### Community 11 - "permissions"
Cohesion: 0.09
Nodes (22): clipboard-manager:allow-write-text, core:default, core:menu:default, core:webview:allow-print, core:window:allow-close, core:window:allow-is-maximized, core:window:allow-set-focus, core:window:allow-start-dragging (+14 more)

### Community 12 - "MailState"
Cohesion: 0.07
Nodes (10): MailState, GMAIL_CATEGORY_MAP, AttachmentData, MailAttachment, MailLabel, MailMessage, MailSyncState, MailThread (+2 more)

### Community 13 - "notes.ts"
Cohesion: 0.13
Nodes (4): createNote(), duplicateNote(), readNote(), saveNote()

### Community 14 - "Editor.svelte"
Cohesion: 0.09
Nodes (5): addInputRules(), normalizeUrl(), Frontmatter, normalizeBlockMath(), ScratchBlockMath

### Community 15 - "calendar.svelte.ts"
Cohesion: 0.08
Nodes (12): if(), CalendarState, formatEventDateKey(), getExclusiveEndDate(), getInclusiveEndDate(), parseEventDate(), CalendarEntry, CalendarEvent (+4 more)

### Community 16 - "platform.ts"
Cohesion: 0.20
Nodes (8): alt, isMac, isWindows, mod, shift, Shortcut, shortcutCategories, ShortcutCategory

### Community 19 - "ai.ts"
Cohesion: 0.12
Nodes (5): handleKeyDown(), AI_PROVIDER_ORDER, AiExecutionResult, AiProvider, providerCheckers

### Community 20 - "dependencies"
Cohesion: 0.22
Nodes (9): dependencies, beautiful-mermaid, @tauri-apps/plugin-dialog, tippy.js, @tiptap/extension-placeholder, beautiful-mermaid, tippy.js, @tauri-apps/plugin-dialog (+1 more)

### Community 21 - "CalendarManager"
Cohesion: 0.21
Nodes (27): calendar_create_event(), calendar_delete_event(), calendar_disconnect(), calendar_get_state(), calendar_start_auth(), calendar_sync(), calendar_toggle_visibility(), calendar_update_event() (+19 more)

### Community 22 - "NotesState"
Cohesion: 0.07
Nodes (3): NotesState, GitResult, GitStatus

### Community 23 - "theme.svelte.ts"
Cohesion: 0.11
Nodes (16): defaultEditorFontSettings, defaultThemeColors, editorWidthMap, fontFamilyMap, parseCssColorToRgb(), ThemeMode, SIDEBAR_DEFAULT_PX, SIDEBAR_MAX_PX (+8 more)

### Community 24 - "compilerOptions"
Cohesion: 0.22
Nodes (8): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 25 - "SearchIndex"
Cohesion: 0.18
Nodes (13): Field, Index, IndexReader, IndexWriter, Schema, Mutex, PathBuf, Result (+5 more)

### Community 27 - "Scratch App Screenshot"
Cohesion: 0.43
Nodes (7): Scratch App Screenshot, Interactive Checklist (Task List), Editor Formatting Toolbar, Embedded Mermaid Diagram Rendering, Notes Sidebar UI, "Project Catnip" Sample Note, "Files changed" Version Control Indicator

### Community 28 - "icloud.rs"
Cohesion: 0.29
Nodes (14): container_dir(), ensure_default_folder(), get_status(), IcloudStatus, is_inside_icloud(), is_placeholder(), placeholder_path(), real_name_from_placeholder() (+6 more)

### Community 29 - "Scratch — Agent & Contributor Development Guide"
Cohesion: 0.14
Nodes (13): 1. Project Overview & Philosophy, 2. Tech Stack Architecture, 3. Directory Layout, 4.1 Frontmatter & Tags System, 4.2 Hovering Formatting Toolbar (`FloatingFormatBar`), 4.3 Command Palette vs. Link Shortcuts, 4.4 Multi-Device Sync, 4.5 Svelte 5 Runes State Management (+5 more)

### Community 30 - "Project Overview (Tauri v2 + React/TypeScript/Tailwind + TipTap + Tantivy)"
Cohesion: 0.40
Nodes (5): Project Overview (Tauri v2 + React/TypeScript/Tailwind + TipTap + Tantivy), index.html App Entry Point (mounts #root, loads /src/main.tsx), Built With (Tauri, React, TipTap, Tailwind CSS, Tantivy), Features List, Serena Project Config (scratch, typescript language server)

### Community 31 - "Key Patterns Section"
Cohesion: 0.50
Nodes (4): Key Patterns Section, NotesContext Dual Context Pattern (data/actions separated for performance), Settings Storage Locations (app config.json + per-folder .scratch/settings.json), Tauri v2 Capabilities Permissions (src-tauri/capabilities/default.json)

### Community 32 - "Release Workflow"
Cohesion: 0.67
Nodes (4): Releasing Steps, Build and Release Job (macOS/Ubuntu/Windows matrix via tauri-action), Rename Deb Package Job (repacks 'scratch' deb as 'scratch-notes' to avoid Ubuntu name collision, issue #119), Release Workflow

### Community 33 - "Folders Dark Illustration (Cat holding folder)"
Cohesion: 0.50
Nodes (4): Dark Theme / Dark Mode, Empty-State Illustration (UI Design Pattern), Folders Dark Illustration (Cat holding folder), Scratch (note-taking app)

### Community 34 - "notes.svelte.ts"
Cohesion: 0.18
Nodes (3): IcloudStatus, SearchResult, Note

### Community 35 - "CI Workflow"
Cohesion: 0.67
Nodes (3): CI Description Section, Check Job (build + cargo check/clippy), CI Workflow

### Community 36 - "Note Dark Illustration (Cat Writing in Notepad)"
Cohesion: 0.67
Nodes (3): Note Dark Illustration (Cat Writing in Notepad), Note Light Illustration (light-mode counterpart), Scratch (App)

### Community 39 - "markdownSpacing.ts"
Cohesion: 0.31
Nodes (9): if(), cleanSerializedMarkdown(), hasHardBreak(), isHorizontalRule(), isListContinuation(), isListItem(), isTableRow(), LineType (+1 more)

### Community 43 - "tokens.ts"
Cohesion: 0.20
Nodes (9): compileTokensToCss(), DesignTokens, LEGACY_TO_SEMANTIC_KEY_MAP, LegacyColorKey, SEMANTIC_TO_LEGACY_KEY_MAP, SemanticColorKey, designTokensPlugin(), regenerate() (+1 more)

### Community 44 - "CodeBlockNodeView"
Cohesion: 0.17
Nodes (5): CodeBlockNodeView, SvelteCodeBlockNodeViewRenderer(), addNodeView(), lowlight, SUPPORTED_LANGUAGES

### Community 45 - "motion.ts"
Cohesion: 0.22
Nodes (13): backdropIn(), backdropOut(), easeBraunExit, easeBraunSnappy, floatingBarIn(), floatingBarOut(), metaSettle(), modalIn() (+5 more)

### Community 81 - "pdf.ts"
Cohesion: 0.67
Nodes (3): downloadMarkdown(), downloadPdf(), sanitizeFilename()

### Community 92 - "CommandPalette.svelte"
Cohesion: 0.21
Nodes (8): allItems, filteredCommands, filteredNotes, countMarkdownWords(), countWords(), plainTextFromMarkdown(), stripFrontmatter(), cleanTitle()

### Community 94 - "workspaceMotion.ts"
Cohesion: 0.36
Nodes (5): workspaceOrder, AppView, WorkspaceDirection, WorkspaceMotionParams, WorkspaceView

### Community 97 - "SearchHighlight.ts"
Cohesion: 0.50
Nodes (3): SearchHighlight, SearchHighlightOptions, searchHighlightPluginKey

### Community 98 - "workspaceMotion"
Cohesion: 0.83
Nodes (4): workspaceMotion(), cancel(), enter(), handleReducedMotion()

## Ambiguous Edges - Review These
- `Notes Sidebar UI` → `"Files changed" Version Control Indicator`  [AMBIGUOUS]
  docs/screenshot.png · relation: conceptually_related_to

## Knowledge Gaps
- **200 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+195 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 453 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **40 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Notes Sidebar UI` and `"Files changed" Version Control Indicator`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `NotesState` connect `NotesState` to `App.svelte`, `notes.svelte.ts`, `Editor.svelte`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `GitState` connect `GitState` to `NotesState`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _200 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.05992618492618493 - nodes in this community are weakly interconnected._
- **Should `ui/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12962962962962962 - nodes in this community are weakly interconnected._
- **Should `ThemeState` be split into smaller, more focused modules?**
  _Cohesion score 0.146218487394958 - nodes in this community are weakly interconnected._