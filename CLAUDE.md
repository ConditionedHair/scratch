# Scratch - Development Guide

## Project Overview

Scratch is a cross-platform, offline-first markdown note-taking app for macOS, Windows, and Linux, built with Tauri v2 (Rust backend) + React 19/TypeScript/Tailwind CSS (frontend) + TipTap (WYSIWYG / ProseMirror editor) + Tantivy (embedded full-text search). The UI is designed according to the Braun / Dieter Rams minimalist field instrument aesthetic.

For an in-depth reference on architecture, subsystems, and invariants, see [AGENTS.md](./AGENTS.md).

## Commands

```bash
npm run dev          # Start Vite dev server only
npm run build        # Build frontend (tsc + vite)
npm run tauri dev    # Run full app in development mode
npm run tauri build  # Build production app
cargo check --manifest-path src-tauri/Cargo.toml  # Validate Rust compilation
```

## CI

Runs on every push to `main` and on PRs. Validates frontend build (`tsc` + Vite) and Rust compilation (`cargo check` + `cargo clippy`) on an Ubuntu runner.

## Key Patterns & Architectural Rules

- **Tauri IPC**: All backend operations go through Tauri commands in `src-tauri/src/lib.rs`. The frontend calls them via `invoke()` from `@tauri-apps/api/core`.
- **Dual NotesContext**: `NotesContext.tsx` uses a split context pattern (`NotesStateContext` and `NotesActionsContext`) to prevent unnecessary re-renders when note content updates.
- **Frontmatter & Tags**:
  - Tags are serialized in Markdown files as flow YAML frontmatter (`--- \n tags: [...] \n ---`).
  - In TipTap, `Frontmatter.ts` is an atomic, unselectable node (`atom: true`, `selectable: false`, `draggable: false`).
  - `.prose pre.frontmatter` is styled `display: none !important` to hide frontmatter from the WYSIWYG editor canvas without cursor or selection issues.
  - In raw Source Mode (`Cmd+Shift+M`), frontmatter is visible and directly editable in the textarea.
  - Tags are visually managed in `TagBar.tsx` with drag-to-reorder, color swatch palette, and autocomplete.
- **Floating Toolbar**: `FloatingFormatBar` groups Headings (H1/H2/H3) and Lists into compact dropdowns. When editor width is < 700px, secondary tools collapse into an overflow `...` menu.
- **Keyboard Shortcuts**:
  - `Cmd+P` (`Ctrl+P`): Global Command Palette ("Search or jump...").
  - `Cmd+K` (`Ctrl+K`): Insert / edit hyperlink.
  - `Cmd+Shift+M`: Toggle raw Markdown source mode.
  - `Cmd+Shift+Enter`: Toggle focus mode.
- **Settings Storage**: App config lives at `{APP_DATA}/config.json`; per-folder settings live at `{NOTES_FOLDER}/.scratch/settings.json`.
- **Permissions**: Tauri v2 permissions go in `src-tauri/capabilities/default.json`.
- **iCloud Drive Sync**: macOS only (`src-tauri/src/icloud.rs`). Filesystem-level folder sync with on-demand materialization of `.icloud` placeholders via `brctl download`.

## Coding Conventions

- Clean, minimal code with low technical debt
- Proper React patterns (contexts, hooks, memoization)
- Type-safe with TypeScript throughout (no `any`)
- No commented-out code or TODOs in production code
- Use `React.memo` for expensive list-item components
- Use `useCallback`/`useMemo` for performance-critical paths
- Debounce user-triggered operations (auto-save 300ms, search 150ms, file watcher 500ms, git status 1000ms)
- All operations should be non-blocking (async)
- Error handling with user-friendly messages

## Releasing

1. Bump version in `package.json` and `src-tauri/tauri.conf.json`
2. Commit to `main`, then tag and push: `git tag v1.0.0 && git push origin v1.0.0`
3. The release workflow builds all platforms and creates a draft GitHub release
4. Update the description in `latest.json` from GitHub after the action finishes
5. Review, edit notes, and publish
