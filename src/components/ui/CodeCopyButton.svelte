<script lang="ts">
  import { onDestroy } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { CheckIcon, CopyIcon } from "../icons";
  import { cn } from "../../lib/utils";

  interface Props {
    text: string;
    class?: string;
    iconClassName?: string;
    copyLabel?: string;
    copiedLabel?: string;
  }

  let {
    text,
    class: className = "",
    iconClassName = "w-3.5 h-3.5 stroke-[1.7]",
    copyLabel = "Copy",
    copiedLabel = "Copied",
  }: Props = $props();

  let copied = $state(false);
  let copyResetTimer: number | null = null;

  let isDisabled = $derived(!text || !text.trim());
  let copyA11yLabel = $derived(copyLabel.trim() || "Copy code");
  let copiedA11yLabel = $derived(copiedLabel.trim() || "Copied");

  onDestroy(() => {
    if (copyResetTimer !== null) {
      window.clearTimeout(copyResetTimer);
    }
  });

  async function handleCopy() {
    try {
      await invoke("copy_to_clipboard", { text });
      copied = true;

      if (copyResetTimer !== null) {
        window.clearTimeout(copyResetTimer);
      }

      copyResetTimer = window.setTimeout(() => {
        copied = false;
      }, 1500);
    } catch (error) {
      console.error("Failed to copy code block:", error);
    }
  }
</script>

<button
  onclick={handleCopy}
  class={cn(
    "inline-flex items-center gap-1 text-xs h-6 px-1.5 rounded transition-colors",
    "text-text-muted hover:text-text hover:bg-bg-emphasis cursor-pointer",
    "disabled:opacity-50 disabled:cursor-default",
    className
  )}
  type="button"
  title={copied ? copiedA11yLabel : copyA11yLabel}
  aria-label={copied ? copiedA11yLabel : copyA11yLabel}
  disabled={isDisabled}
>
  {#if copied}
    <CheckIcon class={iconClassName} />
    {#if copiedLabel}
      {copiedLabel}
    {/if}
  {:else}
    <CopyIcon class={iconClassName} />
    {#if copyLabel}
      {copyLabel}
    {/if}
  {/if}
</button>
