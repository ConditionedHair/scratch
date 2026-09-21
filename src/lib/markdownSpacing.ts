/**
 * Markdown Spacing Utility
 *
 * Normalizes markdown text so that paragraph spacing is clean and consistent:
 * - Single newlines between regular prose lines become paragraph breaks (\n\n).
 * - Multiple consecutive blank lines (\n{3,}) collapse to a single paragraph break (\n\n).
 * - Protected blocks (fenced code, tables, lists, blockquotes, block math, frontmatter)
 *   are preserved without breaking their structure.
 * - Intentional hard breaks (lines ending with 2+ spaces or a backslash) are preserved.
 */

// Line types for classifier
type LineType =
  | "empty"
  | "frontmatter_delimiter"
  | "code_fence"
  | "math_delimiter"
  | "heading"
  | "table"
  | "list_item"
  | "list_continuation"
  | "blockquote"
  | "horizontal_rule"
  | "prose";

/**
 * Check if a line is a list item marker (bullet, ordered, task).
 */
function isListItem(line: string): boolean {
  return /^\s*(?:[-*+]|\d+[.)])\s+/.test(line);
}

/**
 * Check if a line is a list continuation line (indented following a list item).
 */
function isListContinuation(line: string, inList: boolean): boolean {
  if (!inList) return false;
  return /^\s{2,}\S/.test(line);
}

/**
 * Check if a line is a table row.
 */
function isTableRow(line: string): boolean {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && (trimmed.endsWith("|") || trimmed.includes("|"));
}

/**
 * Check if a line is a horizontal rule.
 */
function isHorizontalRule(line: string): boolean {
  return /^\s*([*\-_])(?:\s*\1){2,}\s*$/.test(line);
}

/**
 * Check if a line ends with an intentional markdown hard break:
 * - Two or more trailing spaces: "line  "
 * - Trailing backslash: "line\"
 */
function hasHardBreak(line: string): boolean {
  return /(?:[^\s\\]  |\\)$/.test(line);
}

/**
 * Normalizes raw markdown content before parsing into TipTap / ProseMirror.
 */
export function normalizeMarkdownSpacing(markdown: string): string {
  if (!markdown || typeof markdown !== "string") {
    return "";
  }

  // Normalize line endings to \n
  const lines = markdown.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  const normalizedLines: string[] = [];
  let inFrontmatter = false;
  let inCodeBlock = false;
  let codeBlockFence = "";
  let inMathBlock = false;
  let inList = false;

  let prevType: LineType | null = null;
  let consecutiveEmptyCount = 0;

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Frontmatter handling (only at start of document)
    if (i === 0 && trimmed === "---") {
      inFrontmatter = true;
      normalizedLines.push(rawLine);
      prevType = "frontmatter_delimiter";
      continue;
    }
    if (inFrontmatter) {
      normalizedLines.push(rawLine);
      if (trimmed === "---") {
        inFrontmatter = false;
        prevType = "frontmatter_delimiter";
      }
      continue;
    }

    // 2. Fenced Code Block handling
    const codeFenceMatch = rawLine.match(/^\s*(`{3,}|~{3,})/);
    if (codeFenceMatch) {
      const fence = codeFenceMatch[1];
      if (!inCodeBlock) {
        inCodeBlock = true;
        codeBlockFence = fence[0]; // '`' or '~'
        // If coming directly from prose without blank line, add one
        if (prevType && prevType !== "empty") {
          normalizedLines.push("");
        }
        normalizedLines.push(rawLine);
        prevType = "code_fence";
        inList = false;
        consecutiveEmptyCount = 0;
        continue;
      } else if (rawLine.trim().startsWith(codeBlockFence.repeat(3))) {
        // Closing fence
        inCodeBlock = false;
        codeBlockFence = "";
        normalizedLines.push(rawLine);
        prevType = "code_fence";
        consecutiveEmptyCount = 0;
        continue;
      }
    }

    if (inCodeBlock) {
      // Code content is preserved verbatim
      normalizedLines.push(rawLine);
      continue;
    }

    // 3. Block Math ($$...$$) handling
    if (trimmed === "$$") {
      inMathBlock = !inMathBlock;
      if (inMathBlock && prevType && prevType !== "empty") {
        normalizedLines.push("");
      }
      normalizedLines.push(rawLine);
      prevType = "math_delimiter";
      inList = false;
      consecutiveEmptyCount = 0;
      continue;
    }

    if (inMathBlock) {
      normalizedLines.push(rawLine);
      continue;
    }

    // 4. Empty lines
    if (trimmed === "") {
      consecutiveEmptyCount++;
      inList = false;
      // Only keep at most 1 empty line between blocks (collapses multiple blank lines)
      if (consecutiveEmptyCount === 1 && normalizedLines.length > 0) {
        normalizedLines.push("");
        prevType = "empty";
      }
      continue;
    }

    // Reset empty count on non-empty line
    const hadPrecedingEmptyLine = consecutiveEmptyCount > 0;
    consecutiveEmptyCount = 0;

    // 5. Headings
    if (/^\s*#{1,6}\s+/.test(rawLine)) {
      if (prevType && prevType !== "empty" && !hadPrecedingEmptyLine) {
        normalizedLines.push("");
      }
      normalizedLines.push(rawLine);
      prevType = "heading";
      inList = false;
      continue;
    }

    // 6. Horizontal Rules
    if (isHorizontalRule(rawLine)) {
      if (prevType && prevType !== "empty" && !hadPrecedingEmptyLine) {
        normalizedLines.push("");
      }
      normalizedLines.push(rawLine);
      prevType = "horizontal_rule";
      inList = false;
      continue;
    }

    // 7. Tables
    if (isTableRow(rawLine)) {
      if (prevType && prevType !== "table" && prevType !== "empty" && !hadPrecedingEmptyLine) {
        normalizedLines.push("");
      }
      normalizedLines.push(rawLine);
      prevType = "table";
      inList = false;
      continue;
    }

    // 8. Lists
    if (isListItem(rawLine)) {
      if (prevType && prevType !== "list_item" && prevType !== "list_continuation" && prevType !== "empty" && !hadPrecedingEmptyLine) {
        normalizedLines.push("");
      }
      normalizedLines.push(rawLine);
      prevType = "list_item";
      inList = true;
      continue;
    }

    if (isListContinuation(rawLine, inList)) {
      normalizedLines.push(rawLine);
      prevType = "list_continuation";
      continue;
    }

    // Leaving list if we hit here with non-list line
    inList = false;

    // 9. Blockquotes
    if (/^\s*>\s*/.test(rawLine)) {
      if (prevType && prevType !== "blockquote" && prevType !== "empty" && !hadPrecedingEmptyLine) {
        normalizedLines.push("");
      }
      normalizedLines.push(rawLine);
      prevType = "blockquote";
      continue;
    }

    // 10. Regular Prose
    const prevHadHardBreak = prevType === "prose" && hasHardBreak(lines[i - 1]);

    if (prevType && prevType !== "empty" && !hadPrecedingEmptyLine) {
      if (prevHadHardBreak) {
        // Intentional compact line break: keep single newline
        normalizedLines.push(rawLine);
      } else {
        // Single newline between prose blocks or after headings/tables:
        // Convert to paragraph break (\n\n) so spacing is consistent
        normalizedLines.push("");
        normalizedLines.push(rawLine);
      }
    } else {
      normalizedLines.push(rawLine);
    }

    prevType = "prose";
  }

  return normalizedLines.join("\n");
}

/**
 * Cleans serialized markdown from TipTap:
 * - Strips &nbsp; or non-breaking space artifacts used by TipTap for empty lines.
 * - Collapses consecutive blank lines down to \n\n.
 * - Trims trailing whitespace from lines unless it is an intentional hard break (2 spaces).
 */
export function cleanSerializedMarkdown(markdown: string): string {
  if (!markdown || typeof markdown !== "string") {
    return "";
  }

  // Replace &nbsp; and non-breaking spaces
  let cleaned = markdown.replace(/&nbsp;|&#160;|\u00A0/g, " ");

  // Normalize line endings
  cleaned = cleaned.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Clean trailing spaces per line (preserve intentional 2-space hard breaks)
  const lines = cleaned.split("\n").map((line) => {
    if (/(?:[^\s\\]  )$/.test(line)) {
      // Keep exact 2 spaces at the end for intentional markdown line break
      return line.replace(/\s+$/, "  ");
    }
    return line.trimEnd();
  });

  // Collapse 3 or more consecutive newlines down to 2 (\n\n)
  cleaned = lines.join("\n").replace(/\n{3,}/g, "\n\n");

  return cleaned.trimEnd() ? cleaned.trimEnd() + "\n" : "";
}
