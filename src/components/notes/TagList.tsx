import { useCallback, useEffect, useMemo, useState } from "react";
import { useNotes } from "../../context/NotesContext";
import * as notesService from "../../services/notes";
import { getTagColor } from "../../lib/tags";
import { ChevronRightIcon, ChevronDownIcon } from "../icons";
import { cn } from "../../lib/utils";
import type { Settings } from "../../types/note";

const STORAGE_KEY = "scratch:tagsCollapsed";

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
  const { notes, activeTagFilter, setActiveTagFilter } = useNotes();
  const [collapsed, setCollapsed] = useState<boolean>(loadCollapsed);
  const [settings, setSettings] = useState<Settings | null>(null);

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
            return (
              <div
                key={tag}
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
                  style={{ backgroundColor: getTagColor(tag, settings?.tagColors) }}
                />
                <span className="text-sm text-text truncate flex-1">{tag}</span>
                <div className="text-text-muted font-medium text-2xs min-w-4.75 h-4.75 flex items-center justify-center px-1 bg-bg-muted rounded-sm">
                  {count}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
