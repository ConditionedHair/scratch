import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useOptionalNotes } from "../../context/NotesContext";
import * as notesService from "../../services/notes";
import { getTagColor, assignTagColor, tagPillStyle } from "../../lib/tags";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { SuggestionList } from "./SuggestionList";
import { PlusIcon, XIcon } from "../icons";

interface SortableTagPillProps {
  tag: string;
  color: string;
  onRemove: () => void;
}

function SortableTagPill({ tag, color, onRemove }: SortableTagPillProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: tag });

  const style: CSSProperties = {
    ...tagPillStyle(color),
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <span
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      title={`#${tag}`}
      className="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium leading-none cursor-grab active:cursor-grabbing touch-none border shadow-2xs group shrink min-w-0 max-w-[130px] sm:max-w-[170px]"
    >
      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="truncate">#{tag}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="opacity-50 hover:opacity-100 hover:scale-115 transition-all ml-0.5 cursor-pointer shrink-0"
        tabIndex={-1}
        aria-label={`Remove tag ${tag}`}
      >
        <XIcon className="w-2.5 h-2.5 stroke-[2.2]" />
      </button>
    </span>
  );
}

interface TagBarProps {
  noteId: string;
  tags: string[];
  tagColors?: Record<string, string>;
}

export function TagBar({ noteId, tags, tagColors }: TagBarProps) {
  const notesCtx = useOptionalNotes();
  const notes = notesCtx?.notes;
  const [inputValue, setInputValue] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const allTagNames = useMemo(() => {
    const set = new Set<string>();
    for (const note of notes ?? []) {
      for (const tag of note.tags) {
        set.add(tag);
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [notes]);

  const suggestions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();
    const available = allTagNames.filter((t) => !tags.includes(t));
    if (!query) return available;
    return available.filter((t) => t.toLowerCase().includes(query));
  }, [inputValue, allTagNames, tags]);

  const applyTags = useCallback(
    async (newTags: string[]) => {
      try {
        await notesService.setNoteTags(noteId, newTags);
        await notesCtx?.reloadCurrentNote();
      } catch (error) {
        console.error("Failed to update tags:", error);
      }
    },
    [noteId, notesCtx],
  );

  const persistColorIfNew = useCallback(async (tag: string) => {
    try {
      const currentSettings = await notesService.getSettings();
      const updatedColors = assignTagColor(tag, currentSettings.tagColors);
      if (updatedColors !== currentSettings.tagColors) {
        await notesService.updateSettings({
          ...currentSettings,
          tagColors: updatedColors,
        });
      }
    } catch (error) {
      console.error("Failed to persist tag color:", error);
    }
  }, []);

  const commitTag = useCallback(
    (rawTag: string) => {
      const tag = rawTag.trim().replace(/^#/, "");
      setInputValue("");
      if (!tag || tags.includes(tag)) return;
      const newTags = [...tags, tag];
      void applyTags(newTags);
      void persistColorIfNew(tag);
    },
    [tags, applyTags, persistColorIfNew],
  );

  const removeTag = useCallback(
    (tag: string) => {
      void applyTags(tags.filter((t) => t !== tag));
    },
    [tags, applyTags],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;
      const oldIndex = tags.indexOf(active.id as string);
      const newIndex = tags.indexOf(over.id as string);
      if (oldIndex === -1 || newIndex === -1) return;
      void applyTags(arrayMove(tags, oldIndex, newIndex));
    },
    [tags, applyTags],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        e.key === "Enter" ||
        e.key === "," ||
        (e.key === " " && inputValue.trim().length > 0)
      ) {
        e.preventDefault();
        commitTag(inputValue);
      } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
        removeTag(tags[tags.length - 1]);
      } else if (e.key === "Escape") {
        setInputValue("");
        setIsEditing(false);
        inputRef.current?.blur();
      }
    },
    [inputValue, tags, commitTag, removeTag],
  );

  // Listen for command-palette "focus tag input" requests
  useEffect(() => {
    const handler = () => {
      setIsEditing(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    window.addEventListener("focus-tag-input", handler);
    return () => window.removeEventListener("focus-tag-input", handler);
  }, []);

  const maxDirectVisible = 2;
  const visibleTags = tags.slice(0, maxDirectVisible);
  const hiddenTags = tags.slice(maxDirectVisible);

  return (
    <div className="relative flex items-center gap-1.5 flex-nowrap min-w-0 shrink">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleTags} strategy={horizontalListSortingStrategy}>
          {visibleTags.map((tag) => (
            <SortableTagPill
              key={tag}
              tag={tag}
              color={getTagColor(tag, tagColors)}
              onRemove={() => removeTag(tag)}
            />
          ))}
        </SortableContext>
      </DndContext>

      {hiddenTags.length > 0 && (
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border border-border bg-bg hover:bg-bg-emphasis text-text-muted hover:text-text transition-colors cursor-pointer shrink-0 shadow-2xs"
              title={`${hiddenTags.length} more tag${hiddenTags.length > 1 ? "s" : ""}: ${hiddenTags.map((t) => `#${t}`).join(", ")}`}
            >
              +{hiddenTags.length}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className="p-1.5 bg-bg-secondary border border-border rounded-xl shadow-xl z-50 min-w-44 animate-in fade-in zoom-in-95 duration-150"
              sideOffset={6}
              align="start"
            >
              <div className="px-2 py-1 text-[10px] font-bold font-mono tracking-wider uppercase text-text-muted border-b border-border/60 mb-1">
                Additional Tags ({hiddenTags.length})
              </div>
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {hiddenTags.map((tag) => {
                  const color = getTagColor(tag, tagColors);
                  return (
                    <div
                      key={tag}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg hover:bg-bg-emphasis/70 transition-colors text-xs"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: color }}
                        />
                        <span className="truncate font-medium text-text">#{tag}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeTag(tag);
                        }}
                        className="opacity-50 hover:opacity-100 p-0.5 hover:bg-bg-muted rounded text-text-muted hover:text-text cursor-pointer shrink-0"
                        title={`Remove #${tag}`}
                      >
                        <XIcon className="w-3 h-3 stroke-[2]" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            setTimeout(() => {
              if (inputValue.trim()) {
                commitTag(inputValue);
              }
              setIsEditing(false);
            }, 180);
          }}
          placeholder="Add tag..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="text-xs bg-bg border border-border rounded-md px-2 py-0.5 outline-none text-text placeholder-text-muted/50 min-w-16 w-24 shrink-0 shadow-2xs"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsEditing(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text px-1.5 py-0.5 rounded-md hover:bg-bg-muted/70 transition-colors border border-dashed border-border/70 hover:border-border cursor-pointer shrink-0"
          title="Add tag"
        >
          <PlusIcon className="w-3 h-3 stroke-[2]" />
          <span>{tags.length === 0 ? "Add tag" : "Tag"}</span>
        </button>
      )}
      {isEditing && suggestions.length > 0 && (
        <div className="absolute top-full left-0 mt-1 z-50">
          <SuggestionList
            items={suggestions}
            command={(tag) => {
              commitTag(tag);
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
            itemKey={(t) => t}
            renderItem={(t) => {
              const color = getTagColor(t, tagColors);
              return (
                <div className="flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0 shadow-xs"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-medium">#{t}</span>
                </div>
              );
            }}
            width="w-48"
            emptyText="No matching tags"
          />
        </div>
      )}
    </div>
  );
}
