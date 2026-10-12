<script lang="ts">
  import { onMount } from "svelte";
  import { listen } from "@tauri-apps/api/event";
  import { getCurrentWindow } from "@tauri-apps/api/window";
  import { toast } from "svelte-sonner";
  import Editor from "../editor/Editor.svelte";
  import type { PreviewModeData } from "../editor/Editor.svelte";
  import * as filesService from "../../services/files";

  interface Props {
    filePath: string;
  }

  let { filePath }: Props = $props();

  let content = $state<string | null>(null);
  let title = $state("");
  let modified = $state(0);
  let hasExternalChanges = $state(false);
  let reloadVersion = $state(0);
  let focusMode = $state(false);
  let isSaving = $state(false);
  let recentlySaved = false;
  let savingInProgress = false;

  onMount(() => {
    // Load file on mount
    filesService
      .readFileDirect(filePath)
      .then((result) => {
        content = result.content;
        title = result.title;
        modified = result.modified;
      })
      .catch((error) => {
        console.error("Failed to load file:", error);
        toast.error(`Failed to load file: ${error}`);
      });

    // Listen for window focus to detect external changes
    const handleFocus = async () => {
      if (recentlySaved) {
        recentlySaved = false;
        return;
      }
      try {
        const result = await filesService.readFileDirect(filePath);
        if (result.modified !== modified && content !== null) {
          hasExternalChanges = true;
        }
      } catch {
        // File may have been deleted
      }
    };

    window.addEventListener("focus", handleFocus);

    // Listen for preview-file-change events
    let unlistenPreview: (() => void) | undefined;
    listen<string>("preview-file-change", () => {
      hasExternalChanges = true;
    }).then((unlisten) => {
      unlistenPreview = unlisten;
    });

    // Keyboard shortcuts for preview mode
    const handleKeyDown = (e: KeyboardEvent) => {
      const modKey = e.metaKey || e.ctrlKey;

      // Cmd+Shift+Enter: Toggle focus mode
      if (modKey && e.shiftKey && e.key === "Enter") {
        e.preventDefault();
        focusMode = !focusMode;
        return;
      }

      // Cmd+Shift+M: Toggle markdown source mode
      if (modKey && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("toggle-source-mode"));
        return;
      }

      // Cmd+Shift+P: Print
      if (modKey && e.shiftKey && e.key.toLowerCase() === "p") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("print-note"));
        return;
      }

      // Cmd+P: Block browser print dialog
      if (modKey && !e.shiftKey && e.key === "p") {
        e.preventDefault();
        return;
      }

      // Cmd+R: Reload file from disk
      if (modKey && e.key === "r") {
        e.preventDefault();
        reload();
        return;
      }

      // Escape: Exit focus mode
      if (e.key === "Escape" && focusMode) {
        e.preventDefault();
        focusMode = false;
        return;
      }

      // Trap Tab to prevent focus leaving editor (only when editor is focused)
      if (e.key === "Tab") {
        const active = document.activeElement;
        const editorEl = document.querySelector(".ProseMirror");
        if (editorEl && editorEl.contains(active)) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("keydown", handleKeyDown);
      unlistenPreview?.();
    };
  });

  async function save(newContent: string) {
    try {
      const result = await filesService.saveFileDirect(filePath, newContent);
      recentlySaved = true;
      modified = result.modified;
      title = result.title;
      hasExternalChanges = false;
    } catch (error) {
      console.error("Failed to save file:", error);
      toast.error(`Failed to save: ${error}`);
    }
  }

  async function reload() {
    try {
      const result = await filesService.readFileDirect(filePath);
      content = result.content;
      title = result.title;
      modified = result.modified;
      hasExternalChanges = false;
      reloadVersion += 1;
    } catch (error) {
      console.error("Failed to reload file:", error);
      toast.error(`Failed to reload: ${error}`);
    }
  }

  async function handleSaveToFolder() {
    if (savingInProgress) return;
    savingInProgress = true;
    isSaving = true;
    try {
      await filesService.importFileToFolder(filePath);
      // Backend emits select-note + focuses main window; close this preview
      await getCurrentWindow().close();
    } catch (error) {
      console.error("Failed to save to folder:", error);
      toast.error(`Failed to save to folder: ${error}`);
    } finally {
      savingInProgress = false;
      isSaving = false;
    }
  }

  let previewData = $derived<PreviewModeData>({
    content,
    title,
    filePath,
    modified,
    hasExternalChanges,
    reloadVersion,
    save,
    reload,
  });
</script>

<div class="h-full min-h-0 flex flex-col bg-bg text-text">
  <Editor
    {focusMode}
    previewMode={previewData}
    onSaveToFolder={handleSaveToFolder}
    saveToFolderDisabled={isSaving}
  />
</div>
