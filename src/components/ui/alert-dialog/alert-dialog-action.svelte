<script lang="ts">
  import type { Snippet } from "svelte";
  import { AlertDialog } from "bits-ui";
  import { cn } from "../../../lib/utils";

  interface Props {
    class?: string;
    children?: Snippet;
    onclick?: (e: MouseEvent) => void;
    disabled?: boolean;
  }

  let { class: className = "", children, onclick, disabled = false, ...restProps }: Props = $props();
</script>

<AlertDialog.Action
  {onclick}
  {disabled}
  class={cn(
    "inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors",
    "focus-visible:outline focus-visible:outline-accent",
    "disabled:pointer-events-none disabled:opacity-50 cursor-pointer",
    "h-8 px-3 text-sm bg-accent text-text-inverse hover:bg-accent/90 rounded-md",
    className
  )}
  {...restProps}
>
  {@render children?.()}
</AlertDialog.Action>
