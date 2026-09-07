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
import { SuggestionList } from "./SuggestionList";
import { PlusIcon, XIcon } from "../icons";
import { cn } from "../../lib/utils";

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
      className="flex items-center gap-1 font-mono text-[10px] uppercase font-semibold px-2 py-0.5 rounded border border-border/40 leading-none cursor-grab active:cursor-grabbing touch-none tracking-wider shadow-xs"
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: color }}
      />
      {tag}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="hover:opacity-70 ml-0.5 cursor-pointer"
        tabIndex={-1}
        aria-label={`Remove tag ${tag}`}
      >
        <XIcon className="w-2.5 h-2.5 stroke-[2]" />
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
    if (!query) return [];
    return allTagNames.filter(
      (t) => t.toLowerCase().includes(query) && !tags.includes(t),
    );
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
      const tag = rawTag.trim();
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
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        commitTag(inputValue);
      } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
        removeTag(tags[tags.length - 1]);
      } else if (e.key === "Escape") {
        setInputValue("");
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

  return (
    <div className="relative flex items-center gap-1 flex-wrap min-w-0">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={tags} strategy={horizontalListSortingStrategy}>
          {tags.map((tag) => (
            <SortableTagPill
              key={tag}
              tag={tag}
              color={getTagColor(tag, tagColors)}
              onRemove={() => removeTag(tag)}
            />
          ))}
        </SortableContext>
      </DndContext>
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (!inputValue) setIsEditing(false);
          }}
          placeholder="Add tag..."
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          className="text-xs bg-transparent outline-none text-text placeholder-text-muted/50 min-w-16 w-24"
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setIsEditing(true);
            requestAnimationFrame(() => inputRef.current?.focus());
          }}
          className={cn(
            "flex items-center gap-0.5 text-2xs text-text-muted hover:text-text px-1 py-0.5 rounded transition-colors",
          )}
          title="Add tag"
        >
          <PlusIcon className="w-3 h-3 stroke-[1.6]" />
          {tags.length === 0 && <span>Tag</span>}
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
            renderItem={(t) => <span className="text-sm">{t}</span>}
            width="w-48"
            emptyText="No matching tags"
          />
        </div>
      )}
    </div>
  );
}
