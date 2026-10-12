<script lang="ts">
  import { XIcon } from "../icons";
  import { shortcutCategories } from "../../lib/shortcuts";
  import { modalIn, modalOut, backdropIn, backdropOut } from "../../lib/motion";

  const modalCategories = shortcutCategories.filter(
    (c) => c.title !== "Settings"
  );

  interface Props {
    open: boolean;
    onclose: () => void;
  }

  let { open, onclose }: Props = $props();

  let dialogEl: HTMLDivElement | null = $state(null);
  let previousFocusEl: HTMLElement | null = null;

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopImmediatePropagation();
      onclose();
      return;
    }

    if (e.key === "Tab") {
      const focusable = dialogEl?.querySelectorAll<HTMLElement>(
        'button, a[href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  $effect(() => {
    if (!open) return;
    previousFocusEl = document.activeElement as HTMLElement | null;
    dialogEl?.focus();
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      previousFocusEl?.focus();
    };
  });
</script>

{#if open}
  <div
    bind:this={dialogEl}
    class="fixed inset-0 z-50 flex items-center justify-center"
    role="dialog"
    aria-modal="true"
    aria-labelledby="keyboard-shortcuts-title"
    tabindex={-1}
  >
    <!-- Backdrop -->
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div
      in:backdropIn
      out:backdropOut
      class="absolute inset-0 bg-text/50 backdrop-blur-sm"
      onclick={onclose}
    ></div>

    <!-- Modal -->
    <div
      in:modalIn
      out:modalOut
      class="relative w-full max-w-4xl max-h-[85vh] mx-4 bg-bg rounded-xl shadow-2xl border border-border overflow-hidden flex flex-col z-10"
    >
      <!-- Header -->
      <div class="flex items-center justify-between pl-5 pr-3 py-3 border-b border-border flex-none">
        <h2
          id="keyboard-shortcuts-title"
          class="text-lg font-medium text-text"
        >
          Shortcuts
        </h2>
        <button
          type="button"
          onclick={onclose}
          aria-label="Close"
          class="p-1 rounded-md text-text-muted hover:text-text hover:bg-bg-muted transition-colors cursor-pointer"
        >
          <XIcon class="w-4.5 h-4.5" />
        </button>
      </div>

      <!-- Content — 2-column grid -->
      <div class="overflow-y-auto p-5">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {#each modalCategories as category (category.title)}
            <div>
              <h3 class="font-medium text-text mb-3">{category.title}</h3>
              <div class="space-y-0.5">
                {#each category.shortcuts as shortcut (shortcut.description)}
                  <div class="flex items-center gap-3 py-1">
                    <div class="flex items-center gap-1.5 shrink-0">
                      {#each shortcut.keys as key (key)}
                        <kbd class="text-xs px-1.5 py-0.5 rounded-md bg-bg-muted text-text min-w-6.5 inline-flex items-center justify-center font-mono">
                          {key}
                        </kbd>
                      {/each}
                    </div>
                    <span class="text-sm text-text font-medium truncate">
                      {shortcut.description}
                    </span>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}
