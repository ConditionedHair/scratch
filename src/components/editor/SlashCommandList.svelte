<script lang="ts">
  import type { SlashCommandItem } from "./SlashCommand";
  import { cn } from "../../lib/utils";

  interface Props {
    controller?: {
      items: SlashCommandItem[];
      command: (item: SlashCommandItem) => void;
    };
    items?: SlashCommandItem[];
    command?: (item: SlashCommandItem) => void;
  }

  let { controller, items: propItems, command: propCommand }: Props = $props();

  let activeItems = $derived(controller?.items ?? propItems ?? []);
  let activeCommand = $derived(controller?.command ?? propCommand ?? (() => {}));

  let selectedIndex = $state(0);
  let listEl: HTMLDivElement | null = $state(null);

  $effect(() => {
    // Reset selection when items change
    void activeItems;
    selectedIndex = 0;
  });

  $effect(() => {
    const el = listEl?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  });

  export function onKeyDown({ event }: { event: KeyboardEvent }): boolean {
    if (event.key === "ArrowUp") {
      selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : activeItems.length - 1;
      return true;
    }
    if (event.key === "ArrowDown") {
      selectedIndex = selectedIndex < activeItems.length - 1 ? selectedIndex + 1 : 0;
      return true;
    }
    if (event.key === "Enter") {
      if (activeItems[selectedIndex]) {
        activeCommand(activeItems[selectedIndex]);
      }
      return true;
    }
    return false;
  }
</script>

{#if activeItems.length === 0}
  <div class="bg-bg border border-border rounded-lg shadow-lg p-2 w-64">
    <div class="text-sm text-text-muted px-3 py-2">No results</div>
  </div>
{:else}
  <div
    bind:this={listEl}
    class="bg-bg border border-border rounded-lg shadow-lg p-1.5 max-h-80 overflow-y-auto flex flex-col gap-0.5 w-64"
  >
    {#each activeItems as item, index (item.title)}
      <button
        type="button"
        data-index={index}
        tabindex={-1}
        onclick={() => activeCommand(item)}
        class={cn(
          "w-full text-left p-2 rounded-md transition-colors cursor-pointer",
          selectedIndex === index
            ? "bg-bg-muted text-text"
            : "text-text hover:bg-bg-muted"
        )}
      >
        <div class="flex items-center gap-3">
          <div class="shrink-0 text-text-muted [&_svg]:stroke-[1.5]">
            {#if item.icon}
              {@const Icon = item.icon}
              <Icon class="w-4 h-4 stroke-[1.5]" />
            {/if}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-sm leading-snug font-medium truncate">
              {item.title}
            </span>
          </div>
        </div>
      </button>
    {/each}
  </div>
{/if}
