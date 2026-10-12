<script lang="ts">
  import { defaultThemeColors } from "../../context/theme.svelte";
  import { Button, ColorPicker } from "../ui";
  import { ChevronRightIcon } from "../icons";
  import { cn } from "../../lib/utils";
  import type { ThemeColorKey } from "../../types/note";

  interface Props {
    label: string;
    mode: "light" | "dark";
    customColors: Partial<Record<ThemeColorKey, string>>;
    setCustomColor: (
      mode: "light" | "dark",
      key: ThemeColorKey,
      value: string
    ) => void;
    resetCustomColor: (mode: "light" | "dark", key: ThemeColorKey) => void;
    resetAllCustomColors: (mode: "light" | "dark") => void;
    class?: string;
  }

  let {
    label,
    mode,
    customColors,
    setCustomColor,
    resetCustomColor,
    resetAllCustomColors,
    class: className = "",
  }: Props = $props();

  const colorLabels: { key: ThemeColorKey; label: string; group: string }[] = [
    // Surfaces
    { key: "bg", label: "Background", group: "Surfaces" },
    { key: "bg-secondary", label: "Sidebar", group: "Surfaces" },
    { key: "bg-muted", label: "Hover & Subtle Fill", group: "Surfaces" },
    { key: "bg-emphasis", label: "Strong Fill", group: "Surfaces" },
    // Text & UI
    { key: "text", label: "Text", group: "Text & UI" },
    { key: "text-muted", label: "Secondary Text", group: "Text & UI" },
    { key: "accent", label: "Primary & Buttons", group: "Text & UI" },
    { key: "border", label: "Borders", group: "Text & UI" },
    { key: "selection", label: "Selection Highlight", group: "Text & UI" },
  ];

  let defaults = $derived(defaultThemeColors[mode]);
  let hasAnyCustom = $derived(Object.keys(customColors).length > 0);

  // Group color items
  const groupedColors = $derived.by(() => {
    const groups: { group: string; items: { key: ThemeColorKey; label: string }[] }[] = [];
    let currentGroup = "";
    let currentItems: { key: ThemeColorKey; label: string }[] = [];

    for (const item of colorLabels) {
      if (item.group !== currentGroup) {
        if (currentItems.length > 0) {
          groups.push({ group: currentGroup, items: currentItems });
        }
        currentGroup = item.group;
        currentItems = [{ key: item.key, label: item.label }];
      } else {
        currentItems.push({ key: item.key, label: item.label });
      }
    }
    if (currentItems.length > 0) {
      groups.push({ group: currentGroup, items: currentItems });
    }
    return groups;
  });
</script>

<details class={cn("text-sm", className)}>
  <summary class="cursor-pointer text-text-muted hover:text-text select-none flex items-center gap-1 font-medium">
    <ChevronRightIcon class="w-3.5 h-3.5 stroke-2 transition-transform [[open]>&]:rotate-90" />
    {label}
    {#if hasAnyCustom}
      <Button
        onclick={(e) => {
          e.preventDefault();
          resetAllCustomColors(mode);
        }}
        variant="ghost"
        size="sm"
        class="ml-auto"
      >
        Reset all
      </Button>
    {/if}
  </summary>
  <div class="mt-2 rounded-[10px] border border-border pl-4 py-3 pr-3 space-y-1.5">
    {#each groupedColors as grp, grpIdx}
      <div class={`text-base text-text-muted font-medium ${grpIdx > 0 ? "mt-6" : ""} mb-2.5`}>
        {grp.group}
      </div>
      {#each grp.items as item (item.key)}
        <div class="flex items-center justify-between">
          <span class="text-sm text-text font-medium">
            {item.label}
          </span>
          <ColorPicker
            color={customColors[item.key] ?? defaults[item.key]}
            defaultColor={defaults[item.key]}
            onchange={(value: string) => setCustomColor(mode, item.key, value)}
            onreset={() => resetCustomColor(mode, item.key)}
          />
        </div>
      {/each}
    {/each}
  </div>
</details>
