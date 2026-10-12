<script lang="ts">
	import { ContextMenu } from 'bits-ui'
	import { notesState } from '../../context/notes.svelte'
	import * as notesService from '../../services/notes'
	import type { Settings } from '../../types/note'
	import { getTagColor } from '../../lib/tags'
	import { cleanTitle } from '../../lib/utils'
	import { countWords, countMarkdownWords } from '../../lib/plainText'
	import { TrashIcon, CopyIcon } from '../icons'
	import { toast } from 'svelte-sonner'
	import {
		AlertDialog,
		AlertDialogAction,
		AlertDialogCancel,
		AlertDialogContent,
		AlertDialogDescription,
		AlertDialogFooter,
		AlertDialogHeader,
		AlertDialogTitle
	} from '../ui'

	function formatTimestamp(timestamp: number): string {
		const date = new Date(timestamp * 1000)
		const now = new Date()
		const startOfToday = new Date(
			now.getFullYear(),
			now.getMonth(),
			now.getDate()
		)
		const startOfYesterday = new Date(startOfToday.getTime() - 86400000)

		if (date >= startOfToday) {
			return `Today, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
		}
		if (date >= startOfYesterday) {
			return `Yesterday, ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
		}
		return date.toLocaleDateString([], {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		})
	}

	function formatWordCount(
		count?: number,
		preview?: string,
		title?: string
	): string {
		const titleWords = title ? countWords(title) : 0

		if (typeof count === 'number') {
			const effectiveCount =
				count === 0 && titleWords > 0 ? titleWords : count
			if (
				effectiveCount === 0 &&
				(!preview || !preview.trim()) &&
				(!title || !title.trim())
			) {
				return 'Empty'
			}
			return effectiveCount === 1
				? '1 word'
				: `${effectiveCount.toLocaleString()} words`
		}

		const previewWords = preview ? countWords(preview) : 0
		const total = titleWords + previewWords
		if (total === 0) return 'Empty'
		return total === 1 ? '1 word' : `${total.toLocaleString()} words`
	}

	let settings = $state<Settings | null>(null)
	let filterQuery = $state('')
	let deleteTargetId = $state<string | null>(null)

	$effect(() => {
		void notesState.notes
		notesService
			.getSettings()
			.then((s) => {
				settings = s
			})
			.catch((err) =>
				console.error('Failed to load settings in BraunNoteList:', err)
			)
	})

	let filteredNotes = $derived.by(() => {
		let result = notesState.notes
		if (notesState.activeTagFilter) {
			result = result.filter(
				(n) =>
					n.tags &&
					Array.isArray(n.tags) &&
					n.tags.includes(notesState.activeTagFilter!)
			)
		}
		if (filterQuery.trim()) {
			const q = filterQuery.toLowerCase()
			result = result.filter(
				(n) =>
					n.title.toLowerCase().includes(q) ||
					(n.preview && n.preview.toLowerCase().includes(q))
			)
		}
		return result
	})

	async function handleDeleteConfirm() {
		if (!deleteTargetId) return
		try {
			await notesState.deleteNote(deleteTargetId)
			toast.success('Note deleted')
		} catch {
			toast.error('Failed to delete note')
		} finally {
			deleteTargetId = null
		}
	}
</script>

<div
	data-note-list
	class="w-full h-full flex flex-col bg-bg border-r border-border select-none overflow-hidden transition-colors"
>
	<!-- Search Filter Header -->
	<div class="p-2.5 border-b border-border shrink-0">
		<div class="relative">
			<input
				type="text"
				bind:value={filterQuery}
				placeholder="Filter notes..."
				class="w-full text-xs px-3 py-1.5 rounded-lg outline-none transition-all bg-bg-secondary border border-border text-text placeholder:text-text-muted/60 focus:border-accent"
			/>
			{#if filterQuery}
				<button
					type="button"
					onclick={() => (filterQuery = '')}
					class="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs cursor-pointer"
				>
					×
				</button>
			{/if}
		</div>
	</div>

	<!-- Note Cards List -->
	<div class="flex-1 overflow-y-auto p-2.5 space-y-2">
		{#if filteredNotes.length === 0}
			<div class="p-4 text-center text-xs text-text-muted font-sans">
				No notes found
			</div>
		{:else}
			{#each filteredNotes as note (note.id)}
				{@const isSelected = notesState.selectedNoteId === note.id}
				{@const title = cleanTitle(note.title) || 'Untitled Note'}
				{@const previewText =
					note.preview || 'No content in this note yet...'}
				{@const currentN = notesState.currentNote}
				{@const rawWordCount = note.wordCount ?? note.word_count}
				{@const noteWordCount =
					isSelected &&
					currentN &&
					typeof currentN.content === 'string'
						? countMarkdownWords(currentN.content)
						: typeof rawWordCount === 'number'
							? rawWordCount
							: undefined}

				<ContextMenu.Root>
					<ContextMenu.Trigger>
						{#snippet child({ props })}
							<div
								{...props}
								role="button"
								tabindex={0}
								onclick={() => notesState.selectNote(note.id)}
								onkeydown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										notesState.selectNote(note.id)
									}
								}}
								class={`p-3 rounded-xl border transition-all duration-100 ease-braun-snappy tactile-press cursor-pointer relative select-none ${
									isSelected
										? 'bg-bg-card border-border shadow-xs dark:bg-[#23252A]'
										: 'bg-bg-secondary/40 border-transparent hover:bg-bg-secondary hover:border-border/40 text-text'
								}`}
							>
								<!-- Top Row: Title & Active Indicator / Tag Badge -->
								<div
									class="flex items-center justify-between mb-1 gap-2"
								>
									<h3
										class={`text-xs font-bold truncate ${
											isSelected
												? 'text-text'
												: 'text-text/90'
										}`}
									>
										{title}
									</h3>

									<!-- Right indicators -->
									<div
										class="flex items-center gap-1.5 shrink-0"
									>
										{#if note.tags && note.tags.length > 0}
											<div
												class="flex items-center gap-1 max-w-[120px] overflow-hidden"
											>
												{#each note.tags.slice(0, 2) as t (t)}
													{@const color = getTagColor(
														t,
														settings?.tagColors
													)}
													<span
														class="text-[9px] font-mono px-1.5 py-0.2 rounded-full border truncate"
														style:background-color="{color}18"
														style:border-color="{color}30"
														style:color
													>
														#{t}
													</span>
												{/each}
												{#if note.tags.length > 2}
													<span
														class="text-[9px] font-mono text-text-muted/60"
													>
														+{note.tags.length - 2}
													</span>
												{/if}
											</div>
										{/if}
										{#if isSelected}
											<span
												class="w-2 h-2 rounded-full shrink-0 shadow-xs bg-accent"
												title="Active Note"
											></span>
										{/if}
									</div>
								</div>

								<!-- Middle Row: 2-line Preview -->
								<p
									class="text-[11px] line-clamp-2 leading-relaxed mb-2 text-text-muted"
								>
									{previewText}
								</p>

								<!-- Bottom Row: Timestamp & Word Count in Monospace -->
								<div
									class="flex items-center justify-between text-[10px] font-mono text-text-muted/70"
								>
									<span>{formatTimestamp(note.modified)}</span
									>
									<span
										>{formatWordCount(
											noteWordCount,
											note.preview,
											title
										)}</span
									>
								</div>
							</div>
						{/snippet}
					</ContextMenu.Trigger>

					<ContextMenu.Portal>
						<ContextMenu.Content
							class="min-w-44 bg-bg border border-border rounded-xl shadow-xl py-1 z-50 text-xs text-text"
						>
							<ContextMenu.Item
								class="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2"
								onSelect={() =>
									notesState.duplicateNote(note.id)}
							>
								<CopyIcon class="w-3.5 h-3.5 stroke-[1.8]" />
								<span>Duplicate Note</span>
							</ContextMenu.Item>
							<ContextMenu.Item
								class="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2 text-red-500 hover:text-red-600"
								onSelect={() => (deleteTargetId = note.id)}
							>
								<TrashIcon class="w-3.5 h-3.5 stroke-[1.8]" />
								<span>Delete Note</span>
							</ContextMenu.Item>
						</ContextMenu.Content>
					</ContextMenu.Portal>
				</ContextMenu.Root>
			{/each}
		{/if}
	</div>

	<!-- Delete Confirmation Alert Dialog -->
	<AlertDialog
		open={Boolean(deleteTargetId)}
		onOpenChange={(open) => !open && (deleteTargetId = null)}
	>
		<AlertDialogContent>
			<AlertDialogHeader>
				<AlertDialogTitle>Delete Note?</AlertDialogTitle>
				<AlertDialogDescription>
					This will permanently delete this note. This action cannot
					be undone.
				</AlertDialogDescription>
			</AlertDialogHeader>
			<AlertDialogFooter>
				<AlertDialogCancel>Cancel</AlertDialogCancel>
				<AlertDialogAction onclick={handleDeleteConfirm}>
					Delete
				</AlertDialogAction>
			</AlertDialogFooter>
		</AlertDialogContent>
	</AlertDialog>
</div>
