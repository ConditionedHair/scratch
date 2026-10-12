import { listen } from '@tauri-apps/api/event'
import { toast } from 'svelte-sonner'
import type { Note, NoteMetadata } from '../types/note'
import * as notesService from '../services/notes'
import type { SearchResult } from '../services/notes'
import { countMarkdownWords } from '../lib/plainText'

export class NotesState {
	notes = $state<NoteMetadata[]>([])
	selectedNoteId = $state<string | null>(null)
	currentNote = $state<Note | null>(null)
	notesFolder = $state<string | null>(null)
	isLoading = $state<boolean>(true)
	error = $state<string | null>(null)
	searchQuery = $state<string>('')
	searchResults = $state<SearchResult[]>([])
	isSearching = $state<boolean>(false)
	hasExternalChanges = $state<boolean>(false)
	reloadVersion = $state<number>(0)
	activeTagFilter = $state<string | null>(null)

	// Private state and debounce trackers
	private recentlySaved = new Set<string>()
	private refreshTimeout: number | null = null
	private selectRequestId = 0
	private searchRequestId = 0
	private pendingNewNoteId: string | null = null
	private unlistenFileChange?: () => void
	private unlistenSelectNote?: () => void

	constructor() {
		if (typeof window !== 'undefined') {
			this.init()
		}
	}

	private async init() {
		try {
			const folder = await notesService.getNotesFolder()
			this.notesFolder = folder
			if (folder) {
				const notesList = await notesService.listNotes()
				this.notes = notesList
				await notesService.startFileWatcher()
			}
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to initialize'
		} finally {
			this.isLoading = false
		}

		this.setupListeners()
	}

	private setupListeners() {
		listen<{ changed_ids: string[] }>('file-change', (event) => {
			const changedIds = event.payload.changed_ids || []
			const externalChanges = changedIds.filter(
				(id) => !this.recentlySaved.has(id)
			)

			if (externalChanges.length > 0) {
				this.refreshNotes()

				const currentId = this.selectedNoteId
				if (currentId && externalChanges.includes(currentId)) {
					if (this.currentNote?.id !== currentId) {
						this.selectNote(currentId)
					} else {
						this.hasExternalChanges = true
					}
				}
			}
		}).then((unlisten) => {
			this.unlistenFileChange = unlisten
		})

		listen<string>('select-note', (event) => {
			this.refreshNotes()
			this.selectNote(event.payload)
		}).then((unlisten) => {
			this.unlistenSelectNote = unlisten
		})
	}

	destroy() {
		if (this.unlistenFileChange) this.unlistenFileChange()
		if (this.unlistenSelectNote) this.unlistenSelectNote()
		if (this.refreshTimeout) clearTimeout(this.refreshTimeout)
	}

	refreshNotes = async () => {
		if (!this.notesFolder) return
		try {
			const notesList = await notesService.listNotes()
			this.notes = notesList
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to load notes'
		}
	}

	private scheduleRefresh = () => {
		if (this.refreshTimeout) {
			clearTimeout(this.refreshTimeout)
		}
		this.refreshTimeout = window.setTimeout(() => {
			this.refreshTimeout = null
			this.refreshNotes()
		}, 300)
	}

	selectNote = async (id: string) => {
		const requestId = ++this.selectRequestId
		try {
			if (this.pendingNewNoteId !== id) {
				this.pendingNewNoteId = null
			}
			this.selectedNoteId = id
			this.hasExternalChanges = false

			const lastSlash = id.lastIndexOf('/')
			if (lastSlash > 0) {
				window.dispatchEvent(
					new CustomEvent('expand-folder', {
						detail: id.substring(0, lastSlash)
					})
				)
			}
			const note = await notesService.readNote(id)
			if (requestId !== this.selectRequestId) return
			this.currentNote = note
		} catch (err) {
			if (requestId !== this.selectRequestId) return
			const message =
				err instanceof Error ? err.message : 'Failed to load note'
			if (message.includes('Downloading from iCloud')) {
				toast.info(message)
			} else {
				this.error = message
			}
		}
	}

	reloadCurrentNote = async () => {
		if (!this.selectedNoteId) return
		try {
			const note = await notesService.readNote(this.selectedNoteId)
			this.currentNote = note
			this.hasExternalChanges = false
			this.reloadVersion += 1
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to reload note'
		}
	}

	createNote = async () => {
		try {
			let targetFolder: string | undefined
			if (this.selectedNoteId) {
				const lastSlash = this.selectedNoteId.lastIndexOf('/')
				if (lastSlash > 0) {
					targetFolder = this.selectedNoteId.substring(0, lastSlash)
				}
			}
			const note = await notesService.createNote(targetFolder)
			this.selectRequestId += 1
			this.pendingNewNoteId = note.id
			this.recentlySaved.add(note.id)
			await this.refreshNotes()
			this.currentNote = note
			this.selectedNoteId = note.id
			this.searchQuery = ''
			this.searchResults = []
			setTimeout(() => {
				this.recentlySaved.delete(note.id)
			}, 1000)
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to create note'
		}
	}

	consumePendingNewNote = (id: string) => {
		if (this.pendingNewNoteId !== id) {
			this.pendingNewNoteId = null
			return false
		}
		this.pendingNewNoteId = null
		return true
	}

	saveNote = async (content: string, noteId?: string) => {
		const savingNoteId = noteId || this.currentNote?.id
		if (!savingNoteId) return
		let updatedId: string | null = null

		try {
			this.recentlySaved.add(savingNoteId)
			const updated = await notesService.saveNote(savingNoteId, content)
			updatedId = updated.id

			if (updated.id !== savingNoteId) {
				this.recentlySaved.add(updated.id)

				const currentSettings = await notesService.getSettings()
				const pinnedIds = currentSettings.pinnedNoteIds || []
				if (pinnedIds.includes(savingNoteId)) {
					const updatedSettings = {
						...currentSettings,
						pinnedNoteIds: pinnedIds.map((id) =>
							id === savingNoteId ? updated.id : id
						)
					}
					await notesService.updateSettings(updatedSettings)
				}
			}

			this.hasExternalChanges = false

			if (this.selectedNoteId === savingNoteId) {
				this.currentNote = updated
				this.selectedNoteId = updated.id
			}

			const existingIndex = this.notes.findIndex(
				(n) => n.id === savingNoteId || n.id === updated.id
			)
			if (existingIndex >= 0) {
				const existing = this.notes[existingIndex]
				const words = countMarkdownWords(content)
				this.notes[existingIndex] = {
					...existing,
					id: updated.id,
					title: updated.title,
					modified: updated.modified,
					tags: updated.tags,
					wordCount: words,
					word_count: words
				}
			}

			this.scheduleRefresh()

			setTimeout(() => {
				this.recentlySaved.delete(savingNoteId)
				if (updatedId) this.recentlySaved.delete(updatedId)
			}, 1000)
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to save note'
			this.recentlySaved.delete(savingNoteId)
			if (updatedId) this.recentlySaved.delete(updatedId)
		}
	}

	deleteNote = async (id: string) => {
		try {
			await notesService.deleteNote(id)

			const currentSettings = await notesService.getSettings()
			const pinnedIds = currentSettings.pinnedNoteIds || []
			if (pinnedIds.includes(id)) {
				const updatedSettings = {
					...currentSettings,
					pinnedNoteIds: pinnedIds.filter((pinId) => pinId !== id)
				}
				await notesService.updateSettings(updatedSettings)
			}

			if (this.selectedNoteId === id) {
				this.currentNote = null
				this.selectedNoteId = null
			}
			await this.refreshNotes()
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to delete note'
		}
	}

	duplicateNote = async (id: string) => {
		try {
			const newNote = await notesService.duplicateNote(id)
			this.selectRequestId += 1
			this.recentlySaved.add(newNote.id)
			await this.refreshNotes()
			this.currentNote = newNote
			this.selectedNoteId = newNote.id
			setTimeout(() => {
				this.recentlySaved.delete(newNote.id)
			}, 1000)
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to duplicate note'
		}
	}

	pinNote = async (id: string) => {
		try {
			const currentSettings = await notesService.getSettings()
			const pinnedIds = currentSettings.pinnedNoteIds || []

			if (!pinnedIds.includes(id)) {
				const updatedSettings = {
					...currentSettings,
					pinnedNoteIds: [...pinnedIds, id]
				}
				await notesService.updateSettings(updatedSettings)
				await this.refreshNotes()
			}
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to pin note'
		}
	}

	unpinNote = async (id: string) => {
		try {
			const currentSettings = await notesService.getSettings()
			const pinnedIds = currentSettings.pinnedNoteIds || []

			const updatedSettings = {
				...currentSettings,
				pinnedNoteIds: pinnedIds.filter((pinId) => pinId !== id)
			}
			await notesService.updateSettings(updatedSettings)
			await this.refreshNotes()
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to unpin note'
		}
	}

	createNoteInFolder = async (folderPath: string) => {
		try {
			const note = await notesService.createNote(folderPath)
			this.selectRequestId += 1
			this.pendingNewNoteId = note.id
			this.recentlySaved.add(note.id)
			await this.refreshNotes()
			this.currentNote = note
			this.selectedNoteId = note.id
			this.searchQuery = ''
			this.searchResults = []
			setTimeout(() => {
				this.recentlySaved.delete(note.id)
			}, 1000)
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to create note'
		}
	}

	createFolder = async (parentPath: string, name: string) => {
		try {
			const fullPath = parentPath ? `${parentPath}/${name}` : name
			await notesService.createFolder(fullPath)
			await this.refreshNotes()
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to create folder'
		}
	}

	deleteFolder = async (path: string) => {
		try {
			await notesService.deleteFolder(path)
			if (
				this.selectedNoteId &&
				this.selectedNoteId.startsWith(path + '/')
			) {
				this.currentNote = null
				this.selectedNoteId = null
			}
			await this.refreshNotes()
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to delete folder'
		}
	}

	renameFolder = async (oldPath: string, newName: string) => {
		try {
			await notesService.renameFolder(oldPath, newName)

			const lastSlash = oldPath.lastIndexOf('/')
			const newPath =
				lastSlash >= 0
					? `${oldPath.substring(0, lastSlash)}/${newName}`
					: newName
			const oldPrefix = oldPath + '/'
			const newPrefix = newPath + '/'

			if (
				this.selectedNoteId &&
				this.selectedNoteId.startsWith(oldPrefix)
			) {
				const newId =
					newPrefix + this.selectedNoteId.substring(oldPrefix.length)
				this.selectedNoteId = newId
				notesService
					.readNote(newId)
					.then((note) => {
						this.currentNote = note
					})
					.catch((err) => {
						this.error =
							err instanceof Error
								? err.message
								: 'Failed to read renamed note'
					})
			}

			await this.refreshNotes()
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to rename folder'
		}
	}

	moveNote = async (id: string, targetFolder: string) => {
		try {
			const newId = await notesService.moveNote(id, targetFolder)
			if (this.selectedNoteId === id) {
				this.selectedNoteId = newId
				notesService
					.readNote(newId)
					.then((note) => {
						this.currentNote = note
					})
					.catch((err) => {
						this.error =
							err instanceof Error
								? err.message
								: 'Failed to read moved note'
					})
			}
			await this.refreshNotes()
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to move note'
		}
	}

	moveFolder = async (path: string, targetParent: string) => {
		try {
			await notesService.moveFolder(path, targetParent)

			const folderName = path.includes('/')
				? path.substring(path.lastIndexOf('/') + 1)
				: path
			const newPath = targetParent
				? `${targetParent}/${folderName}`
				: folderName
			const oldPrefix = path + '/'
			const newPrefix = newPath + '/'

			if (
				this.selectedNoteId &&
				this.selectedNoteId.startsWith(oldPrefix)
			) {
				const newId =
					newPrefix + this.selectedNoteId.substring(oldPrefix.length)
				this.selectedNoteId = newId
				notesService
					.readNote(newId)
					.then((note) => {
						this.currentNote = note
					})
					.catch((err) => {
						this.error =
							err instanceof Error
								? err.message
								: 'Failed to read moved note'
					})
			}

			await this.refreshNotes()
		} catch (err) {
			this.error =
				err instanceof Error ? err.message : 'Failed to move folder'
		}
	}

	setNotesFolder = async (path: string) => {
		try {
			await notesService.setNotesFolder(path)
			this.notesFolder = path
			await notesService.startFileWatcher()
		} catch (err) {
			this.error =
				err instanceof Error
					? err.message
					: 'Failed to set notes folder'
		}
	}

	syncNotesFolder = async (path: string) => {
		try {
			this.notesFolder = path
			this.selectedNoteId = null
			this.currentNote = null
			const notesList = await notesService.listNotes()
			this.notes = notesList
			await notesService.startFileWatcher()
		} catch (err) {
			this.error =
				err instanceof Error
					? err.message
					: 'Failed to sync notes folder'
		}
	}

	search = async (query: string) => {
		const requestId = ++this.searchRequestId
		this.searchQuery = query

		const trimmedQuery = query.trim()
		if (!trimmedQuery) {
			this.searchResults = []
			this.isSearching = false
			return
		}

		const queryLower = trimmedQuery.toLowerCase()
		const tagFilter = this.activeTagFilter
		const instantResults: SearchResult[] = this.notes
			.filter(
				(note) =>
					(tagFilter == null || note.tags.includes(tagFilter)) &&
					(note.title.toLowerCase().includes(queryLower) ||
						note.preview.toLowerCase().includes(queryLower))
			)
			.slice(0, 20)
			.map((note) => ({
				id: note.id,
				title: note.title,
				preview: note.preview,
				modified: note.modified,
				score: 0
			}))

		this.searchResults = instantResults
		this.isSearching = true

		try {
			const results = await notesService.searchNotes(trimmedQuery)
			if (requestId !== this.searchRequestId) return
			if (results.length === 0) {
				this.searchResults = instantResults
			} else {
				const merged = [...results]
				const seen = new Set(results.map((r) => r.id))
				for (const r of instantResults) {
					if (!seen.has(r.id)) {
						merged.push(r)
					}
				}
				this.searchResults = merged
			}
		} catch (err) {
			console.error('Search failed:', err)
		}

		if (requestId !== this.searchRequestId) return
		this.isSearching = false
	}

	clearSearch = () => {
		this.searchRequestId += 1
		this.searchQuery = ''
		this.searchResults = []
		this.isSearching = false
	}

	setActiveTagFilter = (tag: string | null) => {
		this.activeTagFilter = tag
	}
}

export const notesState = new NotesState()
