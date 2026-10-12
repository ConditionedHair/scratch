<script lang="ts">
  import { colord } from "colord";
  import { cn } from "../../lib/utils";

  interface Props {
    color: string;
    defaultColor: string;
    onchange: (color: string) => void;
    onreset: () => void;
  }

  let {
    color,
    defaultColor,
    onchange,
    onreset,
  }: Props = $props();

  let isOpen = $state(false);
  let hexDraft = $state("");
  let popoverEl: HTMLDivElement | null = $state(null);
  let swatchEl: HTMLButtonElement | null = $state(null);

  let parsed = $derived(colord(color).toRgb());
  let parsedDefault = $derived(colord(defaultColor).toRgb());

  let isCustom = $derived(
    parsed.r !== parsedDefault.r ||
    parsed.g !== parsedDefault.g ||
    parsed.b !== parsedDefault.b ||
    Math.abs(parsed.a - parsedDefault.a) >= 0.01
  );

  let hex6 = $derived(
    colord({ r: parsed.r, g: parsed.g, b: parsed.b }).toHex().toUpperCase()
  );

  $effect(() => {
    hexDraft = hex6.replace(/^#/, "");
  });

  function handleOutsideClick(e: MouseEvent) {
    if (!isOpen) return;
    const target = e.target as Node;
    if (
      popoverEl &&
      !popoverEl.contains(target) &&
      swatchEl &&
      !swatchEl.contains(target)
    ) {
      isOpen = false;
    }
  }

  function handleNativeColorChange(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    const newColor = colord(val).alpha(parsed.a);
    onchange(parsed.a < 1 ? newColor.toRgbString() : newColor.toHex());
  }

  function handleHexInput(e: Event) {
    const raw = (e.target as HTMLInputElement).value.replace(/[^0-9a-fA-F]/g, "").slice(0, 6);
    hexDraft = raw.toUpperCase();
    if (raw.length === 6) {
      const newColor = colord(`#${raw}`).alpha(parsed.a);
      onchange(parsed.a < 1 ? newColor.toRgbString() : newColor.toHex());
    }
  }

  function handleOpacityInput(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!Number.isFinite(val)) return;
    const clamped = Math.min(Math.max(val, 0), 100);
    const newColor = colord({ r: parsed.r, g: parsed.g, b: parsed.b, a: clamped / 100 });
    onchange(clamped < 100 ? newColor.toRgbString() : newColor.toHex());
  }
</script>

<svelte:window onmousedown={handleOutsideClick} />

<div class="relative">
  <button
    bind:this={swatchEl}
    onclick={() => (isOpen = !isOpen)}
    class={cn(
      "w-6.5 h-6.5 rounded-md border transition-colors cursor-pointer",
      isOpen ? "border-accent" : "border-border hover:border-text-muted"
    )}
    style:background-color={color}
    aria-label="Pick color"
    type="button"
  ></button>

  {#if isOpen}
    <div
      bind:this={popoverEl}
      class="absolute right-0 top-10 z-50 bg-bg border border-border rounded-lg shadow-lg p-3 flex flex-col gap-3 min-w-56"
    >
      <input
        type="color"
        value={hex6}
        oninput={handleNativeColorChange}
        class="w-full h-24 rounded-md cursor-pointer border border-border bg-transparent p-0 block"
      />
      <div class="flex items-center gap-2">
        <div class="relative flex-1">
          <span class="absolute left-2 top-1/2 -translate-y-1/2 text-sm text-text-muted font-mono">
            #
          </span>
          <input
            type="text"
            value={hexDraft}
            oninput={handleHexInput}
            class="w-full h-8 rounded-md border border-border bg-bg pl-5 pr-2 text-sm text-text font-mono uppercase focus:outline-none focus:border-accent"
            maxlength={6}
            spellcheck={false}
          />
        </div>
        <div class="relative w-16">
          <input
            type="number"
            min="0"
            max="100"
            value={Math.round(parsed.a * 100)}
            oninput={handleOpacityInput}
            class="w-full h-8 rounded-md border border-border bg-bg pl-2 pr-6 text-sm text-text font-mono text-center focus:outline-none focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span class="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-text-muted font-mono">
            %
          </span>
        </div>
      </div>
      {#if isCustom}
        <button
          type="button"
          onclick={() => {
            onreset();
            isOpen = false;
          }}
          class="text-xs text-text-muted hover:text-text transition-colors cursor-pointer text-left"
        >
          Reset to default
        </button>
      {/if}
    </div>
  {/if}
</div>
