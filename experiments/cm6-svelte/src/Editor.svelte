<script lang="ts">
  import { EditorState } from "@codemirror/state";
  import { EditorView, keymap } from "@codemirror/view";
  import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
  import { markdown } from "@codemirror/lang-markdown";
  import { braunTheme } from "./extensions/theme";

  let {
    content = $bindable(""),
    onChange,
  }: {
    content: string;
    onChange?: (val: string) => void;
  } = $props();

  let container: HTMLDivElement;
  let view: EditorView | null = null;

  $effect(() => {
    if (!container) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        braunTheme,
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap]),
        markdown(),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const next = update.state.doc.toString();
            content = next;
            onChange?.(next);
          }
        }),
      ],
    });

    view = new EditorView({
      state,
      parent: container,
    });

    return () => {
      view?.destroy();
      view = null;
    };
  });
</script>

<div class="editor-container" bind:this={container}></div>

<style>
  .editor-container {
    height: 100%;
    width: 100%;
    overflow: auto;
    background: #161618;
  }
  :global(.cm-editor) {
    height: 100%;
  }
</style>
