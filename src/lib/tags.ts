import type { CSSProperties } from "react";

// Fixed palette of saturated, distinguishable colors for auto-assigned tag colors.
export const TAG_PALETTE: string[] = [
  "#ef4444", // red-500
  "#f97316", // orange-500
  "#f59e0b", // amber-500
  "#84cc16", // lime-500
  "#14b8a6", // teal-500
  "#3b82f6", // blue-500
  "#6366f1", // indigo-500
  "#ec4899", // pink-500
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

export function tagPillStyle(hex: string): CSSProperties {
  return {
    backgroundColor: hex + "26",
    color: hex,
  };
}
