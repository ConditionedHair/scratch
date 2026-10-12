import { tokens } from "../tokens";

// Rich palette of 24 saturated, distinguishable, and Braun-inspired colors for tags sourced from master tokens.
export const TAG_PALETTE: string[] = tokens.colors.tags;

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

export function tagPillCss(hex: string): string {
  const cleanHex = hex.replace("#", "").slice(0, 6);
  return `background-color: #${cleanHex}20; border-color: #${cleanHex}40; color: #${cleanHex};`;
}
