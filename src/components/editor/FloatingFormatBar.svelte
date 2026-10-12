<script lang="ts">
  import type { Editor as TiptapEditor } from "@tiptap/core";
  import { DropdownMenu } from "bits-ui";
  import Tooltip from "../ui/Tooltip.svelte";
  import GridPicker from "./GridPicker.svelte";
  import { cn } from "../../lib/utils";
  import { mod, alt, shift } from "../../lib/platform";
  import {
    BoldIcon,
    ItalicIcon,
    StrikethroughIcon,
    Heading1Icon,
    Heading2Icon,
    Heading3Icon,
    ListIcon,
    ListOrderedIcon,
    CheckSquareIcon,
    LinkIcon,
    QuoteIcon,
    InlineCodeIcon,
    CodeIcon,
    BlockMathIcon,
    SeparatorIcon,
    BracketsIcon,
    ImageIcon,
    TableIcon,
    MoreHorizontalIcon,
    ChevronRightIcon,
  } from "../icons";

  interface Props {
    editor: TiptapEditor;
    onAddLink: () => void;
    onAddBlockMath: () => void;
    onAddImage: () => void;
  }

  let { editor, onAddLink, onAddBlockMath, onAddImage }: Props = $props();

  let barEl: HTMLDivElement | null = $state(null);
  let isCompact = $state(false);
  let headingMenuOpen = $state(false);
  let listMenuOpen = $state(false);
  let moreMenuOpen = $state(false);
  let tableMenuOpen = $state(false);
  let selectionKey = $state(0);

  $effect(() => {
    if (!editor) return;
    const updateSelection = () => {
      selectionKey += 1;
    };

    editor.on("selectionUpdate", updateSelection);
    editor.on("transaction", updateSelection);

    return () => {
      editor.off("selectionUpdate", updateSelection);
      editor.off("transaction", updateSelection);
    };
  });

  $effect(() => {
    const parent = barEl?.parentElement;
    if (!parent) return;

    const checkWidth = () => {
      isCompact = parent.clientWidth < 700;
    };

    checkWidth();
    const observer = new ResizeObserver(checkWidth);
    observer.observe(parent);
    return () => observer.disconnect();
  });

  let activeHeadingLevel = $derived.by(() => {
    void selectionKey;
    if (editor.isActive("heading", { level: 1 })) return 1;
    if (editor.isActive("heading", { level: 2 })) return 2;
    if (editor.isActive("heading", { level: 3 })) return 3;
    return null;
  });

  let isBulletList = $derived.by(() => {
    void selectionKey;
    return editor.isActive("bulletList");
  });

  let isOrderedList = $derived.by(() => {
    void selectionKey;
    return editor.isActive("orderedList");
  });

  let isTaskList = $derived.by(() => {
    void selectionKey;
    return editor.isActive("taskList");
  });

  let isAnyList = $derived(isBulletList || isOrderedList || isTaskList);

  let isSecondaryActive = $derived.by(() => {
    void selectionKey;
    return (
      editor.isActive("blockquote") ||
      editor.isActive("code") ||
      editor.isActive("codeBlock") ||
      editor.isActive("blockMath") ||
      editor.isActive("table")
    );
  });
</script>

<div
  bind:this={barEl}
  class="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 p-1.5 rounded-full border border-border bg-bg-secondary/92 dark:bg-bg-secondary/95 backdrop-blur-md shadow-xl select-none max-w-[calc(100%-2.5rem)] overflow-x-auto scrollbar-none"
  role="toolbar"
  aria-label="Editor Formatting Toolbar"
>
  <!-- Text Styles -->
  <Tooltip content="Bold ({mod}+B)">
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleBold().run()}
      class={cn(
        "w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none",
        editor.isActive("bold")
          ? "bg-accent text-slate-950 font-bold scale-105 shadow-xs"
          : "bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
      )}
      aria-label="Bold"
    >
      <BoldIcon class="w-3.5 h-3.5 stroke-[2]" />
    </button>
  </Tooltip>

  <Tooltip content="Italic ({mod}+I)">
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleItalic().run()}
      class={cn(
        "w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none",
        editor.isActive("italic")
          ? "bg-accent text-slate-950 font-bold scale-105 shadow-xs"
          : "bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
      )}
      aria-label="Italic"
    >
      <ItalicIcon class="w-3.5 h-3.5 stroke-[2]" />
    </button>
  </Tooltip>

  <Tooltip content="Strikethrough ({mod}+{shift}+S)">
    <button
      type="button"
      onclick={() => editor.chain().focus().toggleStrike().run()}
      class={cn(
        "w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none",
        editor.isActive("strike")
          ? "bg-accent text-slate-950 font-bold scale-105 shadow-xs"
          : "bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
      )}
      aria-label="Strikethrough"
    >
      <StrikethroughIcon class="w-3.5 h-3.5 stroke-[2]" />
    </button>
  </Tooltip>

  <div class="w-px h-4 mx-0.5 bg-border shrink-0"></div>

  <!-- Headings Dropdown -->
  <DropdownMenu.Root bind:open={headingMenuOpen}>
    <Tooltip content="Headings ({mod}+{alt}+1/2/3)">
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <button
            {...props}
            type="button"
            class={cn(
              "w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none",
              activeHeadingLevel !== null
                ? "bg-accent text-slate-950 font-bold scale-105 shadow-xs"
                : "bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
            )}
            aria-label="Heading Options"
          >
            {activeHeadingLevel !== null ? `H${activeHeadingLevel}` : "H"}
          </button>
        {/snippet}
      </DropdownMenu.Trigger>
    </Tooltip>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        class="min-w-44 p-1 bg-bg-secondary border border-border rounded-xl shadow-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
        side="top"
        sideOffset={10}
      >
        <DropdownMenu.Item
          class={cn(
            "px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center justify-between transition-colors",
            activeHeadingLevel === 1
              ? "bg-accent/15 text-accent font-semibold"
              : "hover:bg-bg-muted focus:bg-bg-muted text-text"
          )}
          onSelect={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          <div class="flex items-center gap-2">
            <Heading1Icon class="w-3.5 h-3.5 stroke-[2]" />
            <span>Heading 1</span>
          </div>
          <span class="text-[10px] text-text-muted">{mod}+{alt}+1</span>
        </DropdownMenu.Item>
        <DropdownMenu.Item
          class={cn(
            "px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center justify-between transition-colors",
            activeHeadingLevel === 2
              ? "bg-accent/15 text-accent font-semibold"
              : "hover:bg-bg-muted focus:bg-bg-muted text-text"
          )}
          onSelect={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <div class="flex items-center gap-2">
            <Heading2Icon class="w-3.5 h-3.5 stroke-[2]" />
            <span>Heading 2</span>
          </div>
          <span class="text-[10px] text-text-muted">{mod}+{alt}+2</span>
        </DropdownMenu.Item>
        <DropdownMenu.Item
          class={cn(
            "px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center justify-between transition-colors",
            activeHeadingLevel === 3
              ? "bg-accent/15 text-accent font-semibold"
              : "hover:bg-bg-muted focus:bg-bg-muted text-text"
          )}
          onSelect={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <div class="flex items-center gap-2">
            <Heading3Icon class="w-3.5 h-3.5 stroke-[2]" />
            <span>Heading 3</span>
          </div>
          <span class="text-[10px] text-text-muted">{mod}+{alt}+3</span>
        </DropdownMenu.Item>
        {#if activeHeadingLevel !== null}
          <DropdownMenu.Separator class="h-px bg-border my-1" />
          <DropdownMenu.Item
            class="px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center gap-2 hover:bg-bg-muted focus:bg-bg-muted text-text-muted hover:text-text transition-colors"
            onSelect={() => editor.chain().focus().setParagraph().run()}
          >
            <span>Normal text</span>
          </DropdownMenu.Item>
        {/if}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>

  <div class="w-px h-4 mx-0.5 bg-border shrink-0"></div>

  <!-- Lists Dropdown -->
  <DropdownMenu.Root bind:open={listMenuOpen}>
    <Tooltip content="Lists (Bullet / Numbered / Task)">
      <DropdownMenu.Trigger>
        {#snippet child({ props })}
          <button
            {...props}
            type="button"
            class={cn(
              "w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none",
              isAnyList
                ? "bg-accent text-slate-950 font-bold scale-105 shadow-xs"
                : "bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
            )}
            aria-label="List Options"
          >
            {#if isTaskList}
              <CheckSquareIcon class="w-3.5 h-3.5 stroke-[2]" />
            {:else if isOrderedList}
              <ListOrderedIcon class="w-3.5 h-3.5 stroke-[2]" />
            {:else}
              <ListIcon class="w-3.5 h-3.5 stroke-[2]" />
            {/if}
          </button>
        {/snippet}
      </DropdownMenu.Trigger>
    </Tooltip>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        class="min-w-44 p-1 bg-bg-secondary border border-border rounded-xl shadow-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
        side="top"
        sideOffset={10}
      >
        <DropdownMenu.Item
          class={cn(
            "px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center justify-between transition-colors",
            isBulletList
              ? "bg-accent/15 text-accent font-semibold"
              : "hover:bg-bg-muted focus:bg-bg-muted text-text"
          )}
          onSelect={() => editor.chain().focus().toggleBulletList().run()}
        >
          <div class="flex items-center gap-2">
            <ListIcon class="w-3.5 h-3.5 stroke-[2]" />
            <span>Bullet List</span>
          </div>
          <span class="text-[10px] text-text-muted">{mod}+{shift}+8</span>
        </DropdownMenu.Item>
        <DropdownMenu.Item
          class={cn(
            "px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center justify-between transition-colors",
            isOrderedList
              ? "bg-accent/15 text-accent font-semibold"
              : "hover:bg-bg-muted focus:bg-bg-muted text-text"
          )}
          onSelect={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <div class="flex items-center gap-2">
            <ListOrderedIcon class="w-3.5 h-3.5 stroke-[2]" />
            <span>Numbered List</span>
          </div>
          <span class="text-[10px] text-text-muted">{mod}+{shift}+7</span>
        </DropdownMenu.Item>
        <DropdownMenu.Item
          class={cn(
            "px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center justify-between transition-colors",
            isTaskList
              ? "bg-accent/15 text-accent font-semibold"
              : "hover:bg-bg-muted focus:bg-bg-muted text-text"
          )}
          onSelect={() => editor.chain().focus().toggleTaskList().run()}
        >
          <div class="flex items-center gap-2">
            <CheckSquareIcon class="w-3.5 h-3.5 stroke-[2]" />
            <span>Task List</span>
          </div>
        </DropdownMenu.Item>
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>

  <div class="w-px h-4 mx-0.5 bg-border shrink-0"></div>

  <!-- Add Link - Always visible primary insert -->
  <Tooltip content="Add Link ({mod}+K)">
    <button
      type="button"
      onclick={onAddLink}
      class={cn(
        "w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none",
        editor.isActive("link")
          ? "bg-accent text-slate-950 font-bold scale-105 shadow-xs"
          : "bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
      )}
      aria-label="Add Link"
    >
      <LinkIcon class="w-3.5 h-3.5 stroke-[2]" />
    </button>
  </Tooltip>

  <!-- Secondary Tools: Shown directly when wide, collapsed into More (...) when compact -->
  {#if !isCompact}
    <Tooltip content="Blockquote ({mod}+{shift}+B)">
      <button
        type="button"
        onclick={() => editor.chain().focus().toggleBlockquote().run()}
        class={cn(
          "w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none",
          editor.isActive("blockquote")
            ? "bg-accent text-slate-950 font-bold scale-105 shadow-xs"
            : "bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
        )}
        aria-label="Blockquote"
      >
        <QuoteIcon class="w-3.5 h-3.5 stroke-[2]" />
      </button>
    </Tooltip>

    <div class="w-px h-4 mx-0.5 bg-border shrink-0"></div>

    <Tooltip content="Inline Code ({mod}+E)">
      <button
        type="button"
        onclick={() => editor.chain().focus().toggleCode().run()}
        class={cn(
          "w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none",
          editor.isActive("code")
            ? "bg-accent text-slate-950 font-bold scale-105 shadow-xs"
            : "bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
        )}
        aria-label="Inline Code"
      >
        <InlineCodeIcon class="w-3.5 h-3.5 stroke-[2]" />
      </button>
    </Tooltip>

    <Tooltip content="Code Block ({mod}+{alt}+C)">
      <button
        type="button"
        onclick={() => editor.chain().focus().toggleCodeBlock().run()}
        class={cn(
          "w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none",
          editor.isActive("codeBlock")
            ? "bg-accent text-slate-950 font-bold scale-105 shadow-xs"
            : "bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
        )}
        aria-label="Code Block"
      >
        <CodeIcon class="w-3.5 h-3.5 stroke-[2]" />
      </button>
    </Tooltip>

    <Tooltip content="Block Math">
      <button
        type="button"
        onclick={onAddBlockMath}
        class={cn(
          "w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none",
          editor.isActive("blockMath")
            ? "bg-accent text-slate-950 font-bold scale-105 shadow-xs"
            : "bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
        )}
        aria-label="Block Math"
      >
        <BlockMathIcon class="w-3.5 h-3.5 stroke-[2]" />
      </button>
    </Tooltip>

    <Tooltip content="Horizontal Rule">
      <button
        type="button"
        onclick={() => editor.chain().focus().setHorizontalRule().run()}
        class="w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
        aria-label="Horizontal Rule"
      >
        <SeparatorIcon class="w-3.5 h-3.5 stroke-[2]" />
      </button>
    </Tooltip>

    <div class="w-px h-4 mx-0.5 bg-border shrink-0"></div>

    <Tooltip content="Insert Wikilink ([[])">
      <button
        type="button"
        onclick={() => editor.chain().focus().insertContent("[[").run()}
        class="w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
        aria-label="Insert Wikilink"
      >
        <BracketsIcon class="w-3.5 h-3.5 stroke-[2]" />
      </button>
    </Tooltip>

    <Tooltip content="Add Image">
      <button
        type="button"
        onclick={onAddImage}
        class="w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
        aria-label="Add Image"
      >
        <ImageIcon class="w-3.5 h-3.5 stroke-[2]" />
      </button>
    </Tooltip>

    <DropdownMenu.Root bind:open={tableMenuOpen}>
      <Tooltip content="Insert Table">
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <button
              {...props}
              type="button"
              class={cn(
                "w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none",
                editor.isActive("table")
                  ? "bg-accent text-slate-950 font-bold scale-105 shadow-xs"
                  : "bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
              )}
              aria-label="Insert Table"
            >
              <TableIcon class="w-3.5 h-3.5 stroke-[2]" />
            </button>
          {/snippet}
        </DropdownMenu.Trigger>
      </Tooltip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          class="p-2.5 bg-bg-secondary border border-border rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
          side="top"
          sideOffset={10}
        >
          <GridPicker
            onselect={(rows, cols) => {
              editor
                .chain()
                .focus()
                .insertTable({
                  rows,
                  cols,
                  withHeaderRow: true,
                })
                .run();
              tableMenuOpen = false;
            }}
          />
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  {:else}
    <!-- Compact Mode: More (...) Overflow Menu -->
    <DropdownMenu.Root bind:open={moreMenuOpen}>
      <Tooltip content="More formatting tools">
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <button
              {...props}
              type="button"
              class={cn(
                "w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-semibold transition-all shrink-0 cursor-pointer shadow-2xs select-none",
                isSecondaryActive
                  ? "bg-accent/20 text-accent font-bold"
                  : "bg-bg text-text-muted hover:text-text hover:bg-bg-emphasis active:scale-95"
              )}
              aria-label="More Options"
            >
              <MoreHorizontalIcon class="w-3.5 h-3.5 stroke-[2]" />
            </button>
          {/snippet}
        </DropdownMenu.Trigger>
      </Tooltip>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          class="min-w-48 p-1 bg-bg-secondary border border-border rounded-xl shadow-xl z-50 text-xs animate-in fade-in zoom-in-95 duration-150"
          side="top"
          sideOffset={10}
        >
          <DropdownMenu.Item
            class={cn(
              "px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center justify-between transition-colors",
              editor.isActive("blockquote")
                ? "bg-accent/15 text-accent font-semibold"
                : "hover:bg-bg-muted focus:bg-bg-muted text-text"
            )}
            onSelect={() => editor.chain().focus().toggleBlockquote().run()}
          >
            <div class="flex items-center gap-2">
              <QuoteIcon class="w-3.5 h-3.5 stroke-[2]" />
              <span>Blockquote</span>
            </div>
            <span class="text-[10px] text-text-muted">{mod}+{shift}+B</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            class={cn(
              "px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center justify-between transition-colors",
              editor.isActive("code")
                ? "bg-accent/15 text-accent font-semibold"
                : "hover:bg-bg-muted focus:bg-bg-muted text-text"
            )}
            onSelect={() => editor.chain().focus().toggleCode().run()}
          >
            <div class="flex items-center gap-2">
              <InlineCodeIcon class="w-3.5 h-3.5 stroke-[2]" />
              <span>Inline Code</span>
            </div>
            <span class="text-[10px] text-text-muted">{mod}+E</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            class={cn(
              "px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center justify-between transition-colors",
              editor.isActive("codeBlock")
                ? "bg-accent/15 text-accent font-semibold"
                : "hover:bg-bg-muted focus:bg-bg-muted text-text"
            )}
            onSelect={() => editor.chain().focus().toggleCodeBlock().run()}
          >
            <div class="flex items-center gap-2">
              <CodeIcon class="w-3.5 h-3.5 stroke-[2]" />
              <span>Code Block</span>
            </div>
            <span class="text-[10px] text-text-muted">{mod}+{alt}+C</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            class={cn(
              "px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center gap-2 transition-colors",
              editor.isActive("blockMath")
                ? "bg-accent/15 text-accent font-semibold"
                : "hover:bg-bg-muted focus:bg-bg-muted text-text"
            )}
            onSelect={onAddBlockMath}
          >
            <BlockMathIcon class="w-3.5 h-3.5 stroke-[2]" />
            <span>Block Math</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            class="px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center gap-2 hover:bg-bg-muted focus:bg-bg-muted text-text transition-colors"
            onSelect={() => editor.chain().focus().setHorizontalRule().run()}
          >
            <SeparatorIcon class="w-3.5 h-3.5 stroke-[2]" />
            <span>Horizontal Rule</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator class="h-px bg-border my-1" />

          <DropdownMenu.Item
            class="px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center justify-between hover:bg-bg-muted focus:bg-bg-muted text-text transition-colors"
            onSelect={() => editor.chain().focus().insertContent("[[").run()}
          >
            <div class="flex items-center gap-2">
              <BracketsIcon class="w-3.5 h-3.5 stroke-[2]" />
              <span>Insert Wikilink</span>
            </div>
            <span class="text-[10px] text-text-muted">[[</span>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            class="px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center gap-2 hover:bg-bg-muted focus:bg-bg-muted text-text transition-colors"
            onSelect={onAddImage}
          >
            <ImageIcon class="w-3.5 h-3.5 stroke-[2]" />
            <span>Add Image</span>
          </DropdownMenu.Item>

          <!-- Table Submenu -->
          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger
              class={cn(
                "px-2.5 py-1.5 rounded-lg cursor-pointer outline-none flex items-center justify-between transition-colors",
                editor.isActive("table")
                  ? "bg-accent/15 text-accent font-semibold"
                  : "hover:bg-bg-muted focus:bg-bg-muted text-text"
              )}
            >
              <div class="flex items-center gap-2">
                <TableIcon class="w-3.5 h-3.5 stroke-[2]" />
                <span>Insert Table</span>
              </div>
              <ChevronRightIcon class="w-3.5 h-3.5 text-text-muted" />
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                class="p-2.5 bg-bg-secondary border border-border rounded-xl shadow-xl z-50 animate-in fade-in zoom-in-95 duration-150"
                sideOffset={6}
              >
                <GridPicker
                  onselect={(rows, cols) => {
                    editor
                      .chain()
                      .focus()
                      .insertTable({
                        rows,
                        cols,
                        withHeaderRow: true,
                      })
                      .run();
                    moreMenuOpen = false;
                  }}
                />
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  {/if}

  <div class="w-px h-4 mx-0.5 bg-border shrink-0"></div>

  <!-- Signal Yellow Return Key -->
  <Tooltip content="New Paragraph (↵)">
    <button
      type="button"
      onclick={() => editor.chain().focus().splitBlock().run()}
      class="w-7.5 h-7.5 rounded-full flex items-center justify-center text-xs font-bold text-slate-950 bg-accent hover:brightness-110 active:scale-95 transition-all shadow-xs cursor-pointer shrink-0"
      aria-label="New Paragraph"
    >
      ↵
    </button>
  </Tooltip>
</div>
