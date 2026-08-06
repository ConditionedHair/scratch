# Graph Report - scratch  (2026-08-06)

## Corpus Check
- 81 files · ~133,625 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 866 nodes · 2066 edges · 86 communities (41 shown, 45 thin omitted)
- Extraction: 98% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.68)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `a4d5cc41`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- lib.rs
- ui/index.tsx
- ThemeContext.tsx
- tauri.conf.json
- icons/index.tsx
- devDependencies
- SlashCommand.tsx
- git.rs
- compilerOptions
- Sidebar.tsx
- NoteMetadata
- permissions
- App.tsx
- FolderTreeView.tsx
- Editor.tsx
- SettingsPage.tsx
- LinkEditor.tsx
- ToolsSettingsSection.tsx
- git.ts
- ai.ts
- dependencies
- useTheme
- GeneralSettingsSection.tsx
- CodeBlockView.tsx
- compilerOptions
- cn
- SuggestionList.tsx
- Scratch App Screenshot
- PreviewApp.tsx
- ColorPicker.tsx
- Project Overview (Tauri v2 + React/TypeScript/Tailwind + TipTap + Tantivy)
- Key Patterns Section
- Release Workflow
- Folders Dark Illustration (Cat holding folder)
- SidebarResizeHandle.tsx
- CI Workflow
- Note Dark Illustration (Cat Writing in Notepad)
- Dev Commands (npm run dev/build/tauri dev/tauri build)
- @dnd-kit/core
- @dnd-kit/sortable
- highlight.js
- katex
- lowlight
- @radix-ui/react-alert-dialog
- @radix-ui/react-context-menu
- @radix-ui/react-dropdown-menu
- @radix-ui/react-tooltip
- react
- react-colorful
- sonner
- tailwind-merge
- @tauri-apps/api
- @tauri-apps/plugin-clipboard-manager
- @tauri-apps/plugin-dialog
- @tauri-apps/plugin-opener
- @tauri-apps/plugin-updater
- tippy.js
- @tiptap/extension-code-block-lowlight
- @tiptap/extension-image
- @tiptap/extension-link
- @tiptap/extension-mathematics
- @tiptap/extension-placeholder
- @tiptap/extension-table
- @tiptap/extension-table-cell
- @tiptap/extension-table-header
- @tiptap/extension-table-row
- @tiptap/extension-task-item
- @tiptap/extension-task-list
- @tiptap/markdown
- @tiptap/pm
- @tiptap/react
- @tiptap/starter-kit
- @tiptap/suggestion
- Coding Conventions
- Contributing Guidelines
- Keyboard Shortcuts Table
- Scratch Project Description
- pdf.ts
- Option
- Path
- Result
- String

## God Nodes (most connected - your core abstractions)
1. `AppState` - 55 edges
2. `cn()` - 25 edges
3. `useNotes()` - 20 edges
4. `setup_file_watcher()` - 18 edges
5. `useTheme()` - 17 edges
6. `compilerOptions` - 16 edges
7. `get_effective_ignored_dirs()` - 15 edges
8. `run()` - 15 edges
9. `Settings` - 14 edges
10. `extract_title()` - 14 edges

## Surprising Connections (you probably didn't know these)
- `Built With (Tauri, React, TipTap, Tailwind CSS, Tantivy)` --semantically_similar_to--> `Project Overview (Tauri v2 + React/TypeScript/Tailwind + TipTap + Tantivy)`  [INFERRED] [semantically similar]
  README.md → CLAUDE.md
- `Dev Commands (npm run dev/build/tauri dev/tauri build)` --semantically_similar_to--> `Installation Instructions (Homebrew, manual download, from source)`  [INFERRED] [semantically similar]
  CLAUDE.md → README.md
- `Serena Project Config (scratch, typescript language server)` --conceptually_related_to--> `Project Overview (Tauri v2 + React/TypeScript/Tailwind + TipTap + Tantivy)`  [INFERRED]
  .serena/project.yml → CLAUDE.md
- `index.html App Entry Point (mounts #root, loads /src/main.tsx)` --conceptually_related_to--> `Project Overview (Tauri v2 + React/TypeScript/Tailwind + TipTap + Tantivy)`  [INFERRED]
  index.html → CLAUDE.md
- `Features List` --conceptually_related_to--> `Project Overview (Tauri v2 + React/TypeScript/Tailwind + TipTap + Tantivy)`  [INFERRED]
  README.md → CLAUDE.md

## Import Cycles
- 4-file cycle: `src/App.tsx -> src/components/settings/index.tsx -> src/components/settings/SettingsPage.tsx -> src/components/settings/AboutSettingsSection.tsx -> src/App.tsx`

## Hyperedges (group relationships)
- **CI Validation Flow (frontend build + cargo check/clippy)** — github_workflows_ci_workflow, github_workflows_ci_checkjob, claude_ci_section [INFERRED 0.85]
- **Release Process (tag push -> multi-platform build -> deb repack -> draft release)** — github_workflows_release_workflow, github_workflows_release_buildandreleasejob, github_workflows_release_renamedebpackagejob, claude_releasing_steps [INFERRED 0.85]

## Communities (86 total, 45 thin omitted)

### Community 0 - "lib.rs"
Cohesion: 0.06
Nodes (139): AppHandle, Arc, Default, DirEntry, Field, GitResult, GitStatus, HashMap (+131 more)

### Community 1 - "ui/index.tsx"
Cohesion: 0.12
Nodes (23): FolderNameDialog(), FolderNameDialogProps, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter(), AlertDialogHeader() (+15 more)

### Community 2 - "ThemeContext.tsx"
Cohesion: 0.11
Nodes (27): MinusIcon(), boldWeightOptions, colorLabels, editorWidthOptions, fontFamilyOptions, textDirectionOptions, applyFontCSSVariables(), applyLayoutCSSVariables() (+19 more)

### Community 3 - "tauri.conf.json"
Cohesion: 0.05
Nodes (40): $HOME/**, https://github.com/erictli/scratch/releases/latest/download/latest.json, icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, app (+32 more)

### Community 4 - "icons/index.tsx"
Cohesion: 0.08
Nodes (23): Command, CommandPaletteProps, SearchToolbar(), SearchToolbarProps, AddNoteIcon(), ArrowDownIcon(), ArrowUpIcon(), CopyIcon() (+15 more)

### Community 5 - "devDependencies"
Cohesion: 0.07
Nodes (28): devDependencies, tailwindcss, @tailwindcss/typography, @tailwindcss/vite, @tauri-apps/cli, @types/react, @types/react-dom, typescript (+20 more)

### Community 6 - "SlashCommand.tsx"
Cohesion: 0.10
Nodes (19): SLASH_COMMANDS, SlashCommand, slashCommandPluginKey, BlockMathIcon(), BracketsIcon(), CheckSquareIcon(), CodeIcon(), Heading1Icon() (+11 more)

### Community 7 - "git.rs"
Cohesion: 0.26
Nodes (24): add_remote(), commit_all(), fetch(), get_remote_url(), get_status(), git_cmd(), git_init(), GitResult (+16 more)

### Community 8 - "compilerOptions"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, isolatedModules, jsx (+14 more)

### Community 9 - "Sidebar.tsx"
Cohesion: 0.26
Nodes (9): GitBranchIcon(), SearchOffIcon(), Footer, FooterProps, SidebarProps, IconButton, isMac, mod (+1 more)

### Community 10 - "NoteMetadata"
Cohesion: 0.27
Nodes (9): Wikilink, WikilinkStorage, WikilinkSuggestion, wikilinkSuggestionPluginKey, WikilinkSuggestionList, WikilinkSuggestionListProps, WikilinkSuggestionListRef, FileItemProps (+1 more)

### Community 11 - "permissions"
Cohesion: 0.10
Nodes (20): clipboard-manager:allow-write-text, core:default, core:menu:default, core:webview:allow-print, core:window:allow-close, core:window:allow-set-focus, core:window:allow-start-dragging, dialog:allow-open (+12 more)

### Community 12 - "App.tsx"
Cohesion: 0.17
Nodes (17): App(), getWindowMode(), ViewState, AiEditModal(), AiEditModalProps, AiResponseToast(), AiResponseToastProps, parseInlineMarkdown() (+9 more)

### Community 13 - "FolderTreeView.tsx"
Cohesion: 0.05
Nodes (54): CommandPalette(), TagBar(), TagBarProps, ChevronRightIcon(), Sidebar(), FileItem, FolderItemComponent, FolderItemProps (+46 more)

### Community 14 - "Editor.tsx"
Cohesion: 0.08
Nodes (29): BlockMathEditor(), blockIndexToPos(), Editor(), EditorProps, focusAndSelectTitle(), FormatBarProps, formatDateTime(), getMarkdownBlockOffsets() (+21 more)

### Community 15 - "SettingsPage.tsx"
Cohesion: 0.14
Nodes (15): showUpdateToast(), ArrowLeftIcon(), GithubIcon(), InfoIcon(), IntegrationsIcon(), KeyboardIcon(), RefreshCwIcon(), SpinnerIcon() (+7 more)

### Community 16 - "LinkEditor.tsx"
Cohesion: 0.10
Nodes (14): BlockMathEditorProps, LinkEditor(), LinkEditorProps, CheckIcon(), LinkOffIcon(), XIcon(), settingsCategories, ShortcutsSettingsSection() (+6 more)

### Community 17 - "ToolsSettingsSection.tsx"
Cohesion: 0.16
Nodes (8): AI_PROVIDER_INFO, CliAction, cliInitialState, cliReducer(), CliState, ToolsSettingsSection(), AI_PROVIDER_ORDER, CliStatus

### Community 18 - "git.ts"
Cohesion: 0.12
Nodes (6): GitContext, GitContextValue, GitProvider(), useNotesData(), GitResult, GitStatus

### Community 20 - "dependencies"
Cohesion: 0.18
Nodes (11): beautiful-mermaid, clsx, @dnd-kit/utilities, dependencies, beautiful-mermaid, clsx, @dnd-kit/utilities, react-dom (+3 more)

### Community 21 - "useTheme"
Cohesion: 0.27
Nodes (8): AppContent(), EditorWidthHandles(), EditorWidthHandlesProps, PRESET_PX, AppearanceSettingsSection(), Toaster(), useTheme(), EditorWidth

### Community 22 - "GeneralSettingsSection.tsx"
Cohesion: 0.21
Nodes (9): CloudPlusIcon(), ExternalLinkIcon(), FolderIcon(), FoldersIcon(), formatRemoteUrl(), GeneralSettingsSection(), getRemoteWebUrl(), IgnoredFoldersEditor() (+1 more)

### Community 23 - "CodeBlockView.tsx"
Cohesion: 0.24
Nodes (7): CodeBlockView(), lowlight, SUPPORTED_LANGUAGES, MermaidRenderer(), MermaidRendererProps, EyeIcon(), PencilIcon()

### Community 24 - "compilerOptions"
Cohesion: 0.22
Nodes (8): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 25 - "cn"
Cohesion: 0.16
Nodes (12): SuggestionListInner(), ChevronDownIcon(), ColorsExpandable(), ButtonProps, buttonSizes, buttonVariants, CodeCopyButton(), CodeCopyButtonProps (+4 more)

### Community 26 - "SuggestionList.tsx"
Cohesion: 0.31
Nodes (7): SlashCommandItem, SlashCommandList, SlashCommandListProps, SlashCommandListRef, SuggestionList, SuggestionListProps, SuggestionListRef

### Community 27 - "Scratch App Screenshot"
Cohesion: 0.43
Nodes (7): Scratch App Screenshot, Interactive Checklist (Task List), Editor Formatting Toolbar, Embedded Mermaid Diagram Rendering, Notes Sidebar UI, "Project Catnip" Sample Note, "Files changed" Version Control Indicator

### Community 28 - "PreviewApp.tsx"
Cohesion: 0.18
Nodes (5): PreviewModeData, PreviewApp(), PreviewAppProps, FileContent, ImportedNote

### Community 29 - "ColorPicker.tsx"
Cohesion: 0.39
Nodes (7): ColorPicker(), ColorPickerProps, colorsEqual(), parseColor(), RgbaColor, rgbaToHex(), rgbaToString()

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

### Community 34 - "SidebarResizeHandle.tsx"
Cohesion: 0.48
Nodes (5): applyWidthVar(), SidebarResizeHandle(), SIDEBAR_DEFAULT_PX, SIDEBAR_MAX_PX, SIDEBAR_MIN_PX

### Community 35 - "CI Workflow"
Cohesion: 0.67
Nodes (3): CI Description Section, Check Job (build + cargo check/clippy), CI Workflow

### Community 36 - "Note Dark Illustration (Cat Writing in Notepad)"
Cohesion: 0.67
Nodes (3): Note Dark Illustration (Cat Writing in Notepad), Note Light Illustration (light-mode counterpart), Scratch (App)

### Community 81 - "pdf.ts"
Cohesion: 0.67
Nodes (3): downloadMarkdown(), downloadPdf(), sanitizeFilename()

## Ambiguous Edges - Review These
- `Notes Sidebar UI` → `"Files changed" Version Control Indicator`  [AMBIGUOUS]
  docs/screenshot.png · relation: conceptually_related_to

## Knowledge Gaps
- **225 isolated node(s):** `Command`, `CommandPaletteProps`, `katexMacros`, `searchHighlightPluginKey`, `SearchHighlightOptions` (+220 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Notes Sidebar UI` and `"Files changed" Version Control Indicator`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `dependencies` connect `dependencies` to `devDependencies`, `@dnd-kit/core`, `@dnd-kit/sortable`, `highlight.js`, `katex`, `lowlight`, `@radix-ui/react-alert-dialog`, `@radix-ui/react-context-menu`, `@radix-ui/react-dropdown-menu`, `@radix-ui/react-tooltip`, `react`, `react-colorful`, `sonner`, `tailwind-merge`, `@tauri-apps/api`, `@tauri-apps/plugin-clipboard-manager`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-opener`, `@tauri-apps/plugin-updater`, `tippy.js`, `@tiptap/extension-code-block-lowlight`, `@tiptap/extension-image`, `@tiptap/extension-link`, `@tiptap/extension-mathematics`, `@tiptap/extension-placeholder`, `@tiptap/extension-table`, `@tiptap/extension-table-cell`, `@tiptap/extension-table-header`, `@tiptap/extension-table-row`, `@tiptap/extension-task-item`, `@tiptap/extension-task-list`, `@tiptap/markdown`, `@tiptap/pm`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/suggestion`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `ui/index.tsx`, `SidebarResizeHandle.tsx`, `ThemeContext.tsx`, `Sidebar.tsx`, `FolderTreeView.tsx`, `Editor.tsx`, `useTheme`, `SuggestionList.tsx`, `ColorPicker.tsx`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `Command`, `CommandPaletteProps`, `katexMacros` to the rest of the system?**
  _225 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `lib.rs` be split into smaller, more focused modules?**
  _Cohesion score 0.06121893705786323 - nodes in this community are weakly interconnected._
- **Should `ui/index.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.12169312169312169 - nodes in this community are weakly interconnected._
- **Should `ThemeContext.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.11494252873563218 - nodes in this community are weakly interconnected._