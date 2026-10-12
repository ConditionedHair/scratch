<script lang="ts">
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";
  import { cn } from "../../lib/utils";
  import Tooltip from "./Tooltip.svelte";

  interface Props extends HTMLButtonAttributes {
    isActive?: boolean;
    class?: string;
    title?: string;
    children?: Snippet;
  }

  let {
    isActive = false,
    class: className = "",
    title,
    children,
    type = "button",
    ...restProps
  }: Props = $props();
</script>

{#if title}
  <Tooltip content={title}>
    <button
      {type}
      class={cn(
        "h-7 w-7 flex items-center justify-center text-sm rounded transition-colors shrink-0 cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
        isActive
          ? "bg-bg-emphasis text-text font-medium shadow-xs"
          : "hover:bg-bg-muted text-text-muted hover:text-text",
        className
      )}
      tabindex={-1}
      aria-label={title}
      {...restProps}
    >
      {@render children?.()}
    </button>
  </Tooltip>
{:else}
  <button
    {type}
    class={cn(
      "h-7 w-7 flex items-center justify-center text-sm rounded transition-colors shrink-0 cursor-pointer",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1",
      isActive
        ? "bg-bg-emphasis text-text font-medium shadow-xs"
        : "hover:bg-bg-muted text-text-muted hover:text-text",
      className
    )}
    tabindex={-1}
    aria-label={title}
    {...restProps}
  >
    {@render children?.()}
  </button>
{/if}
