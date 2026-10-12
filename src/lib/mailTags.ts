/**
 * Utility functions for handling Gmail category tags and importance indicators.
 */

export const GMAIL_CATEGORY_MAP: Record<string, string> = {
	CATEGORY_PERSONAL: 'Personal',
	CATEGORY_SOCIAL: 'Social',
	CATEGORY_PROMOTIONS: 'Promotions',
	CATEGORY_UPDATES: 'Updates',
	CATEGORY_FORUMS: 'Forums'
}

/**
 * Returns user-friendly category names (e.g. ['Updates']) for a list of label IDs.
 */
export function getCategoryTags(labelIds: string[] = []): string[] {
	if (!labelIds || !Array.isArray(labelIds)) return []
	const categories: string[] = []
	for (const id of labelIds) {
		if (GMAIL_CATEGORY_MAP[id]) {
			categories.push(GMAIL_CATEGORY_MAP[id])
		}
	}
	return categories
}

/**
 * Returns whether a thread or message contains the Gmail IMPORTANT label.
 */
export function isImportantLabel(labelIds: string[] = []): boolean {
	if (!labelIds || !Array.isArray(labelIds)) return false
	return labelIds.includes('IMPORTANT')
}
