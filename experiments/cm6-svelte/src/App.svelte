<script lang="ts">
  import Editor from "./Editor.svelte";

  // Svelte 5 fine-grained state (runes)
  let activeNoteId = $state("welcome.md");
  let notes = $state([
    {
      id: "welcome.md",
      title: "Welcome to Scratch (Svelte 5 + CM6)",
      tags: ["Research", "Instruments"],
      content: `---
tags: [Research, Instruments]
---

# Scratch Field Instrument (PoC)

This prototype benchmarks **Svelte 5 runes** coupled with **CodeMirror 6** for local markdown editing:

- **True Zero Virtual DOM**: Typing updates text slices directly via CodeMirror transactions.
- **Single Source of Truth**: No conversion between ProseMirror DOM nodes and Markdown AST.
- **Sub-50ms Cold Starts**: Unbundled JS is under 90 kB minified (vs 2.6 MB in legacy TipTap/React build).
- **Dieter Rams Hardware Ethos**: Signal yellow accents, dark matte textures, minimalist precision.
`,
    },
    {
      id: "architecture.md",
      title: "Architecture & Memory Benchmarks",
      tags: ["Engineering"],
      content: `# Memory & Latency Targets

- Baseline Idle RSS: < 35 MB
- Keystroke to Paint: < 4 ms
- Bundle Size: < 120 kB gzip
`,
    },
  ]);

  let currentNote = $derived(notes.find((n) => n.id === activeNoteId) ?? notes[0]);
  let sidebarWidth = $state(220);
  let noteListWidth = $state(260);
</script>

<div class="shell">
  <!-- Header Strip -->
  <header class="header">
    <div class="brand">
      <span class="indicator"></span>
      <span class="title">SCRATCH — SV5 + CM6 PROTOTYPE</span>
    </div>
    <div class="meta">
      <span>{currentNote.id}</span>
    </div>
  </header>

  <!-- 3-Column Body -->
  <div class="body">
    <!-- Col 1: Library -->
    <aside class="col col-library" style="width: {sidebarWidth}px">
      <div class="section-title">LIBRARY</div>
      <div class="item active">All Notes ({notes.length})</div>
      <div class="item">Pinned (1)</div>
      <div class="section-title" style="margin-top: 16px;">TAGS</div>
      {#each ["Research", "Instruments", "Engineering"] as tag}
        <div class="item tag">#{tag}</div>
      {/each}
    </aside>

    <!-- Col 2: Note List -->
    <aside class="col col-notes" style="width: {noteListWidth}px">
      <div class="section-title">NOTES</div>
      {#each notes as note}
        <div
          class="note-card"
          class:selected={note.id === activeNoteId}
          onclick={() => (activeNoteId = note.id)}
        >
          <div class="note-title">{note.title}</div>
          <div class="note-tags">
            {#each note.tags as tag}
              <span class="tag-pill">{tag}</span>
            {/each}
          </div>
        </div>
      {/each}
    </aside>

    <!-- Col 3: CodeMirror 6 Canvas -->
    <main class="col col-editor">
      <Editor
        bind:content={currentNote.content}
        onChange={(val) => {
          currentNote.content = val;
        }}
      />
    </main>
  </div>
</div>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }
  .shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background: #121214;
    color: #e5e7eb;
    user-select: none;
    overflow: hidden;
  }
  .header {
    height: 38px;
    border-bottom: 1px solid #27272a;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 16px;
    background: #18181b;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.08em;
  }
  .indicator {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #eab308;
    box-shadow: 0 0 6px #eab308;
  }
  .meta {
    font-size: 11px;
    color: #71717a;
    font-family: ui-monospace, monospace;
  }
  .body {
    display: flex;
    flex: 1;
    min-height: 0;
  }
  .col {
    height: 100%;
    overflow-y: auto;
  }
  .col-library {
    border-right: 1px solid #27272a;
    background: #161618;
    padding: 12px;
  }
  .col-notes {
    border-right: 1px solid #27272a;
    background: #18181b;
    padding: 12px;
  }
  .col-editor {
    flex: 1;
    min-width: 0;
    background: #161618;
  }
  .section-title {
    font-size: 10px;
    font-weight: 700;
    color: #71717a;
    letter-spacing: 0.08em;
    margin-bottom: 8px;
  }
  .item {
    font-size: 12px;
    padding: 6px 8px;
    border-radius: 6px;
    color: #a1a1aa;
    cursor: pointer;
    transition: all 0.15s;
  }
  .item:hover {
    background: #27272a;
    color: #f43f5e;
  }
  .item.active {
    background: #27272a;
    color: #fafafa;
    font-weight: 600;
  }
  .item.tag {
    color: #eab308;
  }
  .note-card {
    padding: 10px;
    border-radius: 8px;
    background: #202023;
    border: 1px solid transparent;
    margin-bottom: 8px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .note-card:hover {
    border-color: #3f3f46;
  }
  .note-card.selected {
    background: #27272a;
    border-color: #eab308;
  }
  .note-title {
    font-size: 13px;
    font-weight: 600;
    color: #fafafa;
    margin-bottom: 6px;
  }
  .note-tags {
    display: flex;
    gap: 4px;
    flex-wrap: wrap;
  }
  .tag-pill {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 4px;
    background: rgba(234, 179, 8, 0.15);
    color: #facc15;
    font-weight: 500;
  }
</style>
