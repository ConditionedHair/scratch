// Rich palette of 24 saturated, distinguishable, and Braun-inspired colors for tags.
export const TAG_PALETTE: string[] = [
  // Reds & Corals
  "#ef4444", // Red
  "#f43f5e", // Rose
  "#e11d48", // Crimson
  // Oranges & Braun Accents
  "#f97316", // Orange
  "#e65100", // Braun Signal Orange
  "#f5a623", // Braun Signal Yellow
  "#f59e0b", // Amber
  "#eab308", // Yellow
  // Greens & Mints
  "#84cc16", // Lime
  "#22c55e", // Green
  "#2e7d32", // Braun Functional Green
  "#10b981", // Emerald
  // Cyans & Teals
  "#14b8a6", // Teal
  "#06b6d4", // Cyan
  "#0ea5e9", // Sky Blue
  // Blues & Indigos
  "#0066cc", // Braun Dial Blue
  "#3b82f6", // Blue
  "#6366f1", // Indigo
  // Purples & Pinks
  "#8b5cf6", // Violet
  "#a855f7", // Purple
  "#d946ef", // Fuchsia
  "#ec4899", // Pink
  // Neutrals & Earth tones
  "#64748b", // Slate
  "#78716c", // Stone
];

// Simple deterministic string hash (djb2-ish) so a tag always maps to the same
// palette entry without needing a persisted color assignment.
function hashTag(tag: string): number {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) {
    hash = (hash * 31 + tag.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function getTagColor(
  tag: string,
  tagColors: Record<string, string> | undefined,
): string {
  const assigned = tagColors?.[tag];
  if (assigned) return assigned;
  return TAG_PALETTE[hashTag(tag) % TAG_PALETTE.length];
}

export function assignTagColor(
  tag: string,
  tagColors: Record<string, string> | undefined,
): Record<string, string> {
  if (tagColors?.[tag]) {
    return tagColors;
  }
  return {
    ...tagColors,
    [tag]: getTagColor(tag, tagColors),
  };
}

export function tagPillStyle(hex: string): Record<string, string> {
  const cleanHex = hex.replace("#", "").slice(0, 6);
  return {
    backgroundColor: `#${cleanHex}20`,
    borderColor: `#${cleanHex}40`,
    color: `#${cleanHex}`,
  };
}

export function tagPillCss(hex: string): string {
  const cleanHex = hex.replace("#", "").slice(0, 6);
  return `background-color: #${cleanHex}20; border-color: #${cleanHex}40; color: #${cleanHex};`;
}
