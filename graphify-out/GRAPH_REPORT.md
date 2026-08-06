# Graph Report - .  (2026-08-06)

## Corpus Check
- 105 files · ~131,288 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 841 nodes · 2004 edges · 81 communities (38 shown, 43 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 31 edges (avg confidence: 0.7)
- Token cost: 124,112 input · 0 output

## Community Hubs (Navigation)
- Rust Backend Core (files, git, index, watcher)
- Folder Tree & Note List UI
- Resizable Layout & Editor Settings
- Tauri Config & Release Assets
- Editor Icons & Search Toolbar
- Package Dev Dependencies
- Editor Core & Slash Commands
- Git Integration (Rust)
- TypeScript Config
- Command Palette & Sidebar Footer
- Wikilink & Suggestion Lists
- Tauri Capability Permissions
- App Shell & AI Edit Features
- Notes Service Layer
- Markdown & PDF Utilities
- Settings Page & Update Toast
- Keyboard Shortcuts Settings
- Tools Settings (CLI/AI Providers)
- Git Service Layer (Frontend)
- AI Provider Execution Service
- Editor & Utility npm Dependencies
- Notes Context & Folder Tree State
- Icon Set (Misc UI Icons)
- Code Block View & Syntax Highlight
- Vite Node TypeScript Config
- Block Math & Link Editors
- Notes Context Definitions
- App Screenshot Concepts
- File Import Service
- Git Context Provider
- Project Overview Docs
- CLAUDE.md Key Patterns
- Release Workflow & Deb Rename
- Folders-Dark Icon Concepts
- Preview App Mode
- CI Workflow
- Note Icon Variants
- CLAUDE.md Commands & Installation
- Community 38
- Community 39
- Community 40
- Community 41
- Community 42
- Community 43
- Community 44
- Community 45
- Community 46
- Community 47
- Community 48
- Community 49
- Community 50
- Community 51
- Community 52
- Community 53
- Community 54
- Community 55
- Community 56
- Community 57
- Community 58
- Community 59
- Community 60
- Community 61
- Community 62
- Community 63
- Community 64
- Community 65
- Community 66
- Community 67
- Community 68
- Community 69
- Community 70
- Community 71
- Community 72
- Community 75
- Community 76
- Community 77
- Community 78

## God Nodes (most connected - your core abstractions)
1. `AppState` - 53 edges
2. `cn()` - 28 edges
3. `Editor()` - 21 edges
4. `useTheme()` - 19 edges
5. `setup_file_watcher()` - 18 edges
6. `useNotes()` - 18 edges
7. `compilerOptions` - 16 edges
8. `run()` - 15 edges
9. `permissions` - 14 edges
10. `Settings` - 14 edges

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

## Communities (81 total, 43 thin omitted)

### Community 0 - "Rust Backend Core (files, git, index, watcher)"
Cohesion: 0.06
Nodes (133): AppHandle, Arc, Default, DirEntry, Field, GitResult, GitStatus, HashMap (+125 more)

### Community 1 - "Folder Tree & Note List UI"
Cohesion: 0.06
Nodes (54): GridPicker(), ChevronDownIcon(), CopyIcon(), NoteIcon(), PinIcon(), TrashIcon(), FolderNameDialog(), FolderNameDialogProps (+46 more)

### Community 2 - "Resizable Layout & Editor Settings"
Cohesion: 0.07
Nodes (48): EditorWidthHandles(), EditorWidthHandlesProps, PRESET_PX, MinusIcon(), PlusIcon(), applyWidthVar(), SidebarResizeHandle(), AppearanceSettingsSection() (+40 more)

### Community 3 - "Tauri Config & Release Assets"
Cohesion: 0.05
Nodes (40): $HOME/**, https://github.com/erictli/scratch/releases/latest/download/latest.json, icons/128x128@2x.png, icons/128x128.png, icons/32x32.png, icons/icon.icns, icons/icon.ico, app (+32 more)

### Community 4 - "Editor Icons & Search Toolbar"
Cohesion: 0.06
Nodes (25): SearchToolbar(), SearchToolbarProps, ArrowDownIcon(), ArrowLeftIcon(), ArrowUpIcon(), BoldIcon(), ChevronRightIcon(), CircleCheckIcon() (+17 more)

### Community 5 - "Package Dev Dependencies"
Cohesion: 0.07
Nodes (28): devDependencies, tailwindcss, @tailwindcss/typography, @tailwindcss/vite, @tauri-apps/cli, @types/react, @types/react-dom, typescript (+20 more)

### Community 6 - "Editor Core & Slash Commands"
Cohesion: 0.11
Nodes (25): EditorProps, FormatBarProps, GridPickerProps, katexMacros, SearchHighlightOptions, searchHighlightPluginKey, Frontmatter, SLASH_COMMANDS (+17 more)

### Community 7 - "Git Integration (Rust)"
Cohesion: 0.26
Nodes (24): add_remote(), commit_all(), fetch(), get_remote_url(), get_status(), git_cmd(), git_init(), GitResult (+16 more)

### Community 8 - "TypeScript Config"
Cohesion: 0.09
Nodes (22): DOM, DOM.Iterable, ES2020, src, compilerOptions, allowImportingTsExtensions, isolatedModules, jsx (+14 more)

### Community 9 - "Command Palette & Sidebar Footer"
Cohesion: 0.15
Nodes (18): Command, AddNoteIcon(), DownloadIcon(), FolderPlusIcon(), GitBranchDeletedIcon(), GitBranchIcon(), GitCommitIcon(), MarkdownIcon() (+10 more)

### Community 10 - "Wikilink & Suggestion Lists"
Cohesion: 0.14
Nodes (17): SlashCommandItem, SlashCommandList, SlashCommandListProps, SlashCommandListRef, SuggestionList, SuggestionListInner(), SuggestionListProps, SuggestionListRef (+9 more)

### Community 11 - "Tauri Capability Permissions"
Cohesion: 0.10
Nodes (20): clipboard-manager:allow-write-text, core:default, core:menu:default, core:webview:allow-print, core:window:allow-close, core:window:allow-set-focus, core:window:allow-start-dragging, dialog:allow-open (+12 more)

### Community 12 - "App Shell & AI Edit Features"
Cohesion: 0.19
Nodes (15): App(), getWindowMode(), ViewState, AiEditModal(), AiEditModalProps, AiResponseToast(), AiResponseToastProps, parseInlineMarkdown() (+7 more)

### Community 13 - "Notes Service Layer"
Cohesion: 0.16
Nodes (10): CommandPalette(), Sidebar(), cleanTitle(), createFolder(), createNote(), duplicateNote(), moveFolder(), moveNote() (+2 more)

### Community 14 - "Markdown & PDF Utilities"
Cohesion: 0.14
Nodes (14): blockIndexToPos(), Editor(), focusAndSelectTitle(), formatDateTime(), getMarkdownBlockOffsets(), isAllowedUrlScheme(), normalizeUrl(), SearchHighlight (+6 more)

### Community 15 - "Settings Page & Update Toast"
Cohesion: 0.16
Nodes (12): showUpdateToast(), KeyboardIcon(), RefreshCwIcon(), SpinnerIcon(), SwatchIcon(), FolderPicker(), AboutSettingsSection(), SettingsPage() (+4 more)

### Community 16 - "Keyboard Shortcuts Settings"
Cohesion: 0.15
Nodes (8): settingsCategories, ShortcutsSettingsSection(), KeyboardShortcutsModal(), KeyboardShortcutsModalProps, modalCategories, Shortcut, shortcutCategories, ShortcutCategory

### Community 17 - "Tools Settings (CLI/AI Providers)"
Cohesion: 0.16
Nodes (8): AI_PROVIDER_INFO, CliAction, cliInitialState, cliReducer(), CliState, ToolsSettingsSection(), AI_PROVIDER_ORDER, CliStatus

### Community 20 - "Editor & Utility npm Dependencies"
Cohesion: 0.18
Nodes (11): beautiful-mermaid, clsx, @dnd-kit/utilities, dependencies, beautiful-mermaid, clsx, @dnd-kit/utilities, react-dom (+3 more)

### Community 21 - "Notes Context & Folder Tree State"
Cohesion: 0.20
Nodes (11): AppContent(), FolderTreeView(), loadCollapsedFolders(), saveCollapsedFolders(), NoteList(), IgnoredFoldersEditor(), useNotes(), useNotesActions() (+3 more)

### Community 22 - "Icon Set (Misc UI Icons)"
Cohesion: 0.24
Nodes (8): CloudPlusIcon(), ExternalLinkIcon(), FolderIcon(), FoldersIcon(), formatRemoteUrl(), GeneralSettingsSection(), getRemoteWebUrl(), useGit()

### Community 23 - "Code Block View & Syntax Highlight"
Cohesion: 0.24
Nodes (7): CodeBlockView(), lowlight, SUPPORTED_LANGUAGES, MermaidRenderer(), MermaidRendererProps, EyeIcon(), PencilIcon()

### Community 24 - "Vite Node TypeScript Config"
Cohesion: 0.22
Nodes (8): vite.config.ts, compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 25 - "Block Math & Link Editors"
Cohesion: 0.25
Nodes (7): BlockMathEditor(), BlockMathEditorProps, LinkEditor(), LinkEditorProps, CheckIcon(), LinkOffIcon(), XIcon()

### Community 26 - "Notes Context Definitions"
Cohesion: 0.28
Nodes (8): NotesActionsContext, NotesActionsContextValue, NotesDataContext, NotesDataContextValue, NotesProvider(), useOptionalNotes(), SearchResult, Note

### Community 27 - "App Screenshot Concepts"
Cohesion: 0.43
Nodes (7): Scratch App Screenshot, Interactive Checklist (Task List), Editor Formatting Toolbar, Embedded Mermaid Diagram Rendering, Notes Sidebar UI, "Project Catnip" Sample Note, "Files changed" Version Control Indicator

### Community 29 - "Git Context Provider"
Cohesion: 0.47
Nodes (5): GitContext, GitContextValue, GitProvider(), useNotesData(), GitStatus

### Community 30 - "Project Overview Docs"
Cohesion: 0.40
Nodes (5): Project Overview (Tauri v2 + React/TypeScript/Tailwind + TipTap + Tantivy), index.html App Entry Point (mounts #root, loads /src/main.tsx), Built With (Tauri, React, TipTap, Tailwind CSS, Tantivy), Features List, Serena Project Config (scratch, typescript language server)

### Community 31 - "CLAUDE.md Key Patterns"
Cohesion: 0.50
Nodes (4): Key Patterns Section, NotesContext Dual Context Pattern (data/actions separated for performance), Settings Storage Locations (app config.json + per-folder .scratch/settings.json), Tauri v2 Capabilities Permissions (src-tauri/capabilities/default.json)

### Community 32 - "Release Workflow & Deb Rename"
Cohesion: 0.67
Nodes (4): Releasing Steps, Build and Release Job (macOS/Ubuntu/Windows matrix via tauri-action), Rename Deb Package Job (repacks 'scratch' deb as 'scratch-notes' to avoid Ubuntu name collision, issue #119), Release Workflow

### Community 33 - "Folders-Dark Icon Concepts"
Cohesion: 0.50
Nodes (4): Dark Theme / Dark Mode, Empty-State Illustration (UI Design Pattern), Folders Dark Illustration (Cat holding folder), Scratch (note-taking app)

### Community 34 - "Preview App Mode"
Cohesion: 0.50
Nodes (3): PreviewModeData, PreviewApp(), PreviewAppProps

### Community 35 - "CI Workflow"
Cohesion: 0.67
Nodes (3): CI Description Section, Check Job (build + cargo check/clippy), CI Workflow

### Community 36 - "Note Icon Variants"
Cohesion: 0.67
Nodes (3): Note Dark Illustration (Cat Writing in Notepad), Note Light Illustration (light-mode counterpart), Scratch (App)

## Ambiguous Edges - Review These
- `Notes Sidebar UI` → `"Files changed" Version Control Indicator`  [AMBIGUOUS]
  docs/screenshot.png · relation: conceptually_related_to

## Knowledge Gaps
- **222 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+217 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **43 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Notes Sidebar UI` and `"Files changed" Version Control Indicator`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `dependencies` connect `Editor & Utility npm Dependencies` to `Package Dev Dependencies`, `Community 38`, `Community 39`, `Community 40`, `Community 41`, `Community 42`, `Community 43`, `Community 44`, `Community 45`, `Community 46`, `Community 47`, `Community 48`, `Community 49`, `Community 50`, `Community 51`, `Community 52`, `Community 53`, `Community 54`, `Community 55`, `Community 56`, `Community 57`, `Community 58`, `Community 59`, `Community 60`, `Community 61`, `Community 62`, `Community 63`, `Community 64`, `Community 65`, `Community 66`, `Community 67`, `Community 68`, `Community 69`, `Community 70`, `Community 71`, `Community 72`?**
  _High betweenness centrality (0.015) - this node is a cross-community bridge._
- **Why does `cn()` connect `Folder Tree & Note List UI` to `Resizable Layout & Editor Settings`, `Editor Core & Slash Commands`, `Command Palette & Sidebar Footer`, `Wikilink & Suggestion Lists`, `Markdown & PDF Utilities`?**
  _High betweenness centrality (0.010) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _222 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Rust Backend Core (files, git, index, watcher)` be split into smaller, more focused modules?**
  _Cohesion score 0.06214911848714666 - nodes in this community are weakly interconnected._
- **Should `Folder Tree & Note List UI` be split into smaller, more focused modules?**
  _Cohesion score 0.0642243328810493 - nodes in this community are weakly interconnected._
- **Should `Resizable Layout & Editor Settings` be split into smaller, more focused modules?**
  _Cohesion score 0.06623376623376623 - nodes in this community are weakly interconnected._