<script module lang="ts">
	// Data source for preview mode — bypasses notesState
	export interface PreviewModeData {
		content: string | null
		title: string
		filePath: string
		modified: number
		hasExternalChanges: boolean
		reloadVersion: number
		save: (content: string) => Promise<void>
		reload: () => Promise<void>
	}
</script>

<script lang="ts">
	import { untrack, tick } from 'svelte'
	import { Editor as TiptapEditor } from '@tiptap/core'
	import StarterKit from '@tiptap/starter-kit'
	import Placeholder from '@tiptap/extension-placeholder'
	import Link from '@tiptap/extension-link'
	import Image from '@tiptap/extension-image'
	import TaskList from '@tiptap/extension-task-list'
	import TaskItem from '@tiptap/extension-task-item'
	import { TableKit } from '@tiptap/extension-table'
	import { Markdown } from '@tiptap/markdown'
	import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
	import { lowlight } from './lowlight'
	import { SvelteCodeBlockNodeViewRenderer } from './CodeBlockNodeView.svelte'
	import { Extension, InputRule } from '@tiptap/core'
	import { Decoration, DecorationSet } from '@tiptap/pm/view'
	import { NodeSelection, TextSelection } from '@tiptap/pm/state'
	import tippy, { type Instance as TippyInstance } from 'tippy.js'
	import { open as openDialog } from '@tauri-apps/plugin-dialog'
	import { openUrl } from '@tauri-apps/plugin-opener'
	import { invoke, convertFileSrc } from '@tauri-apps/api/core'
	import { join } from '@tauri-apps/api/path'
	import { toast } from 'svelte-sonner'
	import { DropdownMenu } from 'bits-ui'
	import { Menu, MenuItem, PredefinedMenuItem } from '@tauri-apps/api/menu'

	import { notesState } from '../../context/notes.svelte'
	import { themeState } from '../../context/theme.svelte'
	import { Frontmatter } from './Frontmatter'
	import { SvelteRenderer } from './SvelteRenderer.svelte'
	import BlockMathEditor from './BlockMathEditor.svelte'
	import LinkEditor from './LinkEditor.svelte'
	import SearchToolbar from './SearchToolbar.svelte'
	import { SlashCommand } from './SlashCommand'
	import { Wikilink, type WikilinkStorage } from './Wikilink'
	import { WikilinkSuggestion } from './WikilinkSuggestion'
	import EditorWidthHandles from './EditorWidthHandle.svelte'
	import TagBar from './TagBar.svelte'
	import CalendarWidget from './CalendarWidget.svelte'
	import {
		SearchHighlight,
		searchHighlightPluginKey
	} from './SearchHighlight'
	import FloatingFormatBar from './FloatingFormatBar.svelte'
	import { ScratchBlockMath, normalizeBlockMath } from './MathExtensions'
	import { cn } from '../../lib/utils'
	import { plainTextFromMarkdown } from '../../lib/plainText'
	import {
		normalizeMarkdownSpacing,
		cleanSerializedMarkdown
	} from '../../lib/markdownSpacing'
	import { mod, shift, isMac } from '../../lib/platform'
	import { Button, IconButton, Tooltip } from '../ui'
	import * as notesService from '../../services/notes'
	import { downloadPdf, downloadMarkdown } from '../../services/pdf'
	import type { Settings } from '../../types/note'
	import {
		SpinnerIcon,
		CircleCheckIcon,
		CopyIcon,
		DownloadIcon,
		ShareIcon,
		PanelLeftIcon,
		RefreshCwIcon,
		PinIcon,
		SearchIcon,
		MarkdownIcon,
		MarkdownOffIcon,
		FolderPlusIcon,
		ZenIcon
	} from '../icons'

	interface Props {
		onToggleSidebar?: () => void
		sidebarVisible?: boolean
		focusMode?: boolean
		onToggleFocusMode?: () => void
		previewMode?: PreviewModeData
		onEditorReady?: (editor: TiptapEditor | null) => void
		onSaveToFolder?: () => void
		saveToFolderDisabled?: boolean
		onOpenCalendar?: () => void
		onOpenSettings?: () => void
	}

	let {
		onToggleSidebar,
		sidebarVisible = false,
		focusMode = false,
		onToggleFocusMode,
		previewMode,
		onEditorReady,
		onSaveToFolder,
		saveToFolderDisabled = false,
		onOpenCalendar,
		onOpenSettings
	}: Props = $props()

	function normalizeUrl(url: string): string {
		const trimmed = url.trim()
		if (!trimmed) return trimmed
		if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed
		return `https://${trimmed}`
	}

	function isAllowedUrlScheme(url: string): boolean {
		try {
			const parsed = new URL(url)
			return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
		} catch {
			return false
		}
	}

	function formatBraunDate(timestamp: number): string {
		const date = new Date(timestamp * 1000)
		return date
			.toLocaleDateString(undefined, {
				month: 'long',
				day: 'numeric',
				year: 'numeric'
			})
			.toUpperCase()
	}

	function focusAndSelectTitle(editor: TiptapEditor): boolean {
		let titleFrom = -1
		let titleTo = -1

		editor.state.doc.descendants((node, pos) => {
			if (node.type.name !== 'heading' || node.attrs.level !== 1) {
				return true
			}
			titleFrom = pos + 1
			titleTo = pos + node.nodeSize - 1
			return false
		})

		if (titleFrom < 0 || titleTo < 0) return false

		editor
			.chain()
			.focus()
			.setTextSelection(
				titleFrom === titleTo
					? titleFrom
					: { from: titleFrom, to: titleTo }
			)
			.run()

		return true
	}

	const katexMacros: Record<string, string> = {
		'\\R': '\\mathbb{R}',
		'\\N': '\\mathbb{N}',
		'\\Z': '\\mathbb{Z}',
		'\\Q': '\\mathbb{Q}',
		'\\C': '\\mathbb{C}'
	}

	function getMarkdownBlockOffsets(md: string): number[] {
		const offsets: number[] = []
		const lines = md.split('\n')
		let pos = 0
		let prevBlank = true
		let inCodeFence = false

		for (const line of lines) {
			const trimmed = line.trimStart()

			if (inCodeFence) {
				if (trimmed.startsWith('```')) {
					inCodeFence = false
				}
			} else if (trimmed.startsWith('```')) {
				offsets.push(pos)
				inCodeFence = true
				prevBlank = false
			} else {
				const isBlank = trimmed === ''
				if (!isBlank && (prevBlank || trimmed.startsWith('#'))) {
					offsets.push(pos)
				}
				prevBlank = isBlank
			}

			pos += line.length + 1
		}

		return offsets
	}

	function blockIndexToPos(
		doc: { childCount: number; child: (i: number) => { nodeSize: number } },
		blockIndex: number
	): number {
		const idx = Math.max(0, Math.min(blockIndex, doc.childCount - 1))
		let pos = 1
		for (let i = 0; i < idx; i++) {
			pos += doc.child(i).nodeSize
		}
		return pos
	}

	// Reactive state
	let currentNote = $derived.by(() => {
		if (previewMode) {
			return previewMode.content !== null
				? {
						id: previewMode.filePath,
						title: previewMode.title,
						content: previewMode.content,
						path: previewMode.filePath,
						modified: previewMode.modified,
						tags: [] as string[]
					}
				: null
		}
		return notesState.currentNote
	})

	const saveNote = async (content: string, noteId?: string) => {
		if (previewMode) {
			await previewMode.save(content)
		} else {
			await notesState.saveNote(content, noteId)
		}
	}

	let hasExternalChanges = $derived(
		previewMode
			? previewMode.hasExternalChanges
			: notesState.hasExternalChanges
	)
	let reloadVersion = $derived(
		previewMode ? previewMode.reloadVersion : notesState.reloadVersion
	)

	const reloadCurrentNote = async () => {
		if (previewMode) {
			await previewMode.reload()
		} else {
			await notesState.reloadCurrentNote()
		}
	}

	let isSaving = $state(false)
	let copyMenuOpen = $state(false)
	let settings = $state<Settings | null>(null)

	// Source mode state
	let sourceMode = $state(false)
	let sourceContent = $state('')
	let sourceTimeout: number | null = null

	// Search state
	let searchOpen = $state(false)
	let searchQuery = $state('')
	let replaceQuery = $state('')
	let isReplaceOpen = $state(false)
	let searchMatches = $state<Array<{ from: number; to: number }>>([])
	let currentMatchIndex = $state(0)
	let searchInputEl: HTMLInputElement | null = $state(null)

	// Editor and DOM refs
	let editor = $state<TiptapEditor | null>(null)
	let scrollContainerEl: HTMLDivElement | null = $state(null)

	let saveTimeout: number | null = null
	let linkPopup: TippyInstance | null = null
	let blockMathPopup: TippyInstance | null = null
	let isLoading = false
	let needsSave = false

	let loadedNoteId: string | null = null
	let lastSave: { noteId: string; content: string } | null = null
	let lastReloadVersion = 0

	function getMarkdown(editorInstance: TiptapEditor | null): string {
		if (!editorInstance) return ''
		const manager = editorInstance.storage.markdown?.manager
		if (manager) {
			const markdown = manager.serialize(editorInstance.getJSON())
			return cleanSerializedMarkdown(markdown)
		}
		return editorInstance.getText()
	}

	// Load settings on mount & note change
	$effect(() => {
		const id = currentNote?.id
		if (id && !previewMode) {
			notesService
				.getSettings()
				.then((s) => {
					settings = s
				})
				.catch((error) => {
					console.error('Failed to load settings:', error)
				})
		}
	})

	let isPinned = $derived(
		settings?.pinnedNoteIds?.includes(currentNote?.id || '') || false
	)

	function findMatches(
		query: string,
		editorInstance: TiptapEditor | null
	): Array<{ from: number; to: number }> {
		if (!editorInstance || !query.trim()) return []

		const doc = editorInstance.state.doc
		const lowerQuery = query.toLowerCase()
		const matches: Array<{ from: number; to: number }> = []

		doc.descendants((node, nodePos) => {
			if (node.isText && node.text) {
				const text = node.text
				const lowerText = text.toLowerCase()

				let searchPos = 0
				while (searchPos < lowerText.length && matches.length < 500) {
					const index = lowerText.indexOf(lowerQuery, searchPos)
					if (index === -1) break

					const matchFrom = nodePos + index
					const matchTo = matchFrom + query.length

					if (matchTo <= doc.content.size) {
						matches.push({ from: matchFrom, to: matchTo })
					}

					searchPos = index + 1
				}
			}
		})

		return matches
	}

	function updateSearchDecorations(
		matches: Array<{ from: number; to: number }>,
		currentIndex: number,
		editorInstance: TiptapEditor | null
	) {
		if (!editorInstance) return

		try {
			const { state } = editorInstance
			const decorations: Decoration[] = []

			matches.forEach((match, index) => {
				const isActive = index === currentIndex
				decorations.push(
					Decoration.inline(match.from, match.to, {
						class: isActive ? 'search-match-active' : 'search-match'
					})
				)
			})

			const decorationSet = DecorationSet.create(state.doc, decorations)
			const tr = state.tr.setMeta(searchHighlightPluginKey, {
				decorationSet
			})
			editorInstance.view.dispatch(tr)

			if (matches[currentIndex]) {
				const match = matches[currentIndex]
				const { node } = editorInstance.view.domAtPos(match.from)
				const element =
					node.nodeType === Node.ELEMENT_NODE
						? (node as HTMLElement)
						: node.parentElement

				if (element) {
					element.scrollIntoView({
						behavior: 'smooth',
						block: 'center'
					})
				}
			}
		} catch (error) {
			console.error('Failed to update search decorations:', error)
		}
	}

	async function saveImmediately(noteId: string, content: string) {
		isSaving = true
		try {
			lastSave = { noteId, content }
			await saveNote(content, noteId)
		} finally {
			isSaving = false
		}
	}

	async function flushPendingSave() {
		if (saveTimeout) {
			clearTimeout(saveTimeout)
			saveTimeout = null
		}

		if (needsSave && editor && loadedNoteId) {
			needsSave = false
			const markdown = getMarkdown(editor)
			await saveImmediately(loadedNoteId, markdown)
		}
	}

	function scheduleSave() {
		if (saveTimeout) {
			clearTimeout(saveTimeout)
		}

		const savingNoteId = currentNote?.id
		if (!savingNoteId) return

		needsSave = true

		saveTimeout = window.setTimeout(async () => {
			if (currentNote?.id !== savingNoteId || !needsSave) {
				return
			}

			if (editor) {
				needsSave = false
				const markdown = getMarkdown(editor)
				await saveImmediately(savingNoteId, markdown)
			}
		}, 500)
	}

	function closeBlockMathPopup() {
		if (blockMathPopup) {
			blockMathPopup.destroy()
			blockMathPopup = null
		}
	}

	function handleEditBlockMath(pos: number) {
		if (!editor) return

		if (linkPopup) {
			linkPopup.destroy()
			linkPopup = null
		}
		closeBlockMathPopup()

		const node = editor.state.doc.nodeAt(pos)
		if (!node || node.type.name !== 'blockMath') return

		const virtualElement = {
			getBoundingClientRect: () => {
				const nodeDom = editor!.view.nodeDOM(pos)
				if (nodeDom instanceof HTMLElement) {
					return nodeDom.getBoundingClientRect()
				}

				const start = editor!.view.coordsAtPos(pos)
				const end = editor!.view.coordsAtPos(pos + node.nodeSize)
				const left = Math.min(start.left, end.left)
				const top = Math.min(start.top, end.top)
				const right = Math.max(start.right, end.right)
				const bottom = Math.max(start.bottom, end.bottom)

				return {
					width: Math.max(2, right - left),
					height: Math.max(20, bottom - top),
					top,
					left,
					right,
					bottom,
					x: left,
					y: top,
					toJSON: () => ({})
				} as DOMRect
			}
		}

		const component = new SvelteRenderer(BlockMathEditor, {
			props: {
				initialLatex: String(node.attrs.latex ?? ''),
				onsubmit: (latex: string) => {
					const trimmed = latex.trim()
					if (!trimmed) {
						toast.error('Please enter a formula.')
						return
					}
					editor!
						.chain()
						.focus()
						.updateBlockMath({ pos, latex: trimmed })
						.setTextSelection(pos + node.nodeSize)
						.run()
					closeBlockMathPopup()
				},
				oncancel: () => {
					editor!
						.chain()
						.focus()
						.setTextSelection(pos + node.nodeSize)
						.run()
					closeBlockMathPopup()
				}
			},
			editor
		})

		blockMathPopup = tippy(document.body, {
			getReferenceClientRect: () =>
				virtualElement.getBoundingClientRect() as DOMRect,
			appendTo: () => document.body,
			content: component.element,
			showOnCreate: true,
			interactive: true,
			trigger: 'manual',
			placement: 'bottom-start',
			offset: [0, 8],
			onDestroy: () => {
				component.destroy()
			}
		})
	}

	function handleAddBlockMath() {
		if (!editor) return

		closeBlockMathPopup()
		if (linkPopup) {
			linkPopup.destroy()
			linkPopup = null
		}
		const { selection, doc } = editor.state
		const { from, to, empty, $from: resolvedFrom } = selection

		if (
			selection instanceof NodeSelection &&
			selection.node.type.name === 'blockMath'
		) {
			handleEditBlockMath(from)
			return
		}

		if (!empty) {
			const selectedNode = doc.nodeAt(from)
			if (
				selectedNode?.type.name === 'blockMath' &&
				from + selectedNode.nodeSize === to
			) {
				handleEditBlockMath(from)
				return
			}
		}

		if (empty) {
			const nodeBefore = resolvedFrom.nodeBefore
			if (nodeBefore?.type.name === 'blockMath') {
				handleEditBlockMath(from - nodeBefore.nodeSize)
				return
			}
			const nodeAfter = resolvedFrom.nodeAfter
			if (nodeAfter?.type.name === 'blockMath') {
				handleEditBlockMath(from)
				return
			}
		}

		const selectedText = empty ? '' : doc.textBetween(from, to, '\n')
		const initialLatex = normalizeBlockMath(selectedText)
		const targetRange = { from, to }
		const hasSelection = from !== to

		const virtualElement = {
			getBoundingClientRect: () => {
				if (hasSelection) {
					const startPos = editor!.view.domAtPos(from)
					const endPos = editor!.view.domAtPos(to)

					if (startPos && endPos) {
						try {
							const range = document.createRange()
							range.setStart(startPos.node, startPos.offset)
							range.setEnd(endPos.node, endPos.offset)
							return range.getBoundingClientRect()
						} catch (error) {
							console.error(
								'Block math range creation failed:',
								error
							)
						}
					}
				}

				const coords = editor!.view.coordsAtPos(from)
				return {
					width: 2,
					height: 20,
					top: coords.top,
					left: coords.left,
					right: coords.right,
					bottom: coords.bottom,
					x: coords.left,
					y: coords.top,
					toJSON: () => ({})
				} as DOMRect
			}
		}

		const component = new SvelteRenderer(BlockMathEditor, {
			props: {
				initialLatex,
				onsubmit: (latex: string) => {
					const normalizedLatex = latex.trim()
					if (!normalizedLatex) {
						toast.error('Please enter a formula.')
						return
					}

					const inserted = editor!
						.chain()
						.focus()
						.insertContentAt(targetRange, {
							type: 'blockMath',
							attrs: { latex: normalizedLatex }
						})
						.command(({ state, tr, dispatch }) => {
							if (!dispatch) return true

							const { $to: resolvedTo } = tr.selection
							if (resolvedTo.nodeAfter?.isTextblock) {
								tr.setSelection(
									TextSelection.create(
										tr.doc,
										resolvedTo.pos + 1
									)
								)
								tr.scrollIntoView()
								return true
							}

							const paragraphType =
								state.schema.nodes.paragraph ??
								resolvedTo.parent.type.contentMatch.defaultType
							const paragraphNode = paragraphType?.create()
							const insertPos = resolvedTo.nodeAfter
								? resolvedTo.pos
								: resolvedTo.end()

							if (paragraphNode) {
								const resolvedInsertPos =
									tr.doc.resolve(insertPos)
								if (
									resolvedInsertPos.parent.canReplaceWith(
										resolvedInsertPos.index(),
										resolvedInsertPos.index(),
										paragraphNode.type
									)
								) {
									tr.insert(insertPos, paragraphNode)
									tr.setSelection(
										TextSelection.create(
											tr.doc,
											insertPos + 1
										)
									)
									tr.scrollIntoView()
									return true
								}
							}

							tr.scrollIntoView()
							return true
						})
						.run()

					if (inserted) {
						closeBlockMathPopup()
					}
				},
				oncancel: () => {
					editor!.commands.focus()
					closeBlockMathPopup()
				}
			},
			editor
		})

		blockMathPopup = tippy(document.body, {
			getReferenceClientRect: () =>
				virtualElement.getBoundingClientRect() as DOMRect,
			appendTo: () => document.body,
			content: component.element,
			showOnCreate: true,
			interactive: true,
			trigger: 'manual',
			placement: 'bottom-start',
			offset: [0, 8],
			onDestroy: () => {
				component.destroy()
			}
		})
	}

	function handleAddLink() {
		if (!editor) return

		closeBlockMathPopup()

		if (linkPopup) {
			linkPopup.destroy()
			linkPopup = null
		}

		const existingUrl = editor.getAttributes('link').href || ''
		const { from, to } = editor.state.selection
		const hasSelection = from !== to

		const virtualElement = {
			getBoundingClientRect: () => {
				if (hasSelection) {
					const startPos = editor!.view.domAtPos(from)
					const endPos = editor!.view.domAtPos(to)

					if (startPos && endPos) {
						try {
							const range = document.createRange()
							range.setStart(startPos.node, startPos.offset)
							range.setEnd(endPos.node, endPos.offset)
							return range.getBoundingClientRect()
						} catch (e) {
							console.error('Range creation failed:', e)
						}
					}
				}

				const coords = editor!.view.coordsAtPos(from)
				return {
					width: 2,
					height: 20,
					top: coords.top,
					left: coords.left,
					right: coords.right,
					bottom: coords.bottom,
					x: coords.left,
					y: coords.top,
					toJSON: () => ({})
				} as DOMRect
			}
		}

		const component = new SvelteRenderer(LinkEditor, {
			props: {
				initialUrl: existingUrl,
				initialText: hasSelection || existingUrl ? undefined : '',
				onsubmit: (url: string, text?: string) => {
					const normalizedUrl = normalizeUrl(url)
					if (normalizedUrl) {
						if (text !== undefined) {
							if (text.trim()) {
								editor!
									.chain()
									.focus()
									.insertContent({
										type: 'text',
										text: text.trim(),
										marks: [
											{
												type: 'link',
												attrs: { href: normalizedUrl }
											}
										]
									})
									.run()
							}
						} else {
							editor!
								.chain()
								.focus()
								.extendMarkRange('link')
								.setLink({ href: normalizedUrl })
								.run()
						}
					} else {
						editor!
							.chain()
							.focus()
							.extendMarkRange('link')
							.unsetLink()
							.run()
					}
					linkPopup?.destroy()
					linkPopup = null
				},
				onremove: () => {
					editor!
						.chain()
						.focus()
						.extendMarkRange('link')
						.unsetLink()
						.run()
					linkPopup?.destroy()
					linkPopup = null
				},
				oncancel: () => {
					editor!.commands.focus()
					linkPopup?.destroy()
					linkPopup = null
				}
			},
			editor
		})

		linkPopup = tippy(document.body, {
			getReferenceClientRect: () =>
				virtualElement.getBoundingClientRect() as DOMRect,
			appendTo: () => document.body,
			content: component.element,
			showOnCreate: true,
			interactive: true,
			trigger: 'manual',
			placement: 'bottom-start',
			offset: [0, 8],
			onDestroy: () => {
				component.destroy()
			}
		})
	}

	async function handleAddImage() {
		if (!editor) return
		const selected = await openDialog({
			multiple: false,
			filters: [
				{
					name: 'Images',
					extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
				}
			]
		})
		if (selected) {
			try {
				const relativePath = await invoke<string>(
					'copy_image_to_assets',
					{
						sourcePath: selected as string
					}
				)
				const notesFolder = await invoke<string>('get_notes_folder')
				const absolutePath = await join(notesFolder, relativePath)
				const assetUrl = convertFileSrc(absolutePath)

				editor.chain().focus().setImage({ src: assetUrl }).run()
			} catch (error) {
				console.error('Failed to add image:', error)
			}
		}
	}

	// Open & focus search
	function openEditorSearch() {
		searchOpen = true
		requestAnimationFrame(() => {
			searchInputEl?.focus()
		})
	}

	function goToNextMatch() {
		if (searchMatches.length === 0 || !editor) return
		const nextIndex = (currentMatchIndex + 1) % searchMatches.length
		currentMatchIndex = nextIndex
		updateSearchDecorations(searchMatches, nextIndex, editor)
	}

	function goToPreviousMatch() {
		if (searchMatches.length === 0 || !editor) return
		const prevIndex =
			(currentMatchIndex - 1 + searchMatches.length) %
			searchMatches.length
		currentMatchIndex = prevIndex
		updateSearchDecorations(searchMatches, prevIndex, editor)
	}

	function replaceCurrent(replaceText: string) {
		if (!editor || !searchQuery.trim()) return

		const currentMatches = findMatches(searchQuery, editor)
		if (currentMatches.length === 0) return

		const safeIndex = Math.min(currentMatchIndex, currentMatches.length - 1)
		const match = currentMatches[safeIndex]
		if (!match) return

		editor.view.dispatch(
			editor.state.tr.insertText(replaceText, match.from, match.to)
		)

		const newMatches = findMatches(searchQuery, editor)
		searchMatches = newMatches

		if (newMatches.length > 0) {
			const nextPos = match.from + replaceText.length
			const nextIndex = newMatches.findIndex((m) => m.from >= nextPos)
			const resolvedIndex = nextIndex === -1 ? 0 : nextIndex
			currentMatchIndex = resolvedIndex
			updateSearchDecorations(newMatches, resolvedIndex, editor)
		} else {
			currentMatchIndex = 0
			updateSearchDecorations([], 0, editor)
		}
	}

	function replaceAll(replaceText: string) {
		if (!editor || !searchQuery) return
		const currentMatches = findMatches(searchQuery, editor)
		if (currentMatches.length === 0) return

		const tr = editor.state.tr
		for (let i = currentMatches.length - 1; i >= 0; i--) {
			const match = currentMatches[i]
			tr.insertText(replaceText, match.from, match.to)
		}
		editor.view.dispatch(tr)

		const newMatches = findMatches(searchQuery, editor)
		searchMatches = newMatches
		currentMatchIndex = 0
		updateSearchDecorations(newMatches, 0, editor)
	}

	// Debounced search matches
	$effect(() => {
		const q = searchQuery
		if (!q.trim()) {
			searchMatches = []
			currentMatchIndex = 0
			if (editor) {
				updateSearchDecorations([], 0, editor)
			}
			return
		}

		const timer = setTimeout(() => {
			if (!editor) return
			const matches = findMatches(q, editor)
			searchMatches = matches
			currentMatchIndex = 0
			updateSearchDecorations(matches, 0, editor)
		}, 150)

		return () => clearTimeout(timer)
	})

	// Copy handlers
	async function handleCopyMarkdown() {
		if (!editor) return
		try {
			const markdown = getMarkdown(editor)
			await invoke('copy_to_clipboard', { text: markdown })
			toast.success('Copied as Markdown')
		} catch (error) {
			console.error('Failed to copy markdown:', error)
			toast.error('Failed to copy')
		}
	}

	async function handleCopyPlainText() {
		if (!editor) return
		try {
			const markdown = getMarkdown(editor)
			const plainText = plainTextFromMarkdown(markdown)
			await invoke('copy_to_clipboard', { text: plainText })
			toast.success('Copied as plain text')
		} catch (error) {
			console.error('Failed to copy plain text:', error)
			toast.error('Failed to copy')
		}
	}

	async function handleCopyHtml() {
		if (!editor) return
		try {
			let html = editor.getHTML()
			html = html
				.replace(/<pre[^>]*data-frontmatter[^>]*>[\s\S]*?<\/pre>/gi, '')
				.trim()
			await invoke('copy_to_clipboard', { text: html })
			toast.success('Copied as HTML')
		} catch (error) {
			console.error('Failed to copy HTML:', error)
			toast.error('Failed to copy')
		}
	}

	async function handleDownloadPdf() {
		if (!editor || !currentNote) return
		try {
			await downloadPdf(editor, currentNote.title)
		} catch (error) {
			console.error('Failed to open print dialog:', error)
			toast.error('Failed to open print dialog')
		}
	}

	async function handleDownloadMarkdown() {
		if (!editor || !currentNote) return
		try {
			const markdown = getMarkdown(editor)
			const saved = await downloadMarkdown(markdown, currentNote.title)
			if (saved) {
				toast.success('Markdown saved successfully')
			}
		} catch (error) {
			console.error('Failed to download markdown:', error)
			toast.error('Failed to save markdown')
		}
	}

	// Toggle Source Mode
	function toggleSourceMode() {
		if (!editor) return
		const container = scrollContainerEl

		if (!sourceMode) {
			const md = getMarkdown(editor)
			let topBlockIndex = 0
			if (container) {
				const rect = container.getBoundingClientRect()
				try {
					const topPos = editor.view.posAtCoords({
						left: rect.left + rect.width / 2,
						top: rect.top + 10
					})
					if (topPos) {
						const resolved = editor.state.doc.resolve(
							Math.min(topPos.pos, editor.state.doc.content.size)
						)
						topBlockIndex = resolved.index(0)
					}
				} catch {
					// posAtCoords edge case
				}
			}

			let cursorBlockIndex = 0
			try {
				const { from } = editor.state.selection
				const resolved = editor.state.doc.resolve(
					Math.min(from, editor.state.doc.content.size)
				)
				cursorBlockIndex = resolved.index(0)
			} catch {
				// resolve edge case
			}

			sourceContent = md
			sourceMode = true

			tick().then(() => {
				const textarea = container?.querySelector(
					'textarea'
				) as HTMLTextAreaElement | null
				if (!textarea) return

				const blockOffsets = getMarkdownBlockOffsets(md)
				const cursorPos =
					cursorBlockIndex < blockOffsets.length
						? blockOffsets[cursorBlockIndex]
						: md.length
				textarea.setSelectionRange(cursorPos, cursorPos)
				textarea.focus()

				if (topBlockIndex < blockOffsets.length) {
					const charOffset = blockOffsets[topBlockIndex]
					const linesBefore =
						md.slice(0, charOffset).split('\n').length - 1
					const lineHeight =
						parseFloat(getComputedStyle(textarea).lineHeight) || 20
					textarea.scrollTop = linesBefore * lineHeight
				}
			})
		} else {
			const textarea = container?.querySelector(
				'textarea'
			) as HTMLTextAreaElement | null

			let topBlockIndex = 0
			let cursorBlockIndex = 0
			if (textarea) {
				const blockOffsets = getMarkdownBlockOffsets(sourceContent)
				const lineHeight =
					parseFloat(getComputedStyle(textarea).lineHeight) || 20
				const topLine = Math.floor(textarea.scrollTop / lineHeight)
				const lines = sourceContent.split('\n')
				let charOffset = 0
				for (let i = 0; i < Math.min(topLine, lines.length); i++) {
					charOffset += lines[i].length + 1
				}
				for (let i = 0; i < blockOffsets.length; i++) {
					if (blockOffsets[i] <= charOffset) topBlockIndex = i
					if (blockOffsets[i] <= textarea.selectionStart)
						cursorBlockIndex = i
				}
			}

			const manager = editor.storage.markdown?.manager
			if (manager) {
				try {
					const parsed = manager.parse(
						normalizeMarkdownSpacing(sourceContent)
					)
					editor.commands.setContent(parsed)
				} catch {
					editor.commands.setContent(sourceContent)
				}
			} else {
				editor.commands.setContent(sourceContent)
			}
			sourceMode = false

			tick().then(() => {
				requestAnimationFrame(() => {
					if (!editor?.view?.dom?.isConnected) return
					const doc = editor.state.doc
					editor.commands.focus(
						blockIndexToPos(doc, cursorBlockIndex)
					)

					const el = scrollContainerEl
					if (el) {
						try {
							el.scrollTop = 0
							const coords = editor.view.coordsAtPos(
								blockIndexToPos(doc, topBlockIndex)
							)
							const containerRect = el.getBoundingClientRect()
							el.scrollTop = coords.top - containerRect.top
						} catch {
							// coordsAtPos edge case
						}
					}
				})
			})
		}
	}

	function handleSourceChange(value: string) {
		sourceContent = value
		if (sourceTimeout) {
			clearTimeout(sourceTimeout)
		}
		sourceTimeout = window.setTimeout(async () => {
			if (currentNote) {
				isSaving = true
				try {
					lastSave = { noteId: currentNote.id, content: value }
					await saveNote(value, currentNote.id)
				} catch (error) {
					console.error('Failed to save note:', error)
					toast.error('Failed to save note')
				} finally {
					isSaving = false
				}
			}
		}, 300)
	}

	// Load note into editor logic
	function loadNote(note: typeof currentNote, currentReloadVer: number) {
		if (!note || !editor) return

		const isSameNote = note.id === loadedNoteId

		if (!isSameNote) {
			if (
				lastSave?.noteId === loadedNoteId &&
				lastSave?.content === note.content
			) {
				loadedNoteId = note.id
				lastSave = null
				if (needsSave) {
					flushPendingSave()
				}
				return
			}
		}

		if (!isSameNote && needsSave) {
			flushPendingSave()
		}

		if (!isSameNote) {
			sourceMode = false
			if (sourceTimeout) {
				clearTimeout(sourceTimeout)
				sourceTimeout = null
			}
		}

		const isManualReload = currentReloadVer !== lastReloadVersion

		if (isSameNote) {
			if (isManualReload) {
				lastReloadVersion = currentReloadVer
				isLoading = true
				const manager = editor.storage.markdown?.manager
				if (manager) {
					try {
						const parsed = manager.parse(
							normalizeMarkdownSpacing(note.content)
						)
						editor.commands.setContent(parsed)
					} catch {
						editor.commands.setContent(note.content)
					}
				} else {
					editor.commands.setContent(note.content)
				}
				isLoading = false
				return
			}
			return
		}

		const isNewNote = loadedNoteId === null
		const wasEmpty = !isNewNote && note.content?.trim() === ''
		const loadingNoteId = note.id

		loadedNoteId = loadingNoteId

		isLoading = true
		editor.commands.blur()

		const manager = editor.storage.markdown?.manager
		if (manager) {
			try {
				const parsed = manager.parse(
					normalizeMarkdownSpacing(note.content)
				)
				editor.commands.setContent(parsed)
			} catch {
				editor.commands.setContent(note.content)
			}
		} else {
			editor.commands.setContent(note.content)
		}

		scrollContainerEl?.scrollTo(0, 0)

		requestAnimationFrame(() => {
			if (loadedNoteId !== loadingNoteId) return
			scrollContainerEl?.scrollTo(0, 0)
			isLoading = false
			if (!editor) return

			if (
				!previewMode &&
				notesState.consumePendingNewNote?.(loadingNoteId)
			) {
				if (!focusAndSelectTitle(editor)) {
					editor.commands.focus('start')
				}
				return
			}

			if ((isNewNote || wasEmpty) && note.content.trim() === '') {
				const noteListFocused =
					document.activeElement?.closest('[data-note-list]')
				if (!noteListFocused) {
					editor.commands.focus('start')
					editor.commands.selectAll()
				}
			}
		})
	}

	// React to note changes
	$effect(() => {
		const note = currentNote
		const v = reloadVersion
		if (note && editor) {
			untrack(() => {
				loadNote(note, v)
			})
		}
	})

	// Sync wikilink storage
	$effect(() => {
		const notesList = notesState.notes
		if (editor && notesList) {
			const storage = (editor.storage as any).wikilink as
				WikilinkStorage | undefined
			if (storage) storage.notes = notesList
		}
	})

	function mountEditor(node: HTMLElement) {
		// Instantiate TipTap Editor
		const editorInstance = new TiptapEditor({
			element: node,
			textDirection: themeState.textDirection,
			extensions: [
				StarterKit.configure({
					heading: {
						levels: [1, 2, 3, 4, 5, 6]
					},
					codeBlock: false
				}),
				CodeBlockLowlight.extend({
					addNodeView() {
						return SvelteCodeBlockNodeViewRenderer()
					}
				}).configure({
					lowlight,
					defaultLanguage: null
				}),
				Placeholder.configure({
					placeholder: 'Start writing...'
				}),
				Link.configure({
					openOnClick: false,
					HTMLAttributes: {
						class: 'underline cursor-pointer'
					}
				}),
				Extension.create({
					name: 'markdownLinkInputRule',
					addInputRules() {
						return [
							new InputRule({
								find: /\[([^\]]+)\]\(([^)]+)\)$/,
								handler: ({
									state,
									range,
									match,
									commands
								}) => {
									const [, text, rawUrl] = match
									const url = normalizeUrl(rawUrl)
									commands.command(({ tr }) => {
										const linkMark =
											state.schema.marks.link.create({
												href: url
											})
										const textNode = state.schema.text(
											text,
											[linkMark]
										)
										tr.replaceWith(
											range.from,
											range.to,
											textNode
										)
										return true
									})
								}
							})
						]
					}
				}),
				Image.configure({
					inline: false,
					allowBase64: false
				}),
				TaskList,
				TaskItem.configure({
					nested: true
				}),
				TableKit.configure({
					table: {
						resizable: false,
						HTMLAttributes: {
							class: 'not-prose'
						}
					}
				}),
				Frontmatter,
				Markdown.configure({}),
				SearchHighlight.configure({
					matches: [],
					currentIndex: 0
				}),
				SlashCommand,
				Wikilink,
				WikilinkSuggestion,
				ScratchBlockMath.configure({
					katexOptions: {
						throwOnError: false,
						displayMode: true,
						macros: katexMacros
					},
					onClick: (_node, pos) => {
						handleEditBlockMath(pos)
					}
				})
			],
			editorProps: {
				attributes: {
					class: 'prose prose-lg dark:prose-invert max-w-3xl mx-auto focus:outline-none min-h-full px-6 pt-8 pb-32',
					spellcheck: 'true',
					autocorrect: 'on',
					autocapitalize: 'sentences'
				},
				clipboardTextSerializer: (slice) => {
					const fallback = slice.content.textBetween(
						0,
						slice.content.size,
						'\n\n'
					)
					const currentEd = editor
					const manager = currentEd?.storage.markdown?.manager
					if (!currentEd || !manager) return fallback
					try {
						const doc = currentEd.schema.topNodeType.create(
							null,
							slice.content
						)
						return cleanSerializedMarkdown(
							manager.serialize(doc.toJSON())
						)
					} catch {
						return fallback
					}
				},
				handleKeyDown: (_view, event) => {
					if (event.key === 'Tab') {
						return false
					}
					if (
						event.key === 'Enter' &&
						!event.shiftKey &&
						!event.metaKey &&
						!event.ctrlKey &&
						!event.altKey
					) {
						const { state } = _view
						const { $from: selectionFrom, empty } = state.selection
						if (empty && selectionFrom.depth === 1) {
							const parent = selectionFrom.parent
							if (
								parent.type.name === 'paragraph' &&
								parent.content.size === 0
							) {
								return true
							}
						}
					}
					return false
				},
				handlePaste: (_view, event) => {
					const clipboardData = event.clipboardData
					if (!clipboardData) return false

					const items = Array.from(clipboardData.items)
					const imageItem = items.find((item) =>
						item.type.startsWith('image/')
					)

					if (imageItem) {
						const blob = imageItem.getAsFile()
						if (blob) {
							const reader = new FileReader()
							reader.onload = async () => {
								const base64 = (reader.result as string).split(
									','
								)[1]
								try {
									const relativePath = await invoke<string>(
										'save_clipboard_image',
										{ base64Data: base64 }
									)
									const notesFolder =
										await invoke<string>('get_notes_folder')
									const absolutePath = await join(
										notesFolder,
										relativePath
									)
									const assetUrl =
										convertFileSrc(absolutePath)

									editor
										?.chain()
										.focus()
										.setImage({ src: assetUrl })
										.run()
								} catch (error) {
									console.error(
										'Failed to paste image:',
										error
									)
									toast.error('Failed to paste image')
								}
							}
							reader.onerror = () => {
								console.error(
									'Failed to read clipboard image:',
									reader.error
								)
								toast.error('Failed to read clipboard image')
							}
							reader.readAsDataURL(blob)
							return true
						}
					}

					const text = clipboardData.getData('text/plain')
					if (!text) return false

					const markdownPatterns =
						/^#{1,6}\s|^\s*[-*+]\s|^\s*\d+\.\s|^\s*>\s|```|^\s*\[.*\]\(.*\)|^\s*!\[|\*\*.*\*\*|__.*__|~~.*~~|^\s*[-*_]{3,}\s*$|^\|.+\||\$\$[\s\S]+?\$\$/m
					if (!markdownPatterns.test(text)) {
						return false
					}

					const currentEd = editor
					if (!currentEd) return false

					const manager = currentEd.storage.markdown?.manager
					if (manager && typeof manager.parse === 'function') {
						try {
							const parsed = manager.parse(
								normalizeMarkdownSpacing(text)
							)
							if (parsed) {
								currentEd.commands.insertContent(parsed)
								return true
							}
						} catch {
							// fallback
						}
					}

					return false
				}
			},
			onUpdate: () => {
				if (isLoading) return
				scheduleSave()
			}
		})

		editor = editorInstance
		onEditorReady?.(editorInstance)

		// Initial note load if note is already selected
		if (currentNote) {
			loadNote(currentNote, reloadVersion)
		}

		// Wikilink click and external link click handler
		const handleEditorClick = (e: MouseEvent) => {
			const target = e.target as HTMLElement

			const wikilinkEl = target.closest('[data-wikilink]')
			if (wikilinkEl) {
				e.preventDefault()
				const noteTitle = wikilinkEl.getAttribute('data-note-title')
				const allNotes = notesState.notes
				if (noteTitle && allNotes) {
					const note = allNotes.find(
						(n) => n.title.toLowerCase() === noteTitle.toLowerCase()
					)
					if (note) {
						notesState.selectNote(note.id)
					} else {
						toast.info(`Note "${noteTitle}" does not exist yet`)
					}
				}
				return
			}

			const link = target.closest('a')
			if (link) {
				e.preventDefault()
				if ((e.metaKey || e.ctrlKey) && link.href) {
					const rawHref = link.getAttribute('href') ?? ''
					const normalizedHref = normalizeUrl(rawHref)
					if (isAllowedUrlScheme(normalizedHref)) {
						openUrl(normalizedHref).catch((error) =>
							console.error('Failed to open link:', error)
						)
					} else {
						toast.error('Cannot open links with this URL scheme')
					}
				}
			}
		}

		const domEl = editorInstance.view.dom
		domEl.addEventListener('click', handleEditorClick)

		// Custom event listeners
		const slashImageHandler = () => handleAddImage()
		const slashMathHandler = () => handleAddBlockMath()
		const printHandler = () => handleDownloadPdf()
		const toggleSourceHandler = () => toggleSourceMode()

		window.addEventListener('slash-command-image', slashImageHandler)
		window.addEventListener('slash-command-block-math', slashMathHandler)
		window.addEventListener('print-note', printHandler)
		window.addEventListener('toggle-source-mode', toggleSourceHandler)

		// Global Keydown listeners
		const handleGlobalKeyDown = (e: KeyboardEvent) => {
			// Cmd/Ctrl+K: Add link (when editor is focused)
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				const target = e.target as HTMLElement
				const isInEditor = target.closest('.ProseMirror')
				if (isInEditor && editor) {
					e.preventDefault()
					handleAddLink()
					return
				}
			}

			// Cmd+Shift+C: Open export menu
			if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'c') {
				e.preventDefault()
				copyMenuOpen = true
				return
			}

			// Search shortcuts
			const openFind =
				(e.metaKey || e.ctrlKey) &&
				!e.shiftKey &&
				!e.altKey &&
				e.key.toLowerCase() === 'f'
			const openReplace = isMac
				? e.metaKey && e.altKey && !e.shiftKey && e.code === 'KeyF'
				: e.ctrlKey &&
					!e.shiftKey &&
					!e.altKey &&
					e.key.toLowerCase() === 'h'

			if (openFind || openReplace) {
				if (!currentNote || !editor) return
				const target = e.target as HTMLElement
				const tagName = target.tagName.toLowerCase()

				if (
					(tagName === 'input' || tagName === 'textarea') &&
					!target.closest('.ProseMirror') &&
					!target.closest('.search-toolbar-container')
				) {
					return
				}

				if (target.closest('[class*="sidebar"]')) {
					return
				}

				e.preventDefault()
				if (openReplace) {
					isReplaceOpen = true
				}
				openEditorSearch()
			}
		}

		document.addEventListener('keydown', handleGlobalKeyDown)

		return {
			destroy() {
				domEl.removeEventListener('click', handleEditorClick)
				window.removeEventListener(
					'slash-command-image',
					slashImageHandler
				)
				window.removeEventListener(
					'slash-command-block-math',
					slashMathHandler
				)
				window.removeEventListener('print-note', printHandler)
				window.removeEventListener(
					'toggle-source-mode',
					toggleSourceHandler
				)
				document.removeEventListener('keydown', handleGlobalKeyDown)

				if (saveTimeout) clearTimeout(saveTimeout)
				if (sourceTimeout) clearTimeout(sourceTimeout)
				if (linkPopup) linkPopup.destroy()
				if (blockMathPopup) blockMathPopup.destroy()

				if (needsSave && editorInstance) {
					const manager = editorInstance.storage.markdown?.manager
					const markdown = manager
						? cleanSerializedMarkdown(
								manager.serialize(editorInstance.getJSON())
							)
						: editorInstance.getText()
					saveNote(markdown)
				}

				editorInstance.destroy()
				editor = null
				onEditorReady?.(null)
			}
		}
	}

	let noteText = $derived(
		editor ? editor.getText() : currentNote?.content || ''
	)
	let charCount = $derived(noteText.length)
	let wordCount = $derived(
		noteText.trim() ? noteText.trim().split(/\s+/).length : 0
	)
	let readTime = $derived(Math.max(1, Math.ceil(wordCount / 200)))
</script>

{#if !currentNote}
	{#if previewMode}
		<div class="flex-1 flex flex-col bg-bg">
			<div
				class="h-10 shrink-0 flex items-end px-4 pb-1"
				data-tauri-drag-region
			></div>
			<div class="flex-1 flex items-center justify-center">
				<SpinnerIcon class="w-6 h-6 text-text-muted animate-spin" />
			</div>
		</div>
	{:else if notesState.selectedNoteId}
		<div class="flex-1 flex flex-col bg-bg">
			<div
				class="h-10 shrink-0 flex items-end px-4 pb-1"
				data-tauri-drag-region
			></div>
			<div class="flex-1 flex items-center justify-center">
				<SpinnerIcon class="w-6 h-6 text-text-muted animate-spin" />
			</div>
		</div>
	{:else}
		<div class="flex-1 flex flex-col bg-bg">
			<div
				class="h-10 shrink-0 flex items-end px-4 pb-1"
				data-tauri-drag-region
			></div>
			<div class="flex-1 flex items-center justify-center pb-8">
				<div class="text-center text-text-muted select-none">
					<div
						role="img"
						aria-label="Note"
						class="w-42 aspect-square mx-auto mb-1"
						style="background-color: var(--color-text); -webkit-mask-image: url(/note-dark.png); -webkit-mask-size: contain; -webkit-mask-repeat: no-repeat; -webkit-mask-position: center; mask-image: url(/note-dark.png); mask-size: contain; mask-repeat: no-repeat; mask-position: center;"
					></div>
					<h1
						class="text-2xl text-text font-serif mb-1 tracking-[-0.01em]"
					>
						What's on your mind?
					</h1>
					<p class="text-sm">
						Pick up where you left off, or start something new
					</p>
					<Button
						onclick={() => notesState.createNote()}
						variant="secondary"
						size="md"
						class="mt-4"
					>
						New Note <span class="text-text-muted ml-1"
							>{mod}{isMac ? '' : '+'}N</span
						>
					</Button>
				</div>
			</div>
		</div>
	{/if}
{:else}
	<div
		data-editor-column
		class="flex-1 flex flex-col bg-bg overflow-hidden relative"
	>
		<!-- Braun Sub-header Tooling Strip -->
		<div
			data-sub-header
			class={cn(
				'h-10 px-6 border-b shrink-0 flex items-center justify-between select-none bg-bg-secondary border-border',
				focusMode &&
					'transition-all duration-300 ease-out opacity-0 pointer-events-none !h-0 !p-0 overflow-hidden border-b-0'
			)}
		>
			<div
				class="flex items-center gap-2 text-xs text-text-muted min-w-0 flex-1 mr-3 overflow-hidden"
			>
				{#if onToggleSidebar}
					<IconButton
						onclick={onToggleSidebar}
						title={sidebarVisible
							? `Hide library (${mod}${isMac ? '' : '+'}\\)`
							: `Show library (${mod}${isMac ? '' : '+'}\\)`}
						class="shrink-0 -ml-1 mr-0.5"
					>
						<PanelLeftIcon class="w-4 h-4 stroke-[1.5]" />
					</IconButton>
				{/if}

				<span
					class="font-mono text-[11px] font-medium tracking-wide shrink-0 hidden sm:inline"
				>
					{formatBraunDate(currentNote.modified)}
				</span>
				<span class="text-border shrink-0 hidden sm:inline">•</span>

				<TagBar
					noteId={currentNote.id}
					tags={currentNote.tags || []}
					tagColors={settings?.tagColors}
				/>

				<CalendarWidget {onOpenCalendar} {onOpenSettings} />

				<!-- Saving / Sync status -->
				<div class="flex items-center ml-1">
					{#if hasExternalChanges}
						<Tooltip
							content={`External changes detected (${mod}${isMac ? '' : '+'}R to refresh)`}
						>
							<button
								type="button"
								onclick={reloadCurrentNote}
								class="h-6 px-1.5 flex items-center gap-1 text-[11px] text-text-muted hover:bg-bg-emphasis rounded transition-colors font-medium cursor-pointer"
							>
								<RefreshCwIcon
									class="w-3.5 h-3.5 stroke-[1.6]"
								/>
								<span>Refresh</span>
							</button>
						</Tooltip>
					{:else if isSaving}
						<Tooltip content="Saving...">
							<div
								class="h-6 w-6 flex items-center justify-center"
							>
								<SpinnerIcon
									class="w-3.5 h-3.5 text-text-muted/50 stroke-[1.5] animate-spin"
								/>
							</div>
						</Tooltip>
					{:else}
						<Tooltip content="All changes saved">
							<div
								class="h-6 w-6 flex items-center justify-center"
							>
								<CircleCheckIcon
									class="w-3.5 h-3.5 stroke-[1.5] text-text-muted/40"
								/>
							</div>
						</Tooltip>
					{/if}
				</div>
			</div>

			<div class="titlebar-no-drag flex items-center gap-2 shrink-0">
				<!-- Zen Focus Button -->
				{#if onToggleFocusMode}
					<button
						type="button"
						onclick={onToggleFocusMode}
						class="text-xs px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 bg-bg border border-border text-text hover:bg-bg-muted font-medium cursor-pointer shadow-2xs group"
						title="Enter Fullscreen Zen Focus Mode"
					>
						<ZenIcon
							class="w-3.5 h-3.5 stroke-[1.8] text-text-muted group-hover:text-text transition-colors"
						/>
						<span>Focus</span>
					</button>
				{/if}

				<!-- Export Dropdown -->
				<DropdownMenu.Root bind:open={copyMenuOpen}>
					<Tooltip
						content={`Export (${mod}${isMac ? '' : '+'}${shift}${isMac ? '' : '+'}C)`}
					>
						<DropdownMenu.Trigger>
							{#snippet child({ props })}
								<button
									{...props}
									type="button"
									class="text-xs px-2.5 py-1 rounded-md transition-all flex items-center gap-1.5 bg-bg border border-border text-text hover:bg-bg-muted font-medium cursor-pointer shadow-2xs group"
									title="Export"
								>
									<ShareIcon
										class="w-3.5 h-3.5 stroke-[1.8] text-text-muted group-hover:text-text transition-colors"
									/>
									<span>Export</span>
								</button>
							{/snippet}
						</DropdownMenu.Trigger>
					</Tooltip>

					<DropdownMenu.Portal>
						<DropdownMenu.Content
							class="min-w-40 bg-bg border border-border rounded-xl shadow-xl py-1 z-50 text-xs text-text"
							sideOffset={5}
							align="end"
						>
							<DropdownMenu.Item
								class="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2"
								onSelect={handleCopyMarkdown}
							>
								<CopyIcon class="w-3.5 h-3.5 stroke-[1.6]" />
								Copy Markdown
							</DropdownMenu.Item>
							<DropdownMenu.Item
								class="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2"
								onSelect={handleCopyPlainText}
							>
								<CopyIcon class="w-3.5 h-3.5 stroke-[1.6]" />
								Copy Plain Text
							</DropdownMenu.Item>
							<DropdownMenu.Item
								class="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2"
								onSelect={handleCopyHtml}
							>
								<CopyIcon class="w-3.5 h-3.5 stroke-[1.6]" />
								Copy HTML
							</DropdownMenu.Item>
							<DropdownMenu.Separator
								class="h-px bg-border my-1"
							/>
							<DropdownMenu.Item
								class="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2"
								onSelect={handleDownloadPdf}
							>
								<DownloadIcon
									class="w-3.5 h-3.5 stroke-[1.6]"
								/>
								Print as PDF
							</DropdownMenu.Item>
							<DropdownMenu.Item
								class="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2"
								onSelect={handleDownloadMarkdown}
							>
								<DownloadIcon
									class="w-3.5 h-3.5 stroke-[1.6]"
								/>
								Export Markdown
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Portal>
				</DropdownMenu.Root>

				<!-- Pin / Unpin Note -->
				{#if currentNote && !previewMode}
					<Tooltip content={isPinned ? 'Unpin note' : 'Pin note'}>
						<IconButton
							onclick={async () => {
								if (!currentNote) return
								try {
									if (isPinned) {
										await notesState.unpinNote(
											currentNote.id
										)
										toast.success('Note unpinned')
									} else {
										await notesState.pinNote(currentNote.id)
										toast.success('Note pinned')
									}
									const updatedSettings =
										await notesService.getSettings()
									settings = updatedSettings
								} catch (error) {
									console.error(
										'Failed to pin/unpin note:',
										error
									)
									toast.error(
										`Failed to ${isPinned ? 'unpin' : 'pin'} note: ${
											error instanceof Error
												? error.message
												: 'Unknown error'
										}`
									)
								}
							}}
						>
							<PinIcon
								class={cn(
									'w-4 h-4 stroke-[1.4]',
									isPinned && 'fill-accent text-accent'
								)}
							/>
						</IconButton>
					</Tooltip>
				{/if}

				<!-- Save to Folder -->
				{#if onSaveToFolder}
					<Tooltip content="Save in Folder">
						<IconButton
							onclick={onSaveToFolder}
							aria-label="Save in Folder"
							disabled={saveToFolderDisabled}
						>
							{#if saveToFolderDisabled}
								<SpinnerIcon class="w-4 h-4 animate-spin" />
							{:else}
								<FolderPlusIcon class="w-4 h-4 stroke-[1.6]" />
							{/if}
						</IconButton>
					</Tooltip>
				{/if}

				<!-- Find in Note -->
				{#if currentNote}
					<Tooltip
						content={`Find in note (${mod}${isMac ? '' : '+'}F)`}
					>
						<IconButton onclick={openEditorSearch}>
							<SearchIcon class="w-4 h-4 stroke-[1.6]" />
						</IconButton>
					</Tooltip>
				{/if}

				<!-- Toggle Markdown Source Mode -->
				{#if currentNote}
					<Tooltip
						content={sourceMode
							? `View Formatted (${mod}${isMac ? '' : '+'}${shift}${isMac ? '' : '+'}M)`
							: `View Markdown Source (${mod}${isMac ? '' : '+'}${shift}${isMac ? '' : '+'}M)`}
					>
						<IconButton onclick={toggleSourceMode}>
							{#if sourceMode}
								<MarkdownOffIcon class="w-4 h-4 stroke-[1.4]" />
							{:else}
								<MarkdownIcon class="w-4 h-4 stroke-[1.4]" />
							{/if}
						</IconButton>
					</Tooltip>
				{/if}
			</div>
		</div>

		<!-- Editor content area with resize handles overlay -->
		<div data-editor-content-area class="flex-1 relative overflow-hidden">
			{#if !focusMode && !sourceMode}
				<EditorWidthHandles containerEl={scrollContainerEl} />
			{/if}

			<div
				data-editor-scroll
				bind:this={scrollContainerEl}
				class="absolute inset-0 overflow-y-auto overflow-x-hidden"
				dir={themeState.textDirection}
			>
				{#if sourceMode}
					<!-- Markdown source textarea -->
					<div class="h-full">
						<textarea
							value={sourceContent}
							oninput={(e) =>
								handleSourceChange(
									(e.target as HTMLTextAreaElement).value
								)}
							wrap="off"
							dir={themeState.textDirection}
							class="w-full h-full bg-transparent text-text focus:outline-none resize-none px-6 pt-8 pb-24 mx-auto block"
							style="max-width: var(--editor-max-width, 48rem); font-family: ui-monospace, 'SF Mono', SFMono-Regular, Menlo, Monaco, 'Courier New', monospace; font-size: 0.875em; line-height: var(--editor-line-height); tab-size: 2;"
							spellcheck="false"></textarea>
					</div>
				{/if}

				<div class="h-full" class:hidden={sourceMode}>
					{#if searchOpen && !sourceMode}
						<div
							class="sticky top-2 z-10 animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-none pr-2 flex justify-end"
						>
							<div class="pointer-events-auto">
								<SearchToolbar
									bind:inputEl={searchInputEl}
									query={searchQuery}
									onchange={(q) => (searchQuery = q)}
									onnext={goToNextMatch}
									onprevious={goToPreviousMatch}
									onclose={() => {
										searchOpen = false
										searchQuery = ''
										replaceQuery = ''
										isReplaceOpen = false
										searchMatches = []
										currentMatchIndex = 0
										if (editor) {
											updateSearchDecorations(
												[],
												0,
												editor
											)
											editor.commands.focus()
										}
									}}
									currentMatch={searchMatches.length === 0
										? 0
										: currentMatchIndex + 1}
									totalMatches={searchMatches.length}
									{replaceQuery}
									onreplacechange={(v) => (replaceQuery = v)}
									onreplace={() =>
										replaceCurrent(replaceQuery)}
									onreplaceall={() =>
										replaceAll(replaceQuery)}
									{isReplaceOpen}
									ontogglereplace={() =>
										(isReplaceOpen = !isReplaceOpen)}
								/>
							</div>
						</div>
					{/if}

					<!-- Context menu for table manipulation & TipTap container -->
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<div
						class="h-full"
						oncontextmenu={async (e) => {
							if (!editor) return

							const clickPos = editor.view.posAtCoords({
								left: e.clientX,
								top: e.clientY
							})
							if (!clickPos) return

							editor
								.chain()
								.focus()
								.setTextSelection(clickPos.pos)
								.run()
							if (!editor.isActive('table')) return

							e.preventDefault()

							try {
								const { state } = editor
								const { selection } = state
								const { $anchor: anchorResolved } = selection

								let cellDepth = anchorResolved.depth
								while (
									cellDepth > 0 &&
									state.doc
										.resolve(anchorResolved.pos)
										.node(cellDepth).type.name !==
										'tableCell' &&
									state.doc
										.resolve(anchorResolved.pos)
										.node(cellDepth).type.name !==
										'tableHeader'
								) {
									cellDepth--
								}

								if (cellDepth <= 0) return

								const resolvedNode = state.doc
									.resolve(anchorResolved.pos)
									.node(cellDepth)
								if (
									resolvedNode.type.name !== 'tableCell' &&
									resolvedNode.type.name !== 'tableHeader'
								) {
									return
								}

								const cellPos = anchorResolved.before(cellDepth)
								const rowNode = state.doc
									.resolve(cellPos)
									.node(cellDepth - 1)
								let cellIndex = 0
								rowNode.forEach((_node, offset) => {
									if (
										offset <
										cellPos -
											anchorResolved.before(
												cellDepth - 1
											) -
											1
									) {
										cellIndex++
									}
								})
								const isFirstColumn = cellIndex === 0

								const tableNode = state.doc
									.resolve(cellPos)
									.node(cellDepth - 2)
								let rowIndex = 0
								tableNode.forEach((_node, offset) => {
									if (
										offset <
										anchorResolved.before(cellDepth - 1) -
											anchorResolved.before(
												cellDepth - 2
											) -
											1
									) {
										rowIndex++
									}
								})
								const isFirstRow = rowIndex === 0

								const menuItems = []

								if (!isFirstColumn) {
									menuItems.push(
										await MenuItem.new({
											text: 'Add Column Before',
											action: () =>
												editor
													?.chain()
													.focus()
													.addColumnBefore()
													.run()
										})
									)
								}
								menuItems.push(
									await MenuItem.new({
										text: 'Add Column After',
										action: () =>
											editor
												?.chain()
												.focus()
												.addColumnAfter()
												.run()
									})
								)
								menuItems.push(
									await MenuItem.new({
										text: 'Delete Column',
										action: () =>
											editor
												?.chain()
												.focus()
												.deleteColumn()
												.run()
									})
								)
								menuItems.push(
									await PredefinedMenuItem.new({
										item: 'Separator'
									})
								)

								if (!isFirstRow) {
									menuItems.push(
										await MenuItem.new({
											text: 'Add Row Above',
											action: () =>
												editor
													?.chain()
													.focus()
													.addRowBefore()
													.run()
										})
									)
								}
								menuItems.push(
									await MenuItem.new({
										text: 'Add Row Below',
										action: () =>
											editor
												?.chain()
												.focus()
												.addRowAfter()
												.run()
									})
								)
								menuItems.push(
									await MenuItem.new({
										text: 'Delete Row',
										action: () =>
											editor
												?.chain()
												.focus()
												.deleteRow()
												.run()
									})
								)
								menuItems.push(
									await PredefinedMenuItem.new({
										item: 'Separator'
									})
								)
								menuItems.push(
									await MenuItem.new({
										text: 'Toggle Header Row',
										action: () =>
											editor
												?.chain()
												.focus()
												.toggleHeaderRow()
												.run()
									})
								)
								menuItems.push(
									await MenuItem.new({
										text: 'Toggle Header Column',
										action: () =>
											editor
												?.chain()
												.focus()
												.toggleHeaderColumn()
												.run()
									})
								)
								menuItems.push(
									await PredefinedMenuItem.new({
										item: 'Separator'
									})
								)
								menuItems.push(
									await MenuItem.new({
										text: 'Delete Table',
										action: () =>
											editor
												?.chain()
												.focus()
												.deleteTable()
												.run()
									})
								)

								const menu = await Menu.new({
									items: menuItems
								})
								await menu.popup()
							} catch (err) {
								console.error('Table context menu error:', err)
							}
						}}
					>
						<!-- TipTap Mount Target -->
						<div use:mountEditor class="h-full text-text"></div>
					</div>
				</div>
			</div>

			<!-- Floating Braun Spanned Tool Deck -->
			{#if !sourceMode && !focusMode && editor}
				<FloatingFormatBar
					{editor}
					onAddLink={handleAddLink}
					onAddBlockMath={handleAddBlockMath}
					onAddImage={handleAddImage}
				/>
			{/if}
		</div>

		<!-- Exit Zen Focus Floating Button -->
		{#if focusMode && onToggleFocusMode}
			<button
				type="button"
				onclick={onToggleFocusMode}
				class="fixed top-4 right-4 z-50 px-2.5 py-1 rounded-md bg-bg-secondary/90 hover:bg-bg-secondary border border-border text-text-muted hover:text-text text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
				title="Exit Focus Mode (Esc)"
			>
				<ZenIcon class="w-3.5 h-3.5 stroke-[1.8]" />
				<span>Exit Focus</span>
			</button>
		{/if}

		<!-- Bottom Telemetry Footer -->
		{#if !focusMode}
			<footer
				class="h-7 px-6 border-t border-border bg-bg-secondary flex items-center justify-between text-[11px] font-mono select-none text-text-muted shrink-0 z-10"
			>
				<div class="flex items-center gap-3">
					<span>CHARACTERS: {charCount.toLocaleString()}</span>
					<span class="text-border">•</span>
					<span>READ TIME: {readTime} MIN</span>
				</div>
				<div class="flex items-center gap-2">
					<span
						class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.4)]"
					></span>
					<span>BRAUN TYPOGRAPHIC GRID // 8PX BASE</span>
				</div>
			</footer>
		{/if}
	</div>
{/if}
