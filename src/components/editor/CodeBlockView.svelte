<script lang="ts">
  import { SUPPORTED_LANGUAGES } from "./lowlight";
  import MermaidRenderer from "./MermaidRenderer.svelte";
  import { ChevronDownIcon, PencilIcon, EyeIcon } from "../icons";
  import CodeCopyButton from "../ui/CodeCopyButton.svelte";

  const btnClass =
    "code-block-mermaid-btn inline-flex items-center gap-1 text-xs h-6 px-1.5 text-text-muted rounded cursor-pointer transition-colors hover:text-text hover:bg-bg-emphasis";

  interface Props {
    controller: {
      node: any;
      updateAttributes: (attrs: Record<string, any>) => void;
      onPreviewToggle?: (showingPreview: boolean) => void;
    };
  }

  let { controller }: Props = $props();

  let language = $derived(controller.node?.attrs?.language || "");
  let isMermaid = $derived(language === "mermaid");
  let codeContent = $derived(controller.node?.textContent || "");
  let showSource = $state(false);

  $effect(() => {
    if (!codeContent.trim()) {
      showSource = true;
    }
  });

  $effect(() => {
    const isPreview = isMermaid && !showSource;
    controller.onPreviewToggle?.(isPreview);
  });

  function handleLanguageChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    controller.updateAttributes({ language: val });
  }
</script>

<div class="code-block-wrapper {isMermaid ? 'mermaid-wrapper' : ''}">
  <div class="code-block-language-selector" contenteditable="false">
    <CodeCopyButton text={codeContent} class={btnClass} />
    {#if isMermaid}
      <button
        contenteditable="false"
        onclick={() => (showSource = !showSource)}
        class={btnClass}
        type="button"
      >
        {#if showSource}
          <EyeIcon class="w-3.5 h-3.5 stroke-[1.7]" />
          Preview
        {:else}
          <PencilIcon class="w-4 h-4 stroke-[1.6]" />
          Edit
        {/if}
      </button>
    {/if}
    <div class="relative flex items-center h-6">
      <select
        value={language}
        onchange={handleLanguageChange}
        class="appearance-none bg-transparent text-text-muted text-xs h-6 cursor-pointer outline-none pr-4 pl-1.5 rounded hover:bg-bg-emphasis transition-colors"
      >
        {#each SUPPORTED_LANGUAGES as lang (lang.value)}
          <option value={lang.value}>
            {lang.label}
          </option>
        {/each}
      </select>
      <ChevronDownIcon class="w-3.25 h-3.25 stroke-[1.7] absolute right-1.25 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted" />
    </div>
  </div>

  {#if isMermaid && !showSource}
    <div
      contenteditable="false"
      class="mermaid-preview rounded-lg bg-bg-muted p-4 my-1"
    >
      <MermaidRenderer code={codeContent} />
    </div>
  {/if}
</div>
