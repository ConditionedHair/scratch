<script lang="ts">
  import { cn } from "../../lib/utils";
  import { PinIcon } from "../icons";
  import { getTagColor, tagPillCss } from "../../lib/tags";

  const MAX_VISIBLE_TAGS = 3;

  interface Props {
    title: string;
    subtitle?: string;
    meta?: string;
    isSelected?: boolean;
    isPinned?: boolean;
    tags?: string[];
    tagColors?: Record<string, string>;
    onclick?: () => void;
    oncontextmenu?: (e: MouseEvent) => void;
  }

  let {
    title,
    subtitle,
    meta,
    isSelected = false,
    isPinned = false,
    tags,
    tagColors,
    onclick,
    oncontextmenu,
  }: Props = $props();

  let cleanSubtitle = $derived(
    subtitle
      ?.replace(/&nbsp;/g, " ")
      .replace(/\u00A0/g, " ")
      .trim()
  );
  let hasSubtitle = $derived(!!cleanSubtitle && cleanSubtitle.length > 0);
</script>

<div
  {onclick}
  {oncontextmenu}
  onkeydown={(e) => {
    if (e.key === "Enter" || e.key === " ") {
      onclick?.();
    }
  }}
  role="button"
  tabindex={-1}
  class={cn(
    "w-full text-left px-3 py-2.5 transition-all cursor-pointer select-none rounded-xl border",
    "focus:outline-none focus-visible:outline-none",
    isSelected
      ? "bg-bg border-border shadow-xs"
      : "bg-transparent border-transparent hover:bg-bg/50 hover:border-border/30 text-text"
  )}
>
  <div class="flex items-center justify-between gap-2">
    <div class="flex items-center gap-1.5 min-w-0">
      {#if isPinned}
        <PinIcon class="w-3.5 h-3.5 stroke-[1.6] fill-current text-accent shrink-0" />
      {/if}
      <span class="text-xs font-semibold truncate text-text">
        {title}
      </span>
    </div>
    {#if isSelected}
      <span class="w-2 h-2 rounded-full shrink-0 bg-accent shadow-xs"></span>
    {/if}
  </div>
  <div class="flex items-center gap-1.5 shrink-0 mt-0.5">
    {#if meta}
      <div
        class={cn(
          "text-[11px] whitespace-nowrap font-mono",
          isSelected ? "text-text-muted font-medium" : "text-text-muted/80"
        )}
      >
        {meta}
      </div>
    {/if}
    <p
      class={cn(
        "text-xs line-clamp-1 min-h-5",
        hasSubtitle ? "text-text-muted" : "text-transparent",
        isSelected ? "opacity-100" : "opacity-75"
      )}
    >
      {hasSubtitle ? cleanSubtitle : "\u00A0"}
    </p>
  </div>
  {#if tags && tags.length > 0}
    <div class="flex items-center gap-1 flex-wrap mt-1">
      {#each tags.slice(0, MAX_VISIBLE_TAGS) as tag (tag)}
        <span
          style={tagPillCss(getTagColor(tag, tagColors))}
          class="text-2xs px-1.5 py-0.5 rounded-full font-medium leading-none"
        >
          {tag}
        </span>
      {/each}
      {#if tags.length > MAX_VISIBLE_TAGS}
        <span class="text-2xs px-1.5 py-0.5 rounded-full font-medium leading-none bg-bg-muted text-text-muted">
          +{tags.length - MAX_VISIBLE_TAGS}
        </span>
      {/if}
    </div>
  {/if}
</div>
