import { Node, type JSONContent, type MarkdownToken } from "@tiptap/core";

export const Frontmatter = Node.create({
  name: "frontmatter",
  group: "block",
  atom: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      value: {
        default: "",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "pre[data-frontmatter]",
        preserveWhitespace: "full" as const,
        getAttrs: (node) => ({
          value: (node as HTMLElement).textContent || "",
        }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      "pre",
      { ...HTMLAttributes, "data-frontmatter": "", class: "frontmatter" },
      ["code", node.attrs.value || ""],
    ];
  },

  markdownTokenName: "frontmatter",

  markdownTokenizer: {
    name: "frontmatter",
    level: "block" as const,
    start: "---",
    tokenize(src: string, tokens: MarkdownToken[]) {
      if (tokens.length > 0) return undefined;
      const match = src.match(
        /^(?:\ufeff)?---[ \t]*\r?\n([\s\S]*?\r?\n)?---[ \t]*(?:\r?\n|$)/,
      );
      if (!match) return undefined;
      return {
        type: "frontmatter",
        raw: match[0],
        text: (match[1] ?? "").replace(/\r?\n$/, ""),
      };
    },
  },

  parseMarkdown(token: MarkdownToken, helpers) {
    return helpers.createNode("frontmatter", {
      value: token.text ?? "",
    });
  },

  renderMarkdown(node: JSONContent) {
    const value = (node.attrs?.value as string) ?? "";
    return `---\n${value}\n---`;
  },
});
