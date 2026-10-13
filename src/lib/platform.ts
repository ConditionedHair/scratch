/**
 * Platform utilities for Scratch (macOS only).
 * On macOS: ⌘, ⌥, ⇧
 */

export const isMac = true
export const isWindows = false

/** Modifier key symbol/label */
export const mod = '⌘'
export const alt = '⌥'
export const shift = '⇧'

/**
 * Build a shortcut label string.
 * e.g. shortcut("B") => "⌘B"
 */
export function shortcut(...parts: string[]): string {
	return parts.join('')
}
