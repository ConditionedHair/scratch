import { useState, useMemo, useCallback, useEffect } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { useNotes } from "../../context/NotesContext";
import * as notesService from "../../services/notes";
import type { Settings } from "../../types/note";
import { getTagColor, TAG_PALETTE } from "../../lib/tags";
import { FolderNameDialog } from "../notes/FolderNameDialog";
import {
  AddNoteIcon,
  FolderPlusIcon,
  PinIcon,
  SettingsIcon,
  PencilIcon,
  SwatchIcon,
  ChevronRightIcon,
} from "../icons";
import { mod, isMac } from "../../lib/platform";
import { cn } from "../../lib/utils";
import { toast } from "sonner";

interface BraunLibraryProps {
  onOpenSettings?: () => void;
}

export function BraunLibrary({ onOpenSettings }: BraunLibraryProps) {
  const {
    notes,
    createNote,
    createFolder,
    activeTagFilter,
    setActiveTagFilter,
    refreshNotes,
  } = useNotes();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [tagToRename, setTagToRename] = useState<string | null>(null);

  useEffect(() => {
    notesService
      .getSettings()
      .then(setSettings)
      .catch((err) => console.error("Failed to load settings in BraunLibrary:", err));
  }, [notes]);

  // Derive unique folders from notes
  const folders = useMemo(() => {
    const set = new Set<string>();
    for (const note of notes) {
      if (note.id.includes("/")) {
        const parts = note.id.split("/");
        // Add root-level folder
        set.add(parts[0]);
      }
    }
    return Array.from(set).sort();
  }, [notes]);

  // Derive unique tags with counts
  const tags = useMemo(() => {
    const map: Record<string, number> = {};
    for (const note of notes) {
      if (note.tags && Array.isArray(note.tags)) {
        for (const t of note.tags) {
          map[t] = (map[t] || 0) + 1;
        }
      }
    }
    return Object.entries(map).map(([tag, count]) => ({ tag, count }));
  }, [notes]);

  // Count pinned notes
  const pinnedCount = useMemo(() => {
    return settings?.pinnedNoteIds?.length ?? 0;
  }, [settings]);

  const openRenameDialog = useCallback((tag: string) => {
    setTagToRename(tag);
    setRenameDialogOpen(true);
  }, []);

  const handleRenameConfirm = useCallback(
    async (newName: string) => {
      const cleanName = newName.trim().replace(/^#/, "");
      if (!tagToRename || !cleanName || cleanName === tagToRename) {
        setRenameDialogOpen(false);
        setTagToRename(null);
        return;
      }
      try {
        await notesService.renameTag(tagToRename, cleanName);
        // Carry the color assignment over to the new name
        const currentSettings = await notesService.getSettings();
        if (currentSettings.tagColors?.[tagToRename]) {
          const colors = { ...currentSettings.tagColors };
          colors[cleanName] = colors[tagToRename];
          delete colors[tagToRename];
          await notesService.updateSettings({ ...currentSettings, tagColors: colors });
          setSettings({ ...currentSettings, tagColors: colors });
        }
        if (activeTagFilter === tagToRename) {
          setActiveTagFilter(cleanName);
        }
        await refreshNotes();
        setRenameDialogOpen(false);
        setTagToRename(null);
        toast.success(`Renamed #${tagToRename} to #${cleanName}`);
      } catch (error) {
        console.error("Failed to rename tag:", error);
        toast.error("Failed to rename tag");
      }
    },
    [tagToRename, activeTagFilter, setActiveTagFilter, refreshNotes],
  );

  const handleColorSelect = useCallback(
    async (tag: string, color: string) => {
      try {
        const currentSettings = await notesService.getSettings();
        const colors = { ...currentSettings.tagColors, [tag]: color };
        await notesService.updateSettings({ ...currentSettings, tagColors: colors });
        setSettings({ ...currentSettings, tagColors: colors });
        await refreshNotes();
        toast.success(`Updated color for #${tag}`);
      } catch (error) {
        console.error("Failed to update tag color:", error);
        toast.error("Failed to update tag color");
      }
    },
    [refreshNotes],
  );

  const handleCreateFolderConfirm = useCallback(
    async (name: string) => {
      try {
        await createFolder("", name);
        setFolderDialogOpen(false);
        toast.success(`Folder "${name}" created`);
      } catch (err) {
        console.error(err);
        toast.error("Failed to create folder");
      }
    },
    [createFolder]
  );

  return (
    <aside className="w-full h-full flex flex-col border-r border-border select-none bg-bg-secondary text-text transition-colors">
      {/* Library Header */}
      <div className="h-11 px-3.5 border-b border-border flex items-center justify-between shrink-0">
        <span className="text-[11px] font-bold tracking-wider uppercase text-text-muted">
          LIBRARY
        </span>
        
        {/* Signal Yellow Circular Plus Button */}
        <DropdownMenu.Root open={plusMenuOpen} onOpenChange={setPlusMenuOpen}>
          <DropdownMenu.Trigger asChild>
            <button
              className="w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer hover:brightness-105 active:scale-95 bg-accent text-slate-950 font-bold shadow-xs"
              title="New Note or Folder"
            >
              <svg
                className="w-3.5 h-3.5 stroke-[2.5]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="min-w-44 bg-bg border border-border rounded-xl shadow-xl py-1 z-50 text-xs text-text"
              sideOffset={5}
              align="end"
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DropdownMenu.Item
                className="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2"
                onSelect={() => createNote()}
              >
                <AddNoteIcon className="w-3.5 h-3.5 stroke-[1.8]" />
                <span className="flex-1 font-medium">New Note</span>
                <kbd className="text-[10px] text-text-muted font-mono ml-2">
                  {mod}
                  {isMac ? "" : "+"}N
                </kbd>
              </DropdownMenu.Item>
              <DropdownMenu.Item
                className="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2"
                onSelect={() => setFolderDialogOpen(true)}
              >
                <FolderPlusIcon className="w-3.5 h-3.5 stroke-[1.8]" />
                <span className="font-medium">New Folder</span>
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto p-2 space-y-4">
        {/* Core Views: All Notes & Pinned */}
        <div className="space-y-0.5">
          <button
            onClick={() => {
              setActiveTagFilter(null);
              setSelectedFolder(null);
            }}
            className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
              activeTagFilter === null && selectedFolder === null
                ? "bg-bg-emphasis text-text font-semibold shadow-2xs"
                : "text-text-muted hover:text-text hover:bg-bg-muted/70 font-medium"
            }`}
          >
            <div className="flex items-center gap-2">
              <svg
                className="w-4 h-4 opacity-75 stroke-[1.8]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              <span>All Notes</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-bg-muted text-text-muted">
              {notes.length}
            </span>
          </button>

          <button
            onClick={() => {
              // Could filter by pinned
            }}
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text hover:bg-bg-muted/70 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <PinIcon className="w-4 h-4 opacity-70 stroke-[1.8]" />
              <span>Pinned</span>
            </div>
            <span className="text-[10px] font-mono text-text-muted/70">
              {pinnedCount}
            </span>
          </button>
        </div>

        {/* Folders Section */}
        {folders.length > 0 && (
          <div>
            <div className="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted/70">
              FOLDERS
            </div>
            <div className="space-y-0.5 text-xs">
              {folders.map((f) => {
                const isSelected = selectedFolder === f;
                return (
                  <div
                    key={f}
                    onClick={() => {
                      setSelectedFolder(isSelected ? null : f);
                      setActiveTagFilter(null);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-bg-emphasis text-text font-semibold shadow-2xs"
                        : "text-text-muted hover:text-text hover:bg-bg-muted/70 font-medium"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          isSelected ? "bg-accent shadow-xs" : "bg-text-muted/40"
                        }`}
                      />
                      <span className="truncate">{f}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tags Section */}
        {tags.length > 0 && (
          <div className="pt-2">
            <div className="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted/70 flex items-center justify-between">
              <span>TAGS</span>
              <span className="font-mono text-[9px] text-text-muted/50 font-normal">
                {tags.length}
              </span>
            </div>
            <div className="space-y-0.5 text-xs">
              {tags.map(({ tag, count }) => {
                const isActive = activeTagFilter === tag;
                const tagColor = getTagColor(tag, settings?.tagColors);
                return (
                  <ContextMenu.Root key={tag}>
                    <ContextMenu.Trigger asChild>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setActiveTagFilter(isActive ? null : tag)
                        }
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors select-none group",
                          isActive
                            ? "bg-bg-emphasis text-text font-semibold shadow-2xs"
                            : "text-text-muted hover:text-text hover:bg-bg-muted/70 font-medium",
                        )}
                        title={`#${tag} • Right-click to rename or change color`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0 shadow-xs transition-transform group-hover:scale-125"
                            style={{ backgroundColor: tagColor }}
                          />
                          <span className="truncate">#{tag}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-mono text-text-muted/60 group-hover:text-text-muted">
                            {count}
                          </span>
                        </div>
                      </div>
                    </ContextMenu.Trigger>
                    <ContextMenu.Portal>
                      <ContextMenu.Content className="min-w-44 bg-bg border border-border rounded-xl shadow-xl py-1 z-50 text-xs text-text">
                        <ContextMenu.Item
                          className="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2"
                          onSelect={() => openRenameDialog(tag)}
                        >
                          <PencilIcon className="w-3.5 h-3.5 stroke-[1.8]" />
                          <span>Rename Tag</span>
                        </ContextMenu.Item>
                        <ContextMenu.Sub>
                          <ContextMenu.SubTrigger className="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <SwatchIcon className="w-3.5 h-3.5 stroke-[1.8]" />
                              <span>Change Color</span>
                            </div>
                            <ChevronRightIcon className="w-3 h-3 stroke-[1.8] text-text-muted" />
                          </ContextMenu.SubTrigger>
                          <ContextMenu.Portal>
                            <ContextMenu.SubContent
                              className="bg-bg border border-border rounded-xl shadow-xl p-2.5 z-50 min-w-48"
                              sideOffset={4}
                            >
                              <div className="text-[10px] font-mono uppercase tracking-wider text-text-muted/70 px-1 pb-1.5">
                                Select Color
                              </div>
                              <div className="grid grid-cols-6 gap-1.5">
                                {TAG_PALETTE.map((color) => (
                                  <button
                                    key={color}
                                    type="button"
                                    onClick={() => handleColorSelect(tag, color)}
                                    title={color}
                                    className={cn(
                                      "w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-120 active:scale-95 shadow-2xs",
                                      color.toLowerCase() === tagColor.toLowerCase() &&
                                        "ring-2 ring-offset-2 ring-offset-bg ring-text",
                                    )}
                                    style={{ backgroundColor: color }}
                                  />
                                ))}
                              </div>
                            </ContextMenu.SubContent>
                          </ContextMenu.Portal>
                        </ContextMenu.Sub>
                      </ContextMenu.Content>
                    </ContextMenu.Portal>
                  </ContextMenu.Root>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status / Footer Strip */}
      {onOpenSettings && (
        <div className="p-2 border-t border-border flex items-center justify-between text-xs text-text-muted">
          <button
            onClick={onOpenSettings}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-bg-muted hover:text-text transition-colors text-left text-xs cursor-pointer"
          >
            <SettingsIcon className="w-3.5 h-3.5 stroke-[1.8]" />
            <span>Preferences</span>
          </button>
        </div>
      )}

      {/* Create Folder Dialog */}
      <FolderNameDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        onConfirm={handleCreateFolderConfirm}
        title="Create new folder"
        description="Enter a name for the new folder"
        confirmLabel="Create"
      />

      {/* Rename Tag Dialog */}
      <FolderNameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        onConfirm={handleRenameConfirm}
        title="Rename Tag"
        description="Enter a new name for this tag across all notes"
        confirmLabel="Rename"
        defaultValue={tagToRename ?? ""}
      />
    </aside>
  );
}
