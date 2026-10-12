<script lang="ts">
	import { mailState } from '../../context/mail.svelte'
	import type { MailThread } from '../../types/mail'
	import {
		SearchIcon,
		SearchOffIcon,
		StarIcon,
		ImportanceIcon,
		ArchiveIcon,
		TrashIcon,
		SpinnerIcon
	} from '../icons'
	import { SidebarResizeHandle } from '../layout'
	import { getTagColor } from '../../lib/tags'
	import { getCategoryTags, isImportantLabel } from '../../lib/mailTags'
	import * as notesService from '../../services/notes'

	function formatMailDate(timestampSecs: number): string {
		if (!timestampSecs) return ''
		const date = new Date(timestampSecs * 1000)
		const now = new Date()
		if (date.toDateString() === now.toDateString()) {
			return date.toLocaleTimeString([], {
				hour: 'numeric',
				minute: '2-digit'
			})
		}
		if (date.getFullYear() === now.getFullYear()) {
			return date.toLocaleDateString([], {
				month: 'short',
				day: 'numeric'
			})
		}
		return date.toLocaleDateString([], {
			month: 'short',
			day: 'numeric',
			year: '2-digit'
		})
	}

	let threads = $derived(mailState.filteredThreads)
	let tagColors = $state<Record<string, string> | undefined>(undefined)

	$effect(() => {
		notesService
			.getSettings()
			.then((s) => {
				tagColors = s.tagColors
			})
			.catch((err) => {
				console.error('Failed to load settings in MailThreadList:', err)
			})
	})

	function handleSelect(thread: MailThread) {
		void mailState.selectThread(thread.id)
	}

	function handleImportant(e: MouseEvent, threadId: string) {
		e.stopPropagation()
		void mailState.toggleImportant(threadId)
	}

	function handleStar(e: MouseEvent, threadId: string) {
		e.stopPropagation()
		void mailState.toggleStar(threadId)
	}

	function handleArchive(e: MouseEvent, threadId: string) {
		e.stopPropagation()
		void mailState.archiveThread(threadId)
	}

	function handleTrash(e: MouseEvent, threadId: string) {
		e.stopPropagation()
		void mailState.trashThread(threadId)
	}
</script>

<div
	class="h-full flex flex-col bg-bg border-r border-border select-none overflow-hidden relative"
>
	<!-- Search & Filter Bar -->
	<div class="p-2.5 border-b border-border flex flex-col gap-2 shrink-0">
		<div class="relative flex items-center">
			<SearchIcon
				class="absolute left-2.5 w-3.5 h-3.5 text-text-muted pointer-events-none stroke-[2]"
			/>
			<input
				type="text"
				placeholder="Search mail... (/)"
				value={mailState.searchQuery}
				oninput={(e) =>
					mailState.setSearchQuery(
						(e.target as HTMLInputElement).value
					)}
				class="w-full pl-8 pr-7 py-1.5 rounded-lg bg-bg-secondary border border-border text-xs text-text placeholder-text-muted/60 focus:outline-none focus:border-accent transition-colors"
			/>
			{#if mailState.searchQuery}
				<button
					type="button"
					onclick={() => mailState.setSearchQuery('')}
					class="absolute right-2 text-text-muted hover:text-text cursor-pointer p-0.5"
					title="Clear search"
				>
					<SearchOffIcon class="w-3 h-3 stroke-[2]" />
				</button>
			{/if}
		</div>

		<div
			class="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-text-muted px-1"
		>
			<span class="font-bold">{mailState.activeLabelId}</span>
			<span
				>{threads.length}
				{threads.length === 1 ? 'thread' : 'threads'}</span
			>
		</div>
	</div>

	<!-- Threads List Canvas -->
	<div class="flex-1 overflow-y-auto divide-y divide-border/60">
		{#if threads.length === 0}
			<div
				class="h-48 flex flex-col items-center justify-center text-text-muted text-xs p-4 text-center"
			>
				{#if mailState.isSyncing}
					<SpinnerIcon
						class="w-5 h-5 animate-spin mb-2 stroke-[1.5] text-accent"
					/>
					<span>Synchronizing mailbox...</span>
				{:else if mailState.searchQuery}
					<span>No emails matching "{mailState.searchQuery}"</span>
				{:else}
					<span
						>No messages in {mailState.activeLabelId.toLowerCase()}</span
					>
				{/if}
			</div>
		{:else}
			{#each threads as thread (thread.id)}
				{@const isSelected = mailState.selectedThreadId === thread.id}
				{@const isUnread = thread.unread}
				{@const isImportant = isImportantLabel(thread.labelIds)}
				{@const categories = getCategoryTags(thread.labelIds)}
				<div
					role="button"
					tabindex="0"
					onclick={() => handleSelect(thread)}
					onkeydown={(e) => e.key === 'Enter' && handleSelect(thread)}
					class={`group relative p-3 text-left cursor-pointer transition-colors outline-none ${
						isSelected
							? 'bg-bg-emphasis/80 border-l-2 border-l-accent'
							: 'hover:bg-bg-muted/50 border-l-2 border-l-transparent'
					}`}
				>
					<!-- Sender & Date Row -->
					<div class="flex items-center justify-between gap-2 mb-1">
						<div class="flex items-center gap-1.5 min-w-0">
							{#if isUnread}
								<span
									class="w-2 h-2 rounded-full bg-accent shrink-0 shadow-2xs"
								></span>
							{/if}
							<button
								type="button"
								onclick={(e) => handleImportant(e, thread.id)}
								class={`p-0.5 rounded hover:bg-bg-muted transition-colors cursor-pointer shrink-0 ${
									isImportant
										? 'text-amber-500'
										: 'text-text-muted/30 opacity-0 group-hover:opacity-100 hover:text-text-muted'
								}`}
								title={isImportant ? 'Mark not important' : 'Mark important'}
							>
								<ImportanceIcon
									class="w-3.5 h-3.5"
									filled={isImportant}
								/>
							</button>
							<span
								class={`text-xs truncate ${isUnread ? 'font-bold text-text' : 'font-medium text-text-muted'}`}
							>
								{thread.fromName || thread.from}
							</span>
							{#if thread.messageCount > 1}
								<span
									class="text-[10px] font-mono px-1 rounded bg-bg-muted text-text-muted/70 shrink-0"
								>
									{thread.messageCount}
								</span>
							{/if}
						</div>

						<div class="flex items-center gap-1.5 shrink-0">
							<span
								class="text-[10px] font-mono text-text-muted/70"
							>
								{formatMailDate(thread.timestamp)}
							</span>

							<!-- Star Button -->
							<button
								type="button"
								onclick={(e) => handleStar(e, thread.id)}
								class={`p-0.5 rounded hover:bg-bg-muted transition-colors cursor-pointer ${
									thread.starred
										? 'text-amber-400'
										: 'text-text-muted/40 opacity-0 group-hover:opacity-100'
								}`}
								title={thread.starred ? 'Unstar' : 'Star'}
							>
								<StarIcon
									class="w-3.5 h-3.5"
									filled={thread.starred}
								/>
							</button>
						</div>
					</div>

					<!-- Subject Line & Category Tags -->
					<div
						class="flex items-center justify-between gap-1.5 mb-1 min-w-0"
					>
						<span
							class={`text-xs truncate ${isUnread ? 'font-bold text-text' : 'font-normal text-text/90'}`}
						>
							{thread.subject || '(no subject)'}
						</span>

						{#if categories.length > 0}
							<div class="flex items-center gap-1 shrink-0">
								{#each categories as category (category)}
									{@const color = getTagColor(category, tagColors)}
									<span
										class="text-[9px] font-mono px-1.5 py-0.2 rounded-full border truncate select-none"
										style:background-color="{color}18"
										style:border-color="{color}30"
										style:color
									>
										#{category}
									</span>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Snippet Preview -->
					<div
						class="text-[11px] text-text-muted/75 line-clamp-2 leading-relaxed"
					>
						{thread.snippet}
					</div>

					<!-- Hover Quick Actions Strip -->
					<div
						class="absolute right-2.5 bottom-2 hidden group-hover:flex items-center gap-1 bg-bg-secondary/90 px-1 py-0.5 rounded-md border border-border shadow-xs"
					>
						<button
							type="button"
							onclick={(e) => handleArchive(e, thread.id)}
							class="p-1 rounded text-text-muted hover:text-text hover:bg-bg transition-colors cursor-pointer"
							title="Archive (E)"
						>
							<ArchiveIcon class="w-3 h-3 stroke-[2]" />
						</button>
						<button
							type="button"
							onclick={(e) => handleTrash(e, thread.id)}
							class="p-1 rounded text-text-muted hover:text-red-500 hover:bg-bg transition-colors cursor-pointer"
							title="Move to Trash (#)"
						>
							<TrashIcon class="w-3 h-3 stroke-[2]" />
						</button>
					</div>
				</div>
			{/each}
		{/if}
	</div>

	<SidebarResizeHandle />
</div>
