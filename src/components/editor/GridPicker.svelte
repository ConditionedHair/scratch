<script lang="ts">
  import { cn } from "../../lib/utils";

  interface Props {
    onselect: (rows: number, cols: number) => void;
  }

  let { onselect }: Props = $props();

  let hovered = $state({ row: 3, col: 3 });
</script>

<div class="grid grid-cols-5 gap-1">
  {#each Array.from({ length: 25 }) as _, i}
    {@const row = Math.floor(i / 5) + 1}
    {@const col = (i % 5) + 1}
    {@const isHighlighted = row <= hovered.row && col <= hovered.col}
    <button
      type="button"
      class={cn(
        "w-5.5 h-5.5 border rounded cursor-pointer transition-colors p-0",
        isHighlighted
          ? "bg-accent/20 border-accent/50"
          : "border-border hover:border-accent/50"
      )}
      onmouseenter={() => (hovered = { row, col })}
      onclick={() => onselect(row, col)}
      aria-label="{row} by {col} table"
    ></button>
  {/each}
</div>
<p class="text-xs text-center mt-2 text-text-muted">
  {hovered.row} × {hovered.col} table
</p>
