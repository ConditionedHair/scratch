<script lang="ts">
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { listen } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import type { Editor as TiptapEditor } from "@tiptap/core";
  import { notesState } from "./context/notes.svelte";
  import { themeState } from "./context/theme.svelte";
  import { Toaster } from "./components/ui";
  import { BraunHeader } from "./components/layout";
  import { BraunLibrary } from "./components/layout";
  import { BraunNoteList } from "./components/notes";
  import Editor from "./components/editor/Editor.svelte";
  import { FolderPicker } from "./components/layout";
  import { CommandPalette } from "./components/command-palette";
  import {
    SpinnerIcon,
    ClaudeIcon,
    CodexIcon,
    OpenCodeIcon,
    OllamaIcon,
  } from "./components/icons";
  import { AiResponseToast } from "./components/ai";
  import { PreviewApp } from "./components/preview";
  import { SidebarResizeHandle } from "./components/layout";
  import { SettingsPage } from "./components/settings";
  import { CalendarPage } from "./components/calendar";
  import { AiEditModal } from "./components/ai";
  import { KeyboardShortcutsModal } from "./components/shortcuts";
  import { showUpdateToast } from "./services/updater";
  import * as aiService from "./services/ai";
  import type { AiProvider } from "./services/ai";
  import { isMac, isWindows } from "./lib/platform";
  import {
    viewFadeIn,
    viewFadeOut,
    backdropIn,
    backdropOut,
  } from "./lib/motion";

  // Detect preview mode from URL search params
  function getWindowMode(): {
    isPreview: boolean;
    previewFile: string | null;
  } {
    if (typeof window === "undefined") {
      return { isPreview: false, previewFile: null };
    }
    const params = new URLSearchParams(window.location.search);
    const mode = params.get("mode");
    const file = params.get("file");
    return {
      isPreview: mode === "preview" && !!file,
      previewFile: file,
    };
  }

  const windowMode = getWindowMode();
  const isPreview = windowMode.isPreview;
  const previewFile = windowMode.previewFile;

  type ViewState = "notes" | "settings" | "calendar";

  let paletteOpen = $state(false);
  let view = $state<ViewState>("notes");
  let sidebarVisible = $state(true);
  let aiModalOpen = $state(false);
  let shortcutsOpen = $state(false);
  let aiEditing = $state(false);
  let focusMode = $state(false);
  let aiProvider = $state<AiProvider>("claude");
  let editorInstance = $state<TiptapEditor | null>(null);

  function toggleSidebar() {
    sidebarVisible = !sidebarVisible;
  }

  function toggleFocusMode() {
    if (!focusMode && !notesState.selectedNoteId) return;
    if (focusMode) {
      sidebarVisible = true;
    }
    focusMode = !focusMode;
  }

  function toggleSettings() {
    view = view === "settings" ? "notes" : "settings";
  }

  function closeSettings() {
    view = "notes";
  }

  function openCalendar() {
    view = "calendar";
  }

  function closeCalendar() {
    view = "notes";
  }

  function toggleCalendar() {
    view = view === "calendar" ? "notes" : "calendar";
  }

  function handleBackToPalette() {
    aiModalOpen = false;
    paletteOpen = true;
  }

  function handleClosePalette() {
    paletteOpen = false;
    editorInstance?.commands.focus();
  }

  // AI Edit handler
  async function handleAiEdit(prompt: string, ollamaModel?: string) {
    if (!notesState.currentNote) {
      toast.error("No note selected");
      return;
    }

    aiEditing = true;

    try {
      let result: aiService.AiExecutionResult;
      if (aiProvider === "codex") {
        result = await aiService.executeCodexEdit(notesState.currentNote.path, prompt);
      } else if (aiProvider === "opencode") {
        result = await aiService.executeOpenCodeEdit(notesState.currentNote.path, prompt);
      } else if (aiProvider === "ollama") {
        result = await aiService.executeOllamaEdit(
          notesState.currentNote.path,
          prompt,
          ollamaModel || "qwen3:8b",
        );
      } else {
        result = await aiService.executeClaudeEdit(notesState.currentNote.path, prompt);
      }

      await notesState.reloadCurrentNote();

      if (result.success) {
        aiModalOpen = false;
        toast.custom(AiResponseToast, {
          componentProps: {
            output: result.output,
            provider: aiProvider,
          },
          duration: Infinity,
          closeButton: true,
          class: "!min-w-[450px] !max-w-[600px]",
        });
      } else {
        toast.error(`AI Edit Failed: ${result.error || "Unknown error"}`, {
          duration: Infinity,
          closeButton: true,
        });
      }
    } catch (error) {
      console.error("[AI] Error:", error);
      toast.error(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      aiEditing = false;
    }
  }

  let displayItems = $derived(
    notesState.searchQuery.trim() ? notesState.searchResults : notesState.notes
  );

  onMount(() => {
    // Add platform class for OS-specific styling
    const os = isMac ? "mac" : isWindows ? "windows" : "linux";
    document.documentElement.classList.add(`platform-${os}`);

    // Cmd/Ctrl+W — close window (works in both preview and folder mode)
    const handleWindowCloseKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "w") {
        e.preventDefault();
        getCurrentWindow().close().catch(console.error);
      }
    };
    window.addEventListener("keydown", handleWindowCloseKey);

    if (isPreview) {
      return () => {
        window.removeEventListener("keydown", handleWindowCloseKey);
      };
    }

    // Check for app updates on startup (folder mode only)
    const updateTimer = setTimeout(() => {
      showUpdateToast();
    }, 3000);

    // Listen for set-notes-folder event from CLI (scratch .)
    let unlistenFolder: (() => void) | undefined;
    listen<string>("set-notes-folder", async (event) => {
      await notesState.syncNotesFolder(event.payload);
      await themeState.reloadSettings();
    }).then((unlisten) => {
      unlistenFolder = unlisten;
    });

    // Global keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInEditor = !!target.closest(".ProseMirror");
      const isInInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const isEditorEmpty =
        isInEditor && (notesState.currentNote?.content.trim() ?? "") === "";

      // Cmd+, - Toggle settings (always works, even in settings)
      if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        toggleSettings();
        return;
      }

      // Cmd+= or Cmd++ - Zoom in
      if ((e.metaKey || e.ctrlKey) && (e.key === "=" || e.key === "+")) {
        e.preventDefault();
        themeState.interfaceZoom += 0.05;
        const newZoom = Math.round(Math.min(themeState.interfaceZoom, 1.5) * 20) / 20;
        toast(`Zoom ${Math.round(newZoom * 100)}%`, { id: "zoom", duration: 1500 });
        return;
      }

      // Cmd+- - Zoom out
      if ((e.metaKey || e.ctrlKey) && (e.key === "-" || e.key === "_")) {
        e.preventDefault();
        themeState.interfaceZoom -= 0.05;
        const newZoom = Math.round(Math.max(themeState.interfaceZoom, 0.7) * 20) / 20;
        toast(`Zoom ${Math.round(newZoom * 100)}%`, { id: "zoom", duration: 1500 });
        return;
      }

      // Cmd+0 - Reset zoom
      if ((e.metaKey || e.ctrlKey) && e.key === "0") {
        e.preventDefault();
        themeState.interfaceZoom = 1.0;
        toast("Zoom 100%", { id: "zoom", duration: 1500 });
        return;
      }

      // Cmd/Ctrl+Shift+C - Toggle calendar view
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "c"
      ) {
        e.preventDefault();
        toggleCalendar();
        return;
      }

      // Block all other shortcuts when in settings or calendar view
      if (view === "settings") {
        return;
      }

      if (view === "calendar") {
        if (e.key === "Escape") {
          e.preventDefault();
          closeCalendar();
        }
        return;
      }

      // Cmd+Shift+Enter - Toggle focus mode
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        toggleFocusMode();
        return;
      }

      // Cmd+Shift+M - Toggle markdown source mode
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "m"
      ) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-source-mode"));
        return;
      }

      // Escape exits focus mode when not in editor
      if (e.key === "Escape" && focusMode && !isInEditor) {
        e.preventDefault();
        toggleFocusMode();
        return;
      }

      // Let dialogs handle their own keyboard events
      if (target.closest("[role='dialog'], [role='alertdialog']")) {
        return;
      }

      // Trap Tab/Shift+Tab in notes view only
      if (e.key === "Tab") {
        e.preventDefault();
        return;
      }

      // Cmd+P - Open command palette
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "p") {
        e.preventDefault();
        paletteOpen = true;
        return;
      }

      // Cmd+Shift+P - Print
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("print-note"));
        return;
      }

      // Cmd+/ - Open keyboard shortcuts
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        shortcutsOpen = true;
        return;
      }

      // Cmd/Ctrl+Shift+F - Open sidebar search
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        e.key.toLowerCase() === "f"
      ) {
        e.preventDefault();
        sidebarVisible = true;
        window.dispatchEvent(new CustomEvent("open-sidebar-search"));
        return;
      }

      // Cmd+\ - Toggle sidebar
      if ((e.metaKey || e.ctrlKey) && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
        return;
      }

      // Cmd+N - New note
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        notesState.createNote();
        return;
      }

      // Delete current note (note list focused, or editor on empty note)
      if (
        notesState.selectedNoteId &&
        !isInInput &&
        (e.key === "Delete" ||
          (e.key === "Backspace" && (e.metaKey || e.ctrlKey))) &&
        (!isInEditor || isEditorEmpty)
      ) {
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent("request-delete-note", { detail: notesState.selectedNoteId })
        );
        return;
      }

      // Cmd+D - Duplicate current note
      if (
        (e.metaKey || e.ctrlKey) &&
        e.key.toLowerCase() === "d" &&
        !isInEditor &&
        !isInInput &&
        notesState.selectedNoteId
      ) {
        e.preventDefault();
        notesState.duplicateNote(notesState.selectedNoteId);
        return;
      }

      // Cmd+R - Reload current note
      if ((e.metaKey || e.ctrlKey) && e.key === "r") {
        e.preventDefault();
        notesState.reloadCurrentNote();
        return;
      }

      // Arrow keys for note navigation
      const isInFolderTree = !!(e.target as HTMLElement).closest("[data-folder-tree]");
      if (
        displayItems.length > 0 &&
        (e.key === "ArrowDown" || e.key === "ArrowUp") &&
        ((!isInEditor && !isInInput) || isEditorEmpty) &&
        !isInFolderTree
      ) {
        e.preventDefault();
        const currentIndex = displayItems.findIndex(
          (n) => n.id === notesState.selectedNoteId
        );
        let newIndex: number;

        if (e.key === "ArrowDown") {
          newIndex =
            currentIndex < displayItems.length - 1 ? currentIndex + 1 : 0;
        } else {
          newIndex =
            currentIndex > 0 ? currentIndex - 1 : displayItems.length - 1;
        }

        notesState.selectNote(displayItems[newIndex].id);
        window.dispatchEvent(new CustomEvent("focus-note-list"));
        return;
      }

      // Enter to focus editor
      if (e.key === "Enter" && notesState.selectedNoteId && !isInEditor && !isInInput) {
        e.preventDefault();
        const editor = document.querySelector(".ProseMirror") as HTMLElement;
        if (editor) {
          editor.focus();
        }
        return;
      }

      // Escape to blur editor and go back to note list
      if (e.key === "Escape" && isInEditor) {
        e.preventDefault();
        (target as HTMLElement).blur();
        window.dispatchEvent(new CustomEvent("focus-note-list"));
        return;
      }
    };

    // Disable right-click context menu except in editor, inputs, and note list
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isInEditor =
        target.closest(".prose") || target.closest(".ProseMirror");
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";
      const isInNoteList = target.closest("[data-note-list]");
      if (!isInEditor && !isInput && !isInNoteList) {
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("contextmenu", handleContextMenu);

    return () => {
      clearTimeout(updateTimer);
      unlistenFolder?.();
      window.removeEventListener("keydown", handleWindowCloseKey);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("contextmenu", handleContextMenu);
    };
  });
</script>

<Toaster />

{#if isPreview && previewFile}
  <PreviewApp filePath={decodeURIComponent(previewFile)} />
{:else if notesState.isLoading}
  <div class="h-full min-h-0 flex items-center justify-center bg-bg-secondary">
    <div class="text-text-muted/70 text-sm flex items-center gap-1.5 font-medium">
      <SpinnerIcon class="w-4.5 h-4.5 stroke-[1.5] animate-spin" />
      Initializing Scratch...
    </div>
  </div>
{:else if !notesState.notesFolder}
  <FolderPicker />
{:else}
  <div class="h-full min-h-0 flex flex-col bg-bg text-text overflow-hidden">
    <!-- Braun System Header Bar -->
    {#if !focusMode && view === "notes"}
      <BraunHeader
        onopencommandpalette={() => { paletteOpen = true; }}
        onopensettings={toggleSettings}
      />
    {/if}

    <div class="flex-1 min-h-0 relative overflow-hidden">
      {#if view === "settings"}
        <div
          in:viewFadeIn
          out:viewFadeOut
          class="absolute inset-0 z-10 bg-bg overflow-y-auto"
        >
          <SettingsPage onBack={closeSettings} />
        </div>
      {/if}

      {#if view === "calendar"}
        <div
          in:viewFadeIn
          out:viewFadeOut
          class="absolute inset-0 z-10 bg-bg overflow-hidden"
        >
          <CalendarPage onBack={closeCalendar} />
        </div>
      {/if}

      <div
        class="h-full w-full flex overflow-hidden transition-opacity duration-200"
        class:opacity-0={view === "settings" || view === "calendar"}
        class:pointer-events-none={view === "settings" || view === "calendar"}
      >
        <!-- Column 1: Library (Folders, Pinned, Tags, New Note) -->
        <div
          data-sidebar
          class={`w-48 shrink-0 border-r border-border bg-bg-secondary flex flex-col overflow-hidden ${
            !sidebarVisible || focusMode
              ? "!w-0 opacity-0 pointer-events-none border-r-0"
              : "opacity-100"
          }`}
        >
          <BraunLibrary
            onOpenSettings={toggleSettings}
            onOpenCalendar={openCalendar}
          />
        </div>

        <!-- Column 2: Note Cards List -->
        <div
          data-note-list
          style:width={!sidebarVisible || focusMode ? "0px" : "var(--sidebar-width, 16rem)"}
          class={`shrink-0 border-r border-border bg-bg flex flex-col overflow-hidden relative ${
            !sidebarVisible || focusMode
              ? "!w-0 opacity-0 pointer-events-none border-r-0"
              : "opacity-100"
          }`}
        >
          <BraunNoteList />
          <SidebarResizeHandle />
        </div>

        <!-- Column 3: Main Editor Canvas -->
        <Editor
          onToggleSidebar={toggleSidebar}
          sidebarVisible={sidebarVisible}
          {focusMode}
          onToggleFocusMode={toggleFocusMode}
          onOpenCalendar={openCalendar}
          onOpenSettings={toggleSettings}
          onEditorReady={(editor) => {
            editorInstance = editor;
          }}
        />
      </div>
    </div>
  </div>

  <!-- Shared backdrop for command palette and AI modal -->
  {#if paletteOpen || aiModalOpen}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      in:backdropIn
      out:backdropOut
      class="fixed inset-0 bg-text/50 backdrop-blur-sm z-40"
      onclick={() => {
        if (paletteOpen) handleClosePalette();
        if (aiModalOpen) aiModalOpen = false;
      }}
    ></div>
  {/if}

  {#if shortcutsOpen}
    <KeyboardShortcutsModal
      open={shortcutsOpen}
      onclose={() => { shortcutsOpen = false; }}
    />
  {/if}

  <CommandPalette
    open={paletteOpen}
    onclose={handleClosePalette}
    onopensettings={toggleSettings}
    onopenshortcuts={() => { shortcutsOpen = true; }}
    onopencalendar={openCalendar}
    onopenaimodal={(provider) => {
      aiProvider = provider;
      aiModalOpen = true;
    }}
    {focusMode}
    ontogglefocusmode={toggleFocusMode}
    editor={editorInstance}
  />

  {#if aiModalOpen}
    <AiEditModal
      open={aiModalOpen}
      provider={aiProvider}
      onback={handleBackToPalette}
      onexecute={handleAiEdit}
      isExecuting={aiEditing}
    />
  {/if}

  <!-- AI Editing Overlay -->
  {#if aiEditing}
    <div class="fixed inset-0 bg-bg/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div class="flex items-center gap-2">
        {#if aiProvider === "codex"}
          <CodexIcon class="w-4.5 h-4.5 fill-text-muted animate-spin-slow" />
        {:else if aiProvider === "opencode"}
          <OpenCodeIcon class="w-4.5 h-4.5 fill-text-muted animate-pulse-gentle" />
        {:else if aiProvider === "ollama"}
          <OllamaIcon class="w-4.5 h-4.5 fill-text-muted animate-bounce-gentle" />
        {:else}
          <ClaudeIcon class="w-4.5 h-4.5 fill-text-muted animate-spin-slow" />
        {/if}
        <div class="text-sm font-medium text-text">
          {aiProvider === "codex"
            ? "Codex is editing your note..."
            : aiProvider === "opencode"
              ? "OpenCode is editing your note..."
            : aiProvider === "ollama"
              ? "Ollama is editing your note..."
              : "Claude is editing your note..."}
        </div>
      </div>
    </div>
  {/if}
{/if}
