<script lang="ts">
  import type { Component } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { toast } from "svelte-sonner";
  import type { Editor as TiptapEditor } from "@tiptap/core";
  import { notesState } from "../../context/notes.svelte";
  import { themeState } from "../../context/theme.svelte";
  import { gitState } from "../../context/git.svelte";
  import * as notesService from "../../services/notes";
  import * as aiService from "../../services/ai";
  import { downloadPdf, downloadMarkdown } from "../../services/pdf";
  import type { Settings } from "../../types/note";
  import { cleanSerializedMarkdown } from "../../lib/markdownSpacing";
  import { modalIn, modalOut, backdropIn, backdropOut } from "../../lib/motion";
  import {
    CommandItem,
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from "../ui";
  import { cleanTitle } from "../../lib/utils";
  import { plainTextFromMarkdown } from "../../lib/plainText";
  import {
    CopyIcon,
    DownloadIcon,
    SettingsIcon,
    SwatchIcon,
    GitCommitIcon,
    RefreshCwIcon,
    AddNoteIcon,
    TrashIcon,
    PinIcon,
    ClaudeIcon,
    ZenIcon,
    MarkdownIcon,
    CodexIcon,
    OpenCodeIcon,
    OllamaIcon,
    FolderIcon,
    FolderPlusIcon,
    KeyboardIcon,
    PlusIcon,
    XIcon,
    CalendarIcon,
    MailIcon,
  } from "../icons";
  import { mod, shift } from "../../lib/platform";
  import type { AiProvider } from "../../services/ai";

  interface Command {
    id: string;
    label: string;
    shortcut?: string;
    icon?: Component<any>;
    action: () => void;
  }

  interface Props {
    open: boolean;
    onclose: () => void;
    onopensettings?: () => void;
    onopenshortcuts?: () => void;
    onopenaimodal?: (provider: AiProvider) => void;
    onopencalendar?: () => void;
    onopenmail?: () => void;
    focusMode?: boolean;
    ontogglefocusmode?: () => void;
    editor?: TiptapEditor | null;
  }

  let {
    open,
    onclose,
    onopensettings,
    onopenshortcuts,
    onopenaimodal,
    onopencalendar,
    onopenmail,
    focusMode = false,
    ontogglefocusmode,
    editor,
  }: Props = $props();

  let query = $state("");
  let selectedIndex = $state(0);
  let deleteDialogOpen = $state(false);
  let noteToDelete = $state<string | null>(null);
  let localSearchResults = $state<
    { id: string; title: string; preview: string; modified: number }[]
  >([]);
  let settings = $state<Settings | null>(null);
  let availableAiProviders = $state<AiProvider[]>([]);
  let inputEl: HTMLInputElement | null = $state(null);
  let listEl: HTMLDivElement | null = $state(null);

  // Load settings when opened
  $effect(() => {
    if (open) {
      notesService.getSettings().then((s) => (settings = s));
    }
  });

  // Load AI providers when opened
  $effect(() => {
    if (!open || !notesState.currentNote) {
      availableAiProviders = [];
      return;
    }

    let active = true;
    aiService
      .getAvailableAiProviders()
      .then((providers) => {
        if (active) {
          availableAiProviders = providers;
        }
      })
      .catch((error) => {
        if (active) {
          console.error("Failed to discover AI providers:", error);
          availableAiProviders = [];
        }
      });

    return () => {
      active = false;
    };
  });

  // Tantivy search debounced
  $effect(() => {
    if (!open) {
      localSearchResults = [];
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      localSearchResults = [];
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const results = await invoke<
          {
            id: string;
            title: string;
            preview: string;
            modified: number;
            score: number;
          }[]
        >("search_notes", { query: trimmed });
        localSearchResults = results;
      } catch (err) {
        console.error("Search failed:", err);
      }
    }, 150);

    return () => clearTimeout(timer);
  });

  // Base and dynamic commands
  let commands = $derived.by<Command[]>(() => {
    const currentNote = notesState.currentNote;
    const baseCommands: Command[] = [
      {
        id: "new-note",
        label: "New Note",
        shortcut: `${mod} N`,
        icon: AddNoteIcon,
        action: () => {
          notesState.createNote();
          onclose();
        },
      },
      {
        id: "new-folder",
        label: "New Folder",
        shortcut: undefined,
        icon: FolderPlusIcon,
        action: () => {
          onclose();
          window.dispatchEvent(new CustomEvent("create-new-folder"));
        },
      },
      {
        id: "open-calendar",
        label: "Open Calendar",
        shortcut: `${mod} 2`,
        icon: CalendarIcon,
        action: () => {
          onopencalendar?.();
          onclose();
        },
      },
      {
        id: "open-mail",
        label: "Open Mail",
        shortcut: `${mod} 3`,
        icon: MailIcon,
        action: () => {
          onopenmail?.();
          onclose();
        },
      },
    ];

    if (currentNote) {
      const isPinned =
        settings?.pinnedNoteIds?.includes(currentNote.id) || false;
      const aiCommands: Command[] = onopenaimodal
        ? availableAiProviders.map((provider) => {
            const action = () => {
              onopenaimodal(provider);
              onclose();
            };

            if (provider === "codex") {
              return {
                id: "ai-edit-codex",
                label: "Edit with OpenAI Codex",
                icon: CodexIcon,
                action,
              };
            }

            if (provider === "opencode") {
              return {
                id: "ai-edit-opencode",
                label: "Edit with OpenCode",
                icon: OpenCodeIcon,
                action,
              };
            }

            if (provider === "ollama") {
              return {
                id: "ai-edit-ollama",
                label: "Edit with Ollama",
                icon: OllamaIcon,
                action,
              };
            }

            return {
              id: "ai-edit-claude",
              label: "Edit with Claude Code",
              icon: ClaudeIcon,
              action,
            };
          })
        : [];

      baseCommands.push(
        {
          id: isPinned ? "unpin-note" : "pin-note",
          label: isPinned ? "Unpin Current Note" : "Pin Current Note",
          icon: PinIcon,
          action: async () => {
            try {
              if (isPinned) {
                await notesState.unpinNote(currentNote.id);
              } else {
                await notesState.pinNote(currentNote.id);
              }
              onclose();
            } catch (error) {
              console.error("Failed to pin/unpin note:", error);
              toast.error(`Failed to ${isPinned ? "unpin" : "pin"} note`);
            }
          },
        },
        {
          id: "add-tag",
          label: "Add Tag to Current Note",
          icon: PlusIcon,
          action: () => {
            window.dispatchEvent(new CustomEvent("focus-tag-input"));
            onclose();
          },
        },
        ...(currentNote.tags && currentNote.tags.length > 0
          ? [
              {
                id: "remove-tag",
                label: "Remove Tag from Current Note",
                icon: XIcon,
                action: () => {
                  if (currentNote.tags.length === 1) {
                    notesService
                      .setNoteTags(currentNote.id, [])
                      .then(() => notesState.reloadCurrentNote())
                      .catch((error) => {
                        console.error("Failed to remove tag:", error);
                        toast.error("Failed to remove tag");
                      });
                  } else {
                    window.dispatchEvent(new CustomEvent("focus-tag-input"));
                  }
                  onclose();
                },
              },
            ]
          : []),
        ...aiCommands,
        {
          id: "duplicate-note",
          label: "Duplicate Current Note",
          icon: CopyIcon,
          action: async () => {
            try {
              const newNote = await notesService.duplicateNote(currentNote.id);
              await notesState.refreshNotes();
              notesState.selectNote(newNote.id);
              onclose();
            } catch (error) {
              console.error("Failed to duplicate note:", error);
            }
          },
        },
        {
          id: "delete-note",
          label: "Delete Current Note",
          icon: TrashIcon,
          action: () => {
            noteToDelete = currentNote.id;
            deleteDialogOpen = true;
          },
        },
        {
          id: "copy-markdown",
          label: "Copy Markdown",
          icon: CopyIcon,
          action: async () => {
            try {
              await invoke("copy_to_clipboard", { text: currentNote.content });
              toast.success("Copied as Markdown");
              onclose();
            } catch (error) {
              console.error("Failed to copy markdown:", error);
              toast.error("Failed to copy");
            }
          },
        },
        {
          id: "copy-plain",
          label: "Copy Plain Text",
          icon: CopyIcon,
          action: async () => {
            try {
              const plainText = plainTextFromMarkdown(currentNote.content);
              await invoke("copy_to_clipboard", { text: plainText });
              toast.success("Copied as plain text");
              onclose();
            } catch (error) {
              console.error("Failed to copy plain text:", error);
              toast.error("Failed to copy");
            }
          },
        },
        {
          id: "copy-html",
          label: "Copy HTML",
          icon: CopyIcon,
          action: async () => {
            try {
              if (!editor) {
                toast.error("Editor not available");
                return;
              }
              const html = editor.getHTML();
              await invoke("copy_to_clipboard", { text: html });
              toast.success("Copied as HTML");
              onclose();
            } catch (error) {
              console.error("Failed to copy HTML:", error);
              toast.error("Failed to copy");
            }
          },
        },
        {
          id: "download-pdf",
          label: "Print as PDF",
          icon: DownloadIcon,
          action: async () => {
            try {
              if (!editor || !currentNote) {
                toast.error("Editor not available");
                return;
              }
              await downloadPdf(editor, currentNote.title);
              onclose();
            } catch (error) {
              console.error("Failed to open print dialog:", error);
              toast.error("Failed to open print dialog");
            }
          },
        },
        {
          id: "download-markdown",
          label: "Export Markdown",
          icon: DownloadIcon,
          action: async () => {
            try {
              if (!currentNote) {
                toast.error("No note selected");
                return;
              }
              let markdown = currentNote.content;
              if (editor) {
                const manager = editor.storage.markdown?.manager;
                if (manager) {
                  markdown = cleanSerializedMarkdown(
                    manager.serialize(editor.getJSON())
                  );
                } else {
                  markdown = editor.getText();
                }
              }
              const saved = await downloadMarkdown(markdown, currentNote.title);
              if (saved) {
                toast.success("Markdown saved successfully");
                onclose();
              }
            } catch (error) {
              console.error("Failed to download markdown:", error);
              toast.error("Failed to save markdown");
            }
          },
        }
      );
    }

    if (gitState.gitEnabled && gitState.gitAvailable && gitState.status?.isRepo) {
      const hasChanges = (gitState.status?.changedCount ?? 0) > 0;
      const canSync =
        gitState.status?.hasRemote &&
        gitState.status?.hasUpstream &&
        !gitState.isSyncing;

      if (hasChanges) {
        baseCommands.push({
          id: "git-commit",
          label: "Git: Quick Commit",
          icon: GitCommitIcon,
          action: async () => {
            const success = await gitState.commit("Quick commit from Scratch");
            if (success) {
              toast.success("Changes committed");
            } else {
              toast.error("Failed to commit");
            }
            onclose();
          },
        });
      }

      if (canSync) {
        baseCommands.push({
          id: "git-sync",
          label: "Git: Sync (Pull and Push)",
          icon: RefreshCwIcon,
          action: async () => {
            const result = await gitState.sync();
            if (result.ok) {
              toast.success(result.message || "Changes committed");
            } else {
              toast.error(result.error || "Failed to commit");
            }
            onclose();
          },
        });
      }
    }

    baseCommands.push(
      {
        id: "focus-mode",
        label: focusMode ? "Exit Focus Mode" : "Enter Focus Mode",
        shortcut: `${mod} ${shift} Enter`,
        icon: ZenIcon,
        action: () => {
          ontogglefocusmode?.();
          onclose();
        },
      },
      {
        id: "toggle-source",
        label: "Toggle Markdown Source",
        shortcut: `${mod} ${shift} M`,
        icon: MarkdownIcon,
        action: () => {
          window.dispatchEvent(new CustomEvent("toggle-source-mode"));
          onclose();
        },
      }
    );

    if (notesState.notesFolder) {
      baseCommands.push({
        id: "open-folder",
        label: "Open Notes Folder",
        icon: FolderIcon,
        action: async () => {
          try {
            await invoke("open_in_file_manager", { path: notesState.notesFolder });
            onclose();
          } catch (error) {
            console.error("Failed to open folder:", error);
            toast.error("Failed to open folder");
          }
        },
      });
    }

    baseCommands.push(
      {
        id: "keyboard-shortcuts",
        label: "Keyboard Shortcuts",
        shortcut: `${mod} /`,
        icon: KeyboardIcon,
        action: () => {
          onopenshortcuts?.();
          onclose();
        },
      },
      {
        id: "settings",
        label: "Settings",
        shortcut: `${mod} ,`,
        icon: SettingsIcon,
        action: () => {
          onopensettings?.();
          onclose();
        },
      },
      {
        id: "theme-light",
        label: "Switch Theme to Light Mode",
        icon: SwatchIcon,
        action: () => {
          themeState.setTheme("light");
          onclose();
        },
      },
      {
        id: "theme-dark",
        label: "Switch Theme to Dark Mode",
        icon: SwatchIcon,
        action: () => {
          themeState.setTheme("dark");
          onclose();
        },
      },
      {
        id: "theme-system",
        label: "Switch Theme to System Mode",
        icon: SwatchIcon,
        action: () => {
          themeState.setTheme("system");
          onclose();
        },
      }
    );

    return baseCommands;
  });

  let filteredNotes = $derived(
    query.trim() ? localSearchResults : notesState.notes
  );

  let filteredCommands = $derived.by(() => {
    if (!query.trim()) return commands;
    const queryLower = query.toLowerCase();
    return commands.filter((cmd) =>
      cmd.label.toLowerCase().includes(queryLower)
    );
  });

  let allItems = $derived.by(() => [
    ...filteredCommands.map((cmd) => ({
      type: "command" as const,
      id: cmd.id,
      label: cmd.label,
      shortcut: cmd.shortcut,
      icon: cmd.icon,
      action: cmd.action,
    })),
    ...filteredNotes.slice(0, 10).map((note) => ({
      type: "note" as const,
      id: note.id,
      label: cleanTitle(note.title),
      preview: note.preview,
      icon: undefined,
      shortcut: undefined,
      action: () => {
        notesState.selectNote(note.id);
        onclose();
      },
    })),
  ]);

  $effect(() => {
    if (open) {
      query = "";
      selectedIndex = 0;
      setTimeout(() => inputEl?.focus(), 50);
    }
  });

  $effect(() => {
    void query;
    selectedIndex = 0;
  });

  $effect(() => {
    if (listEl) {
      const selectedItem = listEl.querySelector(
        `[data-index="${selectedIndex}"]`
      );
      selectedItem?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  });

  async function handleDeleteConfirm() {
    if (noteToDelete) {
      try {
        await notesState.deleteNote(noteToDelete);
        noteToDelete = null;
        deleteDialogOpen = false;
        onclose();
      } catch (error) {
        console.error("Failed to delete note:", error);
        toast.error("Failed to delete note");
      }
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation();
        selectedIndex = Math.min(selectedIndex + 1, allItems.length - 1);
        break;
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        break;
      case "Enter":
        e.preventDefault();
        e.stopPropagation();
        if (allItems[selectedIndex]) {
          allItems[selectedIndex].action();
        }
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        onclose();
        break;
    }
  }
</script>

{#if open}
  <div class="fixed inset-0 z-50 flex items-center justify-center py-11 px-4 pointer-events-none">
    <!-- Backdrop dismiss area -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      in:backdropIn
      out:backdropOut
      class="fixed inset-0 bg-black/40 pointer-events-auto"
      onclick={onclose}
    ></div>

    <!-- Palette -->
    <div
      in:modalIn
      out:modalOut
      class="relative w-full h-full max-h-108 max-w-2xl bg-bg rounded-2xl shadow-2xl overflow-hidden border border-border flex flex-col pointer-events-auto z-10"
    >
      <!-- Search input -->
      <div class="border-b border-border flex-none flex items-center px-4">
        <span class="w-2 h-2 rounded-full bg-accent mr-3 shrink-0"></span>
        <input
          bind:this={inputEl}
          type="text"
          bind:value={query}
          onkeydown={handleKeyDown}
          placeholder="Search notes or type a command..."
          autocomplete="off"
          autocorrect="off"
          autocapitalize="off"
          spellcheck={false}
          class="w-full py-3.5 text-base bg-transparent outline-none text-text placeholder:text-text-muted/60"
        />
      </div>

      <!-- Results -->
      <div bind:this={listEl} class="overflow-y-auto h-full p-2.5 flex-1">
        {#if allItems.length === 0}
          <div class="text-sm font-medium opacity-50 text-text-muted p-2">
            No results found
          </div>
        {:else}
          <!-- Commands section -->
          {#if filteredCommands.length > 0}
            <div class="space-y-0.5 mb-5">
              <div class="text-sm font-medium text-text-muted px-2.5 py-1.5">
                Commands
              </div>
              {#each filteredCommands as cmd, i (cmd.id)}
                <div data-index={i}>
                  <CommandItem
                    label={cmd.label}
                    shortcut={cmd.shortcut}
                    icon={cmd.icon}
                    isSelected={selectedIndex === i}
                    onclick={cmd.action}
                  />
                </div>
              {/each}
            </div>
          {/if}

          <!-- Notes section -->
          {#if filteredNotes.length > 0}
            <div class="space-y-0.5">
              <div class="text-sm font-medium text-text-muted px-2.5 py-1.5">
                Notes
              </div>
              {#each filteredNotes.slice(0, 10) as note, i (note.id)}
                {@const title = cleanTitle(note.title)}
                {@const firstLetter = title.charAt(0).toUpperCase()}
                {@const cleanSubtitle = note.preview
                  ?.replace(/&nbsp;/g, " ")
                  .replace(/\u00A0/g, " ")
                  .trim()}
                {@const index = filteredCommands.length + i}
                <div data-index={index}>
                  <CommandItem
                    label={title}
                    subtitle={cleanSubtitle}
                    iconText={firstLetter}
                    variant="note"
                    isSelected={selectedIndex === index}
                    onclick={allItems[index].action}
                  />
                </div>
              {/each}
            </div>
          {/if}
        {/if}
      </div>
    </div>

    <!-- Delete confirmation dialog -->
    <AlertDialog bind:open={deleteDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete note?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete the note and all its content. This
            action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onclick={handleDeleteConfirm}>
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
{/if}
