import { useState, useMemo, useCallback, useEffect, memo } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { useNotes } from "../../context/NotesContext";
import * as notesService from "../../services/notes";
import type { Settings } from "../../types/note";
import { getTagColor } from "../../lib/tags";
import { cleanTitle } from "../../lib/utils";
import { TrashIcon, CopyIcon } from "../icons";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../ui";

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 86400000);

  if (date >= startOfToday) {
    return `Today, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  if (date >= startOfYesterday) {
    return `Yesterday, ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

function formatWordCount(count?: number, preview?: string): string {
  if (typeof count === "number") {
    if (count === 0 && (!preview || !preview.trim())) return "Empty";
    return count === 1 ? "1 word" : `${count.toLocaleString()} words`;
  }
  if (!preview || !preview.trim()) return "Empty";
  const words = preview.trim().split(/\s+/).filter(Boolean).length;
  if (words === 0) return "Empty";
  return words === 1 ? "1 word" : `${words.toLocaleString()} words`;
}

export const BraunNoteList = memo(function BraunNoteList() {
  const {
    notes,
    selectedNoteId,
    selectNote,
    deleteNote,
    duplicateNote,
    activeTagFilter,
    currentNote,
  } = useNotes();

  const [settings, setSettings] = useState<Settings | null>(null);
  const [filterQuery, setFilterQuery] = useState("");
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    notesService
      .getSettings()
      .then(setSettings)
      .catch((err) => console.error("Failed to load settings in BraunNoteList:", err));
  }, [notes]);

  // Filter notes based on active tag and search query
  const filteredNotes = useMemo(() => {
    let result = notes;
    if (activeTagFilter) {
      result = result.filter(
        (n) => n.tags && Array.isArray(n.tags) && n.tags.includes(activeTagFilter)
      );
    }
    if (filterQuery.trim()) {
      const q = filterQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          (n.preview && n.preview.toLowerCase().includes(q))
      );
    }
    return result;
  }, [notes, activeTagFilter, filterQuery]);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTargetId) return;
    try {
      await deleteNote(deleteTargetId);
      toast.success("Note deleted");
    } catch {
      toast.error("Failed to delete note");
    } finally {
      setDeleteTargetId(null);
    }
  }, [deleteNote, deleteTargetId]);

  return (
    <div className="w-full h-full flex flex-col bg-bg border-r border-border select-none overflow-hidden transition-colors">
      {/* Search Filter Header */}
      <div className="p-2.5 border-b border-border shrink-0">
        <div className="relative">
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter notes..."
            className="w-full text-xs px-3 py-1.5 rounded-lg outline-none transition-all bg-bg-secondary border border-border text-text placeholder:text-text-muted/60 focus:border-accent"
          />
          {filterQuery && (
            <button
              onClick={() => setFilterQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Note Cards List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredNotes.length === 0 ? (
          <div className="p-4 text-center text-xs text-text-muted font-sans">
            No notes found
          </div>
        ) : (
          filteredNotes.map((note) => {
            const isSelected = selectedNoteId === note.id;
            const title = cleanTitle(note.title) || "Untitled Note";
            const previewText =
              note.preview || "No content in this note yet...";
            const noteWordCount =
              isSelected && currentNote && typeof currentNote.content === "string"
                ? (currentNote.content.trim()
                    ? currentNote.content
                        .trim()
                        .split(/\s+/)
                        .filter(Boolean)
                        .filter((w) => !/^[#*\-+>|~=_`]+$/.test(w)).length
                    : 0)
                : note.wordCount;

            return (
              <ContextMenu.Root key={note.id}>
                <ContextMenu.Trigger asChild>
                  <div
                    onClick={() => selectNote(note.id)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-bg-card border-border shadow-xs dark:bg-[#23252A]"
                        : "bg-bg-secondary/40 border-transparent hover:bg-bg-secondary hover:border-border/40 text-text"
                    }`}
                  >
                    {/* Top Row: Title & Active Indicator / Tag Badge */}
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <h3
                        className={`text-xs font-bold truncate ${
                          isSelected ? "text-text" : "text-text/90"
                        }`}
                      >
                        {title}
                      </h3>

                      {/* Right indicators */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        {note.tags && note.tags.length > 0 && (
                          <div className="flex items-center gap-1 max-w-[120px] overflow-hidden">
                            {note.tags.slice(0, 2).map((t) => {
                              const color = getTagColor(t, settings?.tagColors);
                              return (
                                <span
                                  key={t}
                                  className="text-[9px] font-mono px-1.5 py-0.2 rounded-full border truncate"
                                  style={{
                                    backgroundColor: color + "18",
                                    borderColor: color + "30",
                                    color: color,
                                  }}
                                >
                                  #{t}
                                </span>
                              );
                            })}
                            {note.tags.length > 2 && (
                              <span className="text-[9px] font-mono text-text-muted/60">
                                +{note.tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                        {isSelected && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0 shadow-xs bg-accent"
                            title="Active Note"
                          />
                        )}
                      </div>
                    </div>

                    {/* Middle Row: 2-line Preview */}
                    <p className="text-[11px] line-clamp-2 leading-relaxed mb-2 text-text-muted">
                      {previewText}
                    </p>

                    {/* Bottom Row: Timestamp & Word Count in Monospace */}
                    <div className="flex items-center justify-between text-[10px] font-mono text-text-muted/70">
                      <span>{formatTimestamp(note.modified)}</span>
                      <span>{formatWordCount(noteWordCount, note.preview)}</span>
                    </div>
                  </div>
                </ContextMenu.Trigger>

                <ContextMenu.Portal>
                  <ContextMenu.Content className="min-w-44 bg-bg border border-border rounded-xl shadow-xl py-1 z-50 text-xs text-text">
                    <ContextMenu.Item
                      className="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2"
                      onSelect={() => duplicateNote(note.id)}
                    >
                      <CopyIcon className="w-3.5 h-3.5 stroke-[1.8]" />
                      <span>Duplicate Note</span>
                    </ContextMenu.Item>
                    <ContextMenu.Item
                      className="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2 text-red-500 hover:text-red-600"
                      onSelect={() => setDeleteTargetId(note.id)}
                    >
                      <TrashIcon className="w-3.5 h-3.5 stroke-[1.8]" />
                      <span>Delete Note</span>
                    </ContextMenu.Item>
                  </ContextMenu.Content>
                </ContextMenu.Portal>
              </ContextMenu.Root>
            );
          })
        )}
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(deleteTargetId)}
        onOpenChange={(open) => !open && setDeleteTargetId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this note. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
});
