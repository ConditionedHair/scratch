<script lang="ts">
  import { gitState } from "../../context/git.svelte";
  import { notesState } from "../../context/notes.svelte";
  import { isMac, mod } from "../../lib/platform";
  import { SettingsIcon } from "../icons";

  interface Props {
    title?: string;
    onopencommandpalette: () => void;
    onopensettings: () => void;
  }

  let { title, onopencommandpalette, onopensettings }: Props = $props();

  let hasChanges = $derived((gitState.status?.changedCount ?? 0) > 0);
  let noteTitle = $derived(title || notesState.currentNote?.title || "All Notes");
</script>

<header
  class={`h-11 px-4 flex items-center justify-between border-b shrink-0 select-none transition-colors bg-bg-secondary border-border z-30 relative ${
    isMac ? "pl-20" : ""
  }`}
  data-tauri-drag-region
>
  <!-- Left: Branding & Note Breadcrumb -->
  <div class="flex items-center gap-2 min-w-0" data-tauri-drag-region>
    <span class="font-bold tracking-tight text-xs uppercase text-text shrink-0">
      SCRATCH
    </span>
    <span class="text-xs text-text-muted/60 shrink-0">/</span>
    <span class="text-xs font-medium text-text-muted truncate max-w-xs md:max-w-md">
      {noteTitle}
    </span>
  </div>

  <!-- Center: Search / Jump Command Pill -->
  <div class="flex items-center gap-2">
    <button
      type="button"
      onclick={onopencommandpalette}
      class="px-3 py-1 rounded-full text-xs flex items-center gap-2 transition-all cursor-pointer bg-bg border border-border text-text-muted hover:text-text hover:border-border/80 shadow-2xs group"
      title={`Search or jump (${mod}+P)`}
    >
      <svg
        class="w-3.5 h-3.5 stroke-[2] text-text-muted/70 group-hover:text-text transition-colors"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
      </svg>
      <span class="text-xs font-normal">Search or jump...</span>
      <kbd class="font-mono text-[10px] px-1.5 py-0.2 rounded bg-bg-muted text-text font-medium border border-border/40">
        {mod}P
      </kbd>
    </button>
  </div>

  <!-- Right: Cloud Sync Status & Settings Button -->
  <div class="flex items-center gap-3 text-xs text-text-muted shrink-0">
    <div class="flex items-center gap-1.5">
      <span
        class={`w-2 h-2 rounded-full shrink-0 shadow-xs ${
          gitState.isSyncing
            ? "bg-amber-400 animate-pulse"
            : hasChanges
              ? "bg-amber-400"
              : "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
        }`}
      ></span>
      <span class="text-[11px] font-medium hidden sm:inline">
        {gitState.isSyncing
          ? "Syncing..."
          : hasChanges
            ? "Uncommitted"
            : "Cloud Synced"}
      </span>
    </div>

    <div class="w-px h-3.5 bg-border"></div>

    <button
      type="button"
      onclick={onopensettings}
      class="w-6 h-6 rounded-md flex items-center justify-center text-text-muted hover:text-text hover:bg-bg-muted transition-colors cursor-pointer"
      title={`Settings (${mod}+,)`}
    >
      <SettingsIcon class="w-4 h-4 stroke-[1.8]" />
    </button>
  </div>
</header>
