import { useCallback, useEffect, useMemo, useState } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { toast } from "sonner";
import { useNotes } from "../../context/NotesContext";
import * as notesService from "../../services/notes";
import { getTagColor, TAG_PALETTE } from "../../lib/tags";
import { ChevronRightIcon, ChevronDownIcon, PencilIcon, SwatchIcon } from "../icons";
import { cn } from "../../lib/utils";
import { FolderNameDialog } from "./FolderNameDialog";
import type { Settings } from "../../types/note";

const STORAGE_KEY = "scratch:tagsCollapsed";

const menuItemClass =
  "px-3 py-1.5 text-sm text-text cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2 rounded-sm";

function loadCollapsed(): boolean {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) === true : false;
  } catch {
    return false;
  }
}

function saveCollapsed(collapsed: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collapsed));
  } catch {
    // Ignore localStorage errors
  }
}

export function TagList() {
  const { notes, activeTagFilter, setActiveTagFilter, refreshNotes } = useNotes();
  const [collapsed, setCollapsed] = useState<boolean>(loadCollapsed);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [tagToRename, setTagToRename] = useState<string | null>(null);

  useEffect(() => {
    notesService
      .getSettings()
      .then(setSettings)
      .catch((error) => {
        console.error("Failed to load settings:", error);
      });
  }, [notes]);

  useEffect(() => {
    saveCollapsed(collapsed);
  }, [collapsed]);

  // Sorted alphabetically for stable, predictable positions as note counts
  // shift during editing — mirrors how the folder tree is already ordered.
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const note of notes) {
      for (const tag of note.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => a.tag.localeCompare(b.tag));
  }, [notes]);

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const handleTagClick = useCallback(
    (tag: string) => {
      setActiveTagFilter(activeTagFilter === tag ? null : tag);
    },
    [activeTagFilter, setActiveTagFilter],
  );

  const openRenameDialog = useCallback((tag: string) => {
    setTagToRename(tag);
    setRenameDialogOpen(true);
  }, []);

  const handleRenameConfirm = useCallback(
    async (newName: string) => {
      if (!tagToRename || newName === tagToRename) {
        setRenameDialogOpen(false);
        setTagToRename(null);
        return;
      }
      try {
        await notesService.renameTag(tagToRename, newName);
        // Carry the color assignment over to the new name
        const currentSettings = await notesService.getSettings();
        if (currentSettings.tagColors?.[tagToRename]) {
          const colors = { ...currentSettings.tagColors };
          colors[newName] = colors[tagToRename];
          delete colors[tagToRename];
          await notesService.updateSettings({ ...currentSettings, tagColors: colors });
        }
        if (activeTagFilter === tagToRename) {
          setActiveTagFilter(newName);
        }
        await refreshNotes();
        setRenameDialogOpen(false);
        setTagToRename(null);
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
        await refreshNotes();
      } catch (error) {
        console.error("Failed to update tag color:", error);
        toast.error("Failed to update tag color");
      }
    },
    [refreshNotes],
  );

  if (tagCounts.length === 0) {
    return null;
  }

  return (
    <div className="px-1.5 pt-1.5">
      <div
        onClick={handleToggleCollapse}
        role="button"
        tabIndex={-1}
        className="flex items-center gap-1 px-1 py-1 cursor-pointer select-none rounded-md hover:bg-bg-muted"
      >
        {collapsed ? (
          <ChevronRightIcon className="w-4 h-4 stroke-[1.6] text-text-muted/60 shrink-0" />
        ) : (
          <ChevronDownIcon className="w-4 h-4 stroke-[1.6] text-text-muted/60 shrink-0" />
        )}
        <span className="text-sm text-text-muted truncate">Tags</span>
      </div>
      {!collapsed && (
        <div className="flex flex-col gap-0.5 pb-1">
          {tagCounts.map(({ tag, count }) => {
            const isActive = activeTagFilter === tag;
            const tagColor = getTagColor(tag, settings?.tagColors);
            return (
              <ContextMenu.Root key={tag}>
                <ContextMenu.Trigger asChild>
                  <div
                    onClick={() => handleTagClick(tag)}
                    role="button"
                    tabIndex={-1}
                    className={cn(
                      "flex items-center gap-2 py-1.5 pl-6 pr-2 cursor-pointer rounded-md select-none transition-colors",
                      isActive ? "bg-bg-muted" : "hover:bg-bg-muted",
                    )}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: tagColor }}
                    />
                    <span className="text-sm text-text truncate flex-1">{tag}</span>
                    <div className="text-text-muted font-medium text-2xs min-w-4.75 h-4.75 flex items-center justify-center px-1 bg-bg-muted rounded-sm">
                      {count}
                    </div>
                  </div>
                </ContextMenu.Trigger>
                <ContextMenu.Portal>
                  <ContextMenu.Content className="min-w-44 bg-bg border border-border rounded-md shadow-lg py-1 z-50">
                    <ContextMenu.Item
                      className={menuItemClass}
                      onSelect={() => openRenameDialog(tag)}
                    >
                      <PencilIcon className="w-4 h-4 stroke-[1.6]" />
                      Rename
                    </ContextMenu.Item>
                    <ContextMenu.Sub>
                      <ContextMenu.SubTrigger className={menuItemClass}>
                        <SwatchIcon className="w-4 h-4 stroke-[1.6]" />
                        Change Color
                      </ContextMenu.SubTrigger>
                      <ContextMenu.Portal>
                        <ContextMenu.SubContent
                          className="bg-bg border border-border rounded-md shadow-lg p-2 z-50"
                          sideOffset={4}
                        >
                          <div className="grid grid-cols-4 gap-1.5">
                            {TAG_PALETTE.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => handleColorSelect(tag, color)}
                                title={color}
                                className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                                  color === tagColor && "ring-2 ring-offset-2 ring-offset-bg ring-text-muted",
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
      )}

      <FolderNameDialog
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        onConfirm={handleRenameConfirm}
        title="Rename Tag"
        description="Enter a new name for the tag"
        confirmLabel="Rename"
        defaultValue={tagToRename ?? ""}
      />
    </div>
  );
}
