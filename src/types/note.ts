export interface NoteMetadata {
	/** True when this note is an iCloud placeholder that hasn't downloaded yet. */
	downloading?: boolean
	id: string
	title: string
	preview: string
	modified: number
	tags: string[]
	wordCount?: number
	word_count?: number
}

export interface Note {
	id: string
	title: string
	content: string
	path: string
	modified: number
	tags: string[]
}

export interface ThemeSettings {
	mode: 'light' | 'dark' | 'system'
}

export type FontFamily = 'neue-haas' | 'system-sans' | 'serif' | 'monospace'
export type TextDirection = 'auto' | 'ltr' | 'rtl'
export type EditorWidth = 'narrow' | 'normal' | 'wide' | 'full' | 'custom'

export interface EditorFontSettings {
	baseFontFamily?: FontFamily
	baseFontSize?: number // in px, default 16
	boldWeight?: number // 600, 700, 800 for headings and bold text
	lineHeight?: number // default 1.6
}

export type { SemanticColorKey, LegacyColorKey, ThemeColorKey } from '../tokens'
import type { ThemeColorKey } from '../tokens'

// Partial map of color overrides (hex strings)
export type CustomColors = Partial<Record<ThemeColorKey, string>>

// Per-folder settings (stored in .scratch/settings.json)
export interface Settings {
	theme: ThemeSettings
	editorFont?: EditorFontSettings
	gitEnabled?: boolean
	foldersEnabled?: boolean
	pinnedNoteIds?: string[]
	textDirection?: TextDirection
	editorWidth?: EditorWidth
	customEditorWidthPx?: number
	sidebarWidthPx?: number
	defaultNoteName?: string
	interfaceZoom?: number
	ollamaModel?: string
	ignoredPatterns?: string[]
	animationsEnabled?: boolean
	customColorsLight?: CustomColors
	customColorsDark?: CustomColors
	tagColors?: Record<string, string>
	liquidGlassEnabled?: boolean
}
