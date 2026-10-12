<script lang="ts">
  import { CheckIcon, XIcon } from "../icons";
  import { IconButton } from "../ui";

  interface Props {
    initialLatex: string;
    onsubmit: (latex: string) => void;
    oncancel: () => void;
  }

  let { initialLatex, onsubmit, oncancel }: Props = $props();

  let latex = $state("");
  let textareaEl: HTMLTextAreaElement | null = $state(null);

  $effect(() => {
    latex = initialLatex;
  });

  $effect(() => {
    requestAnimationFrame(() => {
      textareaEl?.focus();
      textareaEl?.select();
    });
  });

  function handleSubmit() {
    onsubmit(latex);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      oncancel();
    } else if (e.key === "Tab") {
      e.stopPropagation();
    }
  }
</script>

<div class="flex flex-col gap-1.5 bg-bg border border-border rounded-lg shadow-md p-1.5 w-84">
  <textarea
    bind:this={textareaEl}
    bind:value={latex}
    onkeydown={handleKeyDown}
    placeholder="Enter KaTeX expression..."
    class="w-full h-30 resize-y rounded-md border border-border bg-bg px-2.5 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-accent/40"
  ></textarea>
  <div class="flex items-center justify-end gap-1 mr-0.5 mb-0.5">
    <IconButton
      type="button"
      onclick={handleSubmit}
      title="Apply (Cmd/Ctrl+Enter)"
      size="xs"
      variant="ghost"
    >
      <CheckIcon class="w-4.5 h-4.5 stroke-[1.5]" />
    </IconButton>
    <IconButton
      type="button"
      onclick={oncancel}
      title="Cancel"
      size="xs"
      variant="ghost"
    >
      <XIcon class="w-4.5 h-4.5 stroke-[1.5]" />
    </IconButton>
  </div>
</div>
