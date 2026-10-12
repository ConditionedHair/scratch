import { Extension } from "@tiptap/core";
import { PluginKey } from "@tiptap/pm/state";
import Suggestion from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import type { Editor as TiptapEditor } from "@tiptap/core";
import type { Component } from "svelte";
import {
  PilcrowIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  Heading4Icon,
  ListIcon,
  ListOrderedIcon,
  CheckSquareIcon,
  QuoteIcon,
  CodeIcon,
  BlockMathIcon,
  SeparatorIcon,
  ImageIcon,
  TableIcon,
  BracketsIcon,
  WorkflowIcon,
} from "../icons";
import SlashCommandList from "./SlashCommandList.svelte";
import { SvelteRenderer } from "./SvelteRenderer.svelte";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: Component;
  aliases: string[];
  command: (editor: TiptapEditor) => void;
}

const SLASH_COMMANDS: SlashCommandItem[] = [
  {
    title: "Text",
    description: "Plain body text",
    icon: PilcrowIcon,
    aliases: ["paragraph", "body", "plain", "normal"],
    command: (editor) => {
      editor.chain().focus().setParagraph().run();
    },
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: Heading1Icon,
    aliases: ["h1", "heading", "title"],
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: Heading2Icon,
    aliases: ["h2", "heading", "subtitle"],
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: "Heading 3",
    description: "Small section heading",
    icon: Heading3Icon,
    aliases: ["h3", "heading"],
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: "Heading 4",
    description: "Smallest section heading",
    icon: Heading4Icon,
    aliases: ["h4", "heading"],
    command: (editor) => {
      editor.chain().focus().toggleHeading({ level: 4 }).run();
    },
  },
  {
    title: "Bullet List",
    description: "Unordered bulleted list",
    icon: ListIcon,
    aliases: ["ul", "bullet", "list", "unordered"],
    command: (editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    title: "Numbered List",
    description: "Ordered sequential list",
    icon: ListOrderedIcon,
    aliases: ["ol", "numbered", "list", "ordered"],
    command: (editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
  {
    title: "Task List",
    description: "Checklist with checkboxes",
    icon: CheckSquareIcon,
    aliases: ["todo", "task", "check", "checklist"],
    command: (editor) => {
      editor.chain().focus().toggleTaskList().run();
    },
  },
  {
    title: "Blockquote",
    description: "Callout or quotation block",
    icon: QuoteIcon,
    aliases: ["quote", "blockquote", "callout"],
    command: (editor) => {
      editor.chain().focus().toggleBlockquote().run();
    },
  },
  {
    title: "Code Block",
    description: "Syntax-highlighted code",
    icon: CodeIcon,
    aliases: ["code", "pre", "snippet"],
    command: (editor) => {
      editor.chain().focus().toggleCodeBlock().run();
    },
  },
  {
    title: "Mermaid Diagram",
    description: "Flowchart, sequence diagram, chart",
    icon: WorkflowIcon,
    aliases: ["diagram", "chart", "flowchart", "graph"],
    command: (editor) => {
      editor.chain().focus().setCodeBlock({ language: "mermaid" }).run();
    },
  },
  {
    title: "Math Block",
    description: "KaTeX display formula ($$...$$)",
    icon: BlockMathIcon,
    aliases: ["math", "latex", "katex", "formula", "equation"],
    command: (editor) => {
      editor
        .chain()
        .focus()
        .insertContent({
          type: "blockMath",
          attrs: { latex: "f(x) = x^2" },
        })
        .run();
    },
  },
  {
    title: "Divider",
    description: "Horizontal visual separator",
    icon: SeparatorIcon,
    aliases: ["hr", "horizontal", "rule", "line", "separator"],
    command: (editor) => {
      editor.chain().focus().setHorizontalRule().run();
    },
  },
  {
    title: "Wikilink",
    description: "Internal note link ([[Note]])",
    icon: BracketsIcon,
    aliases: ["wikilink", "note", "link", "page", "internal"],
    command: (editor) => {
      editor.chain().focus().insertContent("[[").run();
    },
  },
  {
    title: "Image",
    description: "Embed picture from URL",
    icon: ImageIcon,
    aliases: ["img", "picture", "photo"],
    command: (editor) => {
      const url = window.prompt("Image URL");
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    },
  },
  {
    title: "Table",
    description: "3×3 data grid",
    icon: TableIcon,
    aliases: ["grid", "cells", "rows"],
    command: (editor) => {
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
        .run();
    },
  },
];

export const slashCommandPluginKey = new PluginKey("slashCommand");

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addProseMirrorPlugins() {
    return [
      Suggestion<SlashCommandItem>({
        editor: this.editor,
        char: "/",
        pluginKey: slashCommandPluginKey,
        allowSpaces: false,
        startOfLine: true,

        allow: ({ editor }) => {
          return (
            !editor.isActive("codeBlock") && !editor.isActive("frontmatter")
          );
        },

        items: ({ query }) => {
          const q = query.toLowerCase();
          return SLASH_COMMANDS.filter(
            (item) =>
              item.title.toLowerCase().includes(q) ||
              item.description.toLowerCase().includes(q) ||
              item.aliases.some((alias) => alias.includes(q)),
          );
        },

        command: ({ editor, range, props: item }) => {
          editor.chain().focus().deleteRange(range).run();
          item.command(editor);
        },

        render: () => {
          let component: SvelteRenderer | null = null;
          let popup: TippyInstance | null = null;

          return {
            onStart: (props) => {
              component = new SvelteRenderer(SlashCommandList, {
                props: {
                  items: props.items,
                  command: props.command,
                },
                editor: props.editor,
              });

              popup = tippy(document.body, {
                getReferenceClientRect: () =>
                  props.clientRect?.() ?? new DOMRect(),
                appendTo: () => document.body,
                content: component.element,
                showOnCreate: true,
                interactive: true,
                trigger: "manual",
                placement: "bottom-start",
                offset: [0, 4],
                popperOptions: {
                  modifiers: [
                    {
                      name: "flip",
                      options: { fallbackPlacements: ["top-start"] },
                    },
                  ],
                },
              });
            },

            onUpdate: (props) => {
              component?.updateProps({
                items: props.items,
                command: props.command,
              });

              popup?.setProps({
                getReferenceClientRect: () =>
                  props.clientRect?.() ?? new DOMRect(),
              });
            },

            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                popup?.hide();
                return true;
              }
              return component?.ref?.onKeyDown?.(props) ?? false;
            },

            onExit: () => {
              popup?.destroy();
              component?.destroy();
              popup = null;
              component = null;
            },
          };
        },
      }),
    ];
  },
});
