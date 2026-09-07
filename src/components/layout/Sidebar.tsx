import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { toast } from "sonner";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useNotes } from "../../context/NotesContext";
import { NoteList } from "../notes/NoteList";
import { TagList } from "../notes/TagList";
import { Footer } from "./Footer";
import {
  XIcon,
  SearchIcon,
  SearchOffIcon,
  AddNoteIcon,
  FolderPlusIcon,
  NoteIcon,
} from "../icons";
import { mod, shift, isMac } from "../../lib/platform";
import * as notesService from "../../services/notes";
import { FolderNameDialog } from "../notes/FolderNameDialog";

interface SidebarProps {
  onOpenSettings?: () => void;
}

export function Sidebar({ onOpenSettings }: SidebarProps) {
  const {
    createNote,
    createFolder,
    notes,
    search,
    searchQuery,
    clearSearch,
    selectedNoteId,
    moveNote,
    moveFolder,
  } = useNotes();
  const [searchOpen, setSearchOpen] = useState(false);
  const [inputValue, setInputValue] = useState(searchQuery);
  const [plusMenuOpen, setPlusMenuOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDialogParent, setFolderDialogParent] = useState("");
  const [foldersEnabled, setFoldersEnabled] = useState(true);
  const [dragLabel, setDragLabel] = useState<string | null>(null);
  const [dragCount, setDragCount] = useState(1);
  const [multiSelectedNoteIds, setMultiSelectedNoteIds] = useState<Set<string>>(new Set());
  const [lastClickedNoteId, setLastClickedNoteId] = useState<string | null>(null);
  const debounceRef = useRef<number | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const multiSelectedRef = useRef(multiSelectedNoteIds) as RefObject<Set<string>>;
  multiSelectedRef.current = multiSelectedNoteIds;

  // dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "note") {
      const noteId = data.id as string;
      const leaf = noteId.includes("/")
        ? noteId.substring(noteId.lastIndexOf("/") + 1)
        : noteId;
      setDragLabel(leaf);

      // Multi-select: if dragged note is in selection, drag all; otherwise reset
      const selected = multiSelectedRef.current!;
      if (selected.has(noteId) && selected.size > 1) {
        setDragCount(selected.size);
      } else {
        setMultiSelectedNoteIds(new Set([noteId]));
        setDragCount(1);
      }
    } else if (data?.type === "folder") {
      const path = data.path as string;
      const name = path.includes("/")
        ? path.substring(path.lastIndexOf("/") + 1)
        : path;
      setDragLabel(name);
      setDragCount(1);
    }
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setDragLabel(null);
      setDragCount(1);
      const { active, over } = event;
      if (!over) return;

      const activeData = active.data.current;
      const overData = over.data.current;
      if (!activeData || !overData) return;

      const targetFolder = overData.path as string;

      try {
        if (activeData.type === "note") {
          const noteId = activeData.id as string;
          const selected = multiSelectedRef.current!;

          // Batch move if multi-selected
          if (selected.has(noteId) && selected.size > 1) {
            const noteIds = Array.from(selected).filter((id) => {
              const parent = id.includes("/")
                ? id.substring(0, id.lastIndexOf("/"))
                : "";
              return parent !== targetFolder;
            });
            if (noteIds.length === 0) return;
            let failures = 0;
            for (const id of noteIds) {
              try {
                await moveNote(id, targetFolder);
              } catch {
                failures++;
              }
            }
            if (failures > 0) {
              toast.error(`Failed to move ${failures} note(s)`);
            }
            setMultiSelectedNoteIds(new Set());
          } else {
            const noteParent = noteId.includes("/")
              ? noteId.substring(0, noteId.lastIndexOf("/"))
              : "";
            if (noteParent === targetFolder) return;
            await moveNote(noteId, targetFolder);
            setMultiSelectedNoteIds(new Set());
          }
        } else if (activeData.type === "folder") {
          const folderPath = activeData.path as string;
          if (
            targetFolder === folderPath ||
            targetFolder.startsWith(folderPath + "/")
          )
            return;
          const folderParent = folderPath.includes("/")
            ? folderPath.substring(0, folderPath.lastIndexOf("/"))
            : "";
          if (folderParent === targetFolder) return;
          await moveFolder(folderPath, targetFolder);
        }

        // Expand target folder so the moved item is visible
        if (targetFolder) {
          window.dispatchEvent(
            new CustomEvent("expand-folder", { detail: targetFolder }),
          );
        }
      } catch (error) {
        console.error("Failed to move item:", error);
        toast.error("Failed to move item");
      }
    },
    [moveNote, moveFolder],
  );

  // Load folders setting
  useEffect(() => {
    notesService.getSettings().then((s) => {
      setFoldersEnabled(s.foldersEnabled === true);
    }).catch((error) => {
      console.error("Failed to load settings:", error);
      setFoldersEnabled(false);
    });
  }, []);

  // Sync input with search query
  useEffect(() => {
    setInputValue(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setInputValue(value);

      // Debounce search
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = window.setTimeout(() => {
        search(value);
      }, 220);
    },
    [search],
  );

  const toggleSearch = useCallback(() => {
    setSearchOpen((prev) => {
      if (prev) {
        // Closing search — clear query
        setInputValue("");
        clearSearch();
      } else {
        // Opening search — clear multi-selection
        setMultiSelectedNoteIds(new Set());
      }
      return !prev;
    });
  }, [clearSearch]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setInputValue("");
    clearSearch();
  }, [clearSearch]);

  // Auto-focus search input when opened
  useEffect(() => {
    if (searchOpen) {
      // Small delay to ensure the input is rendered
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    }
  }, [searchOpen]);

  // Global shortcut hook: open and focus sidebar search
  useEffect(() => {
    const handleOpenSidebarSearch = () => {
      setSearchOpen(true);
      requestAnimationFrame(() => {
        searchInputRef.current?.focus();
      });
    };

    window.addEventListener("open-sidebar-search", handleOpenSidebarSearch);
    return () =>
      window.removeEventListener(
        "open-sidebar-search",
        handleOpenSidebarSearch,
      );
  }, []);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (inputValue) {
          // First escape: clear search
          setInputValue("");
          clearSearch();
        } else {
          // Second escape: close search
          closeSearch();
        }
      }
    },
    [inputValue, clearSearch, closeSearch],
  );

  const handleClearSearch = useCallback(() => {
    setInputValue("");
    clearSearch();
  }, [clearSearch]);

  const handleNewFolder = useCallback(() => {
    const lastSlash = selectedNoteId?.lastIndexOf("/") ?? -1;
    setFolderDialogParent(
      lastSlash > 0 ? selectedNoteId!.substring(0, lastSlash) : "",
    );
    setFolderDialogOpen(true);
  }, [selectedNoteId]);

  const handleFolderDialogConfirm = useCallback(
    async (name: string) => {
      try {
        await createFolder(folderDialogParent, name);
        setFolderDialogOpen(false);
      } catch (error) {
        console.error("Failed to create folder:", error);
        toast.error("Failed to create folder");
      }
    },
    [createFolder, folderDialogParent],
  );

  // Listen for create-new-folder event (from command palette / keyboard shortcut)
  useEffect(() => {
    const handleCreateFolder = () => {
      // Derive parent folder from currently selected note
      const lastSlash = selectedNoteId?.lastIndexOf("/") ?? -1;
      setFolderDialogParent(
        lastSlash > 0 ? selectedNoteId!.substring(0, lastSlash) : "",
      );
      setFolderDialogOpen(true);
    };

    window.addEventListener("create-new-folder", handleCreateFolder);
    return () =>
      window.removeEventListener("create-new-folder", handleCreateFolder);
  }, [selectedNoteId]);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDragLabel(null)}
    >
    <div className="relative w-full h-full bg-[#D8D4CA] dark:bg-[#17181d] border-r-2 border-border flex flex-col select-none transition-colors">
      {/* Sidebar Header: Index Selector & Action Keys */}
      <div className="p-3 border-b-2 border-border space-y-2.5 bg-[#D8D4CA] dark:bg-[#17181d]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-text">
              INDEX SELECTOR
            </span>
            <span className="px-1.5 py-0.2 bg-[#FAF8F5] dark:bg-[#0d0e11] text-ram-cyan font-mono text-[10px] rounded tracking-wider font-bold border border-ram-cyan/25">
              [ {notes.length} ENTRIES ]
            </span>
          </div>
          {/* Physical Action Keys */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleSearch}
              title={`Search Notes (${mod}${isMac ? "" : "+"}${shift}${isMac ? "" : "+"}F)`}
              className={`w-7 h-7 rounded bg-[#ECE8E0] dark:bg-[#23252d] border border-border shadow-keycap chiclet-btn flex items-center justify-center font-bold text-xs text-text-muted hover:text-text hover:bg-white dark:hover:bg-[#2c2f39] ${
                searchOpen ? "bg-white dark:bg-[#2e323d] text-text border-ram-cyan/50" : ""
              }`}
            >
              {searchOpen ? (
                <SearchOffIcon className="w-3.5 h-3.5 stroke-[2]" />
              ) : (
                <SearchIcon className="w-3.5 h-3.5 stroke-[2]" />
              )}
            </button>
            {foldersEnabled ? (
              <DropdownMenu.Root
                open={plusMenuOpen}
                onOpenChange={setPlusMenuOpen}
              >
                <DropdownMenu.Trigger asChild>
                  <button
                    className="w-7 h-7 rounded bg-ram-orange border border-ram-orange/80 shadow-keycap chiclet-btn flex items-center justify-center font-bold text-white text-sm hover:brightness-110 shadow-[0_0_8px_rgba(255,84,0,0.3)]"
                    title="New Note or Folder"
                  >
                    +
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    className="min-w-40 bg-[#FAF8F5] dark:bg-[#1c1d23] border border-border rounded-md shadow-lg py-1 z-50 font-mono text-xs"
                    sideOffset={5}
                    align="end"
                    onCloseAutoFocus={(e) => e.preventDefault()}
                  >
                    <DropdownMenu.Item
                      className="px-3 py-1.5 text-text cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2"
                      onSelect={() => createNote()}
                    >
                      <AddNoteIcon className="w-4 h-4 stroke-[1.6]" />
                      <span className="flex-1 font-medium">New Note</span>
                      <kbd className="text-[10px] text-text-muted ml-2">
                        {mod}
                        {isMac ? "" : "+"}N
                      </kbd>
                    </DropdownMenu.Item>
                    <DropdownMenu.Item
                      className="px-3 py-1.5 text-text cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2"
                      onSelect={handleNewFolder}
                    >
                      <FolderPlusIcon className="w-4 h-4 stroke-[1.6]" />
                      <span className="font-medium">New Folder</span>
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            ) : (
              <button
                onClick={() => createNote()}
                title={`New Note (${mod}${isMac ? "" : "+"}N)`}
                className="w-7 h-7 rounded bg-ram-orange border border-ram-orange/80 shadow-keycap chiclet-btn flex items-center justify-center font-bold text-white text-sm hover:brightness-110 shadow-[0_0_8px_rgba(255,84,0,0.3)]"
              >
                +
              </button>
            )}
          </div>
        </div>
        {/* Micro Channel Divider */}
        <div className="h-0.5 bg-gradient-to-r from-border via-border-subtle to-border opacity-70" />
      </div>

      {/* Scrollable area with search and notes */}
      <div className="flex-1 overflow-y-auto">
        {/* Search - sticky at top */}
        {searchOpen && (
          <div className="sticky top-0 z-10 px-2.5 pt-2 pb-1 bg-[#D8D4CA] dark:bg-[#17181d] border-b border-border/60">
            <div className="relative">
              <input
                ref={searchInputRef}
                type="text"
                value={inputValue}
                onChange={handleSearchChange}
                onKeyDown={handleSearchKeyDown}
                placeholder="SEARCH INDEX..."
                className="w-full h-8 px-3 pr-8 text-xs font-mono bg-[#FAF8F5] dark:bg-[#0d0e11] text-text placeholder:text-text-muted/60 rounded border border-border focus:border-ram-cyan focus:outline-none shadow-inner"
              />
              {inputValue && (
                <button
                  onClick={handleClearSearch}
                  tabIndex={-1}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
                >
                  <XIcon className="w-3.5 h-3.5 stroke-[2]" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Tags */}
        <TagList />

        {/* Note list */}
        <NoteList
          multiSelectedNoteIds={multiSelectedNoteIds}
          setMultiSelectedNoteIds={setMultiSelectedNoteIds}
          lastClickedNoteId={lastClickedNoteId}
          setLastClickedNoteId={setLastClickedNoteId}
        />
      </div>

      {/* Footer with git status, commit, and settings */}
      <Footer onOpenSettings={onOpenSettings} />

      {/* Folder name dialog */}
      <FolderNameDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        onConfirm={handleFolderDialogConfirm}
        title="Create new folder"
        description="Enter a name for your new folder"
        confirmLabel="Create"
      />
    </div>

    {/* Drag overlay — floating label while dragging */}
    <DragOverlay>
      {dragLabel && (
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-bg border border-border rounded-md shadow-lg text-sm text-text">
          <NoteIcon className="w-3.5 h-3.5 stroke-[1.6] opacity-50 shrink-0" />
          {dragLabel}
          {dragCount > 1 && (
            <span className="ml-1 px-1.5 py-0.5 bg-accent text-text-inverse text-xs rounded-full leading-none">
              +{dragCount - 1}
            </span>
          )}
        </div>
      )}
    </DragOverlay>
    </DndContext>
  );
}
