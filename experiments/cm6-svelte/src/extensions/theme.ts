import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";

/**
 * Braun Dieter Rams Field Instrument Dark Theme for CodeMirror 6
 */
export const braunTheme: Extension = EditorView.theme(
  {
    "&": {
      color: "#ececed",
      backgroundColor: "#161618",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      fontSize: "14px",
      height: "100%",
    },
    ".cm-content": {
      caretColor: "#eab308", // Signal yellow
      padding: "24px 32px",
      maxWidth: "750px",
      margin: "0 auto",
      lineHeight: "1.7",
    },
    ".cm-cursor, .cm-dropCursor": {
      borderLeftColor: "#eab308",
      borderLeftWidth: "2px",
    },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
      backgroundColor: "rgba(234, 179, 8, 0.22)",
    },
    ".cm-activeLine": {
      backgroundColor: "rgba(255, 255, 255, 0.02)",
    },
    ".cm-gutters": {
      backgroundColor: "#161618",
      color: "#6b7280",
      border: "none",
    },
    ".cm-line": {
      padding: "0 4px",
    },
  },
  { dark: true },
);
