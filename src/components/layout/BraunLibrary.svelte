<script lang="ts">
	import { DropdownMenu, ContextMenu } from 'bits-ui'
	import { notesState } from '../../context/notes.svelte'
	import * as notesService from '../../services/notes'
	import type { Settings } from '../../types/note'
	import { getTagColor, TAG_PALETTE } from '../../lib/tags'
	import FolderNameDialog from '../notes/FolderNameDialog.svelte'
	import {
		AddNoteIcon,
		FolderPlusIcon,
		PinIcon,
		CalendarIcon,
		SettingsIcon,
		PencilIcon,
		SwatchIcon,
		ChevronRightIcon,
		MailIcon,
		PlaneIcon
	} from '../icons'
	import { calendarState } from '../../context/calendar.svelte'
	import { mailState } from '../../context/mail.svelte'
	import { flightsState } from '../../context/flights.svelte'
	import { mod, isMac } from '../../lib/platform'
	import { cn } from '../../lib/utils'
	import { toast } from 'svelte-sonner'

	interface Props {
		onOpenSettings?: () => void
		onOpenCalendar?: () => void
		onOpenMail?: () => void
		onOpenFlights?: () => void
	}

	let { onOpenSettings, onOpenCalendar, onOpenMail, onOpenFlights }: Props = $props()

	let settings = $state<Settings | null>(null)
	let plusMenuOpen = $state(false)
	let folderDialogOpen = $state(false)
	let selectedFolder = $state<string | null>(null)
	let renameDialogOpen = $state(false)
	let tagToRename = $state<string | null>(null)

	$effect(() => {
		void notesState.notes
		notesService
			.getSettings()
			.then((s) => {
				settings = s
			})
			.catch((err) =>
				console.error('Failed to load settings in BraunLibrary:', err)
			)
	})

	let folders = $derived.by(() => {
		const set = new Set<string>()
		for (const note of notesState.notes) {
			if (note.id.includes('/')) {
				const parts = note.id.split('/')
				set.add(parts[0])
			}
		}
		return Array.from(set).sort()
	})

	let tags = $derived.by(() => {
		const map: Record<string, number> = {}
		for (const note of notesState.notes) {
			if (note.tags && Array.isArray(note.tags)) {
				for (const t of note.tags) {
					map[t] = (map[t] || 0) + 1
				}
			}
		}
		return Object.entries(map).map(([tag, count]) => ({ tag, count }))
	})

	let pinnedCount = $derived(settings?.pinnedNoteIds?.length ?? 0)

	function openRenameDialog(tag: string) {
		tagToRename = tag
		renameDialogOpen = true
	}

	async function handleRenameConfirm(newName: string) {
		const cleanName = newName.trim().replace(/^#/, '')
		if (!tagToRename || !cleanName || cleanName === tagToRename) {
			renameDialogOpen = false
			tagToRename = null
			return
		}
		try {
			await notesService.renameTag(tagToRename, cleanName)
			const currentSettings = await notesService.getSettings()
			if (currentSettings.tagColors?.[tagToRename]) {
				const colors = { ...currentSettings.tagColors }
				colors[cleanName] = colors[tagToRename]
				delete colors[tagToRename]
				await notesService.updateSettings({
					...currentSettings,
					tagColors: colors
				})
				settings = { ...currentSettings, tagColors: colors }
			}
			if (notesState.activeTagFilter === tagToRename) {
				notesState.setActiveTagFilter(cleanName)
			}
			await notesState.refreshNotes()
			renameDialogOpen = false
			tagToRename = null
			toast.success(`Renamed #${tagToRename} to #${cleanName}`)
		} catch (error) {
			console.error('Failed to rename tag:', error)
			toast.error('Failed to rename tag')
		}
	}

	async function handleColorSelect(tag: string, color: string) {
		try {
			const currentSettings = await notesService.getSettings()
			const colors = { ...currentSettings.tagColors, [tag]: color }
			await notesService.updateSettings({
				...currentSettings,
				tagColors: colors
			})
			settings = { ...currentSettings, tagColors: colors }
			await notesState.refreshNotes()
			toast.success(`Updated color for #${tag}`)
		} catch (error) {
			console.error('Failed to update tag color:', error)
			toast.error('Failed to update tag color')
		}
	}

	async function handleCreateFolderConfirm(name: string) {
		try {
			await notesState.createFolder('', name)
			folderDialogOpen = false
			toast.success(`Folder "${name}" created`)
		} catch (err) {
			console.error(err)
			toast.error('Failed to create folder')
		}
	}
</script>

<aside
	class="w-full h-full flex flex-col border-r border-border select-none bg-bg-secondary text-text transition-colors"
>
	<!-- Library Header -->
	<div
		class="h-11 px-3.5 border-b border-border flex items-center justify-between shrink-0"
	>
		<span
			class="text-[11px] font-bold tracking-wider uppercase text-text-muted"
		>
			LIBRARY
		</span>

		<!-- Signal Yellow Circular Plus Button -->
		<DropdownMenu.Root bind:open={plusMenuOpen}>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer hover:brightness-105 active:scale-95 bg-accent text-slate-950 font-bold shadow-xs"
						title="New Note or Folder"
					>
						<svg
							class="w-3.5 h-3.5 stroke-[2.5]"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								d="M12 4v16m8-8H4"
							></path>
						</svg>
					</button>
				{/snippet}
			</DropdownMenu.Trigger>

			<DropdownMenu.Portal>
				<DropdownMenu.Content
					class="min-w-44 bg-bg border border-border rounded-xl shadow-xl py-1 z-50 text-xs text-text"
					sideOffset={5}
					align="end"
				>
					<DropdownMenu.Item
						class="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2"
						onSelect={() => notesState.createNote()}
					>
						<AddNoteIcon class="w-3.5 h-3.5 stroke-[1.8]" />
						<span class="flex-1 font-medium">New Note</span>
						<kbd class="text-[10px] text-text-muted font-mono ml-2">
							{mod}
							{isMac ? '' : '+'}N
						</kbd>
					</DropdownMenu.Item>
					<DropdownMenu.Item
						class="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center gap-2"
						onSelect={() => {
							folderDialogOpen = true
						}}
					>
						<FolderPlusIcon class="w-3.5 h-3.5 stroke-[1.8]" />
						<span class="font-medium">New Folder</span>
					</DropdownMenu.Item>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	</div>

	<!-- Navigation Sections -->
	<div class="flex-1 overflow-y-auto p-2 space-y-4">
		<!-- Core Views: All Notes & Pinned -->
		<div class="space-y-0.5">
			<button
				type="button"
				onclick={() => {
					notesState.setActiveTagFilter(null)
					selectedFolder = null
				}}
				class={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
					notesState.activeTagFilter === null &&
					selectedFolder === null
						? 'bg-bg-emphasis text-text font-semibold shadow-2xs'
						: 'text-text-muted hover:text-text hover:bg-bg-muted/70 font-medium'
				}`}
			>
				<div class="flex items-center gap-2">
					<svg
						class="w-4 h-4 opacity-75 stroke-[1.8]"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						></path>
					</svg>
					<span>All Notes</span>
				</div>
				<span
					class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-bg-muted text-text-muted"
				>
					{notesState.notes.length}
				</span>
			</button>

			<button
				type="button"
				onclick={onOpenCalendar}
				class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text hover:bg-bg-muted/70 transition-colors text-left cursor-pointer group"
			>
				<div class="flex items-center gap-2">
					<CalendarIcon
						class="w-4 h-4 opacity-75 stroke-[1.8] group-hover:text-accent transition-colors"
					/>
					<span>Calendar</span>
				</div>
				{#if calendarState.connected}
					<span
						class="text-[10px] font-mono px-1.5 py-0.2 rounded bg-bg-muted text-text-muted"
					>
						{calendarState.todayEvents.length}
					</span>
				{/if}
			</button>

			<button
				type="button"
				onclick={onOpenMail}
				class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text hover:bg-bg-muted/70 transition-colors text-left cursor-pointer group"
			>
				<div class="flex items-center gap-2">
					<MailIcon
						class="w-4 h-4 opacity-75 stroke-[1.8] group-hover:text-accent transition-colors"
					/>
					<span>Mail</span>
				</div>
				{#if mailState.connected && mailState.unreadCount > 0}
					<span
						class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-accent text-slate-950 shadow-2xs"
					>
						{mailState.unreadCount}
					</span>
				{/if}
			</button>

			<button
				type="button"
				onclick={onOpenFlights}
				class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text hover:bg-bg-muted/70 transition-colors text-left cursor-pointer group"
			>
				<div class="flex items-center gap-2">
					<PlaneIcon
						class="w-4 h-4 opacity-75 stroke-[1.8] group-hover:text-accent transition-colors"
					/>
					<span>Flights</span>
				</div>
				{#if flightsState.flights.length > 0}
					<span
						class="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full {flightsState.activeFlights.length > 0 ? 'bg-accent text-slate-950 shadow-2xs' : 'bg-bg-muted text-text-muted'}"
					>
						{flightsState.activeFlights.length > 0 ? `${flightsState.activeFlights.length} LIVE` : flightsState.flights.length}
					</span>
				{/if}
			</button>

			<button
				type="button"
				class="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text hover:bg-bg-muted/70 transition-colors text-left cursor-pointer"
			>
				<div class="flex items-center gap-2">
					<PinIcon class="w-4 h-4 opacity-70 stroke-[1.8]" />
					<span>Pinned</span>
				</div>
				<span class="text-[10px] font-mono text-text-muted/70">
					{pinnedCount}
				</span>
			</button>
		</div>

		<!-- Folders Section -->
		{#if folders.length > 0}
			<div>
				<div
					class="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted/70"
				>
					FOLDERS
				</div>
				<div class="space-y-0.5 text-xs">
					{#each folders as f (f)}
						{@const isSelected = selectedFolder === f}
						<button
							type="button"
							onclick={() => {
								selectedFolder = isSelected ? null : f
								notesState.setActiveTagFilter(null)
							}}
							class={`w-full px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors text-left ${
								isSelected
									? 'bg-bg-emphasis text-text font-semibold shadow-2xs'
									: 'text-text-muted hover:text-text hover:bg-bg-muted/70 font-medium'
							}`}
						>
							<div class="flex items-center gap-2 min-w-0">
								<span
									class={`w-1.5 h-1.5 rounded-full shrink-0 ${
										isSelected
											? 'bg-accent shadow-xs'
											: 'bg-text-muted/40'
									}`}
								></span>
								<span class="truncate">{f}</span>
							</div>
						</button>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Tags Section -->
		{#if tags.length > 0}
			<div class="pt-2">
				<div
					class="px-2.5 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-text-muted/70 flex items-center justify-between"
				>
					<span>TAGS</span>
					<span
						class="font-mono text-[9px] text-text-muted/50 font-normal"
					>
						{tags.length}
					</span>
				</div>
				<div class="space-y-0.5 text-xs">
					{#each tags as { tag, count } (tag)}
						{@const isActive = notesState.activeTagFilter === tag}
						{@const tagColor = getTagColor(
							tag,
							settings?.tagColors
						)}
						<ContextMenu.Root>
							<ContextMenu.Trigger>
								{#snippet child({ props })}
									<div
										{...props}
										role="button"
										tabindex={0}
										onclick={() =>
											notesState.setActiveTagFilter(
												isActive ? null : tag
											)}
										onkeydown={(e) => {
											if (
												e.key === 'Enter' ||
												e.key === ' '
											) {
												notesState.setActiveTagFilter(
													isActive ? null : tag
												)
											}
										}}
										class={cn(
											'px-2.5 py-1.5 rounded-lg cursor-pointer flex items-center justify-between transition-colors select-none group',
											isActive
												? 'bg-bg-emphasis text-text font-semibold shadow-2xs'
												: 'text-text-muted hover:text-text hover:bg-bg-muted/70 font-medium'
										)}
										title={`#${tag} • Right-click to rename or change color`}
									>
										<div
											class="flex items-center gap-2 min-w-0"
										>
											<span
												class="w-2 h-2 rounded-full shrink-0 shadow-xs transition-transform group-hover:scale-125"
												style:background-color={tagColor}
											></span>
											<span class="truncate">#{tag}</span>
										</div>
										<div
											class="flex items-center gap-1.5 shrink-0"
										>
											<span
												class="text-[10px] font-mono text-text-muted/60 group-hover:text-text-muted"
											>
												{count}
											</span>
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
										onSelect={() => openRenameDialog(tag)}
									>
										<PencilIcon
											class="w-3.5 h-3.5 stroke-[1.8]"
										/>
										<span>Rename Tag</span>
									</ContextMenu.Item>
									<ContextMenu.Sub>
										<ContextMenu.SubTrigger
											class="px-3 py-1.5 cursor-pointer outline-none hover:bg-bg-muted focus:bg-bg-muted flex items-center justify-between"
										>
											<div
												class="flex items-center gap-2"
											>
												<SwatchIcon
													class="w-3.5 h-3.5 stroke-[1.8]"
												/>
												<span>Change Color</span>
											</div>
											<ChevronRightIcon
												class="w-3 h-3 stroke-[1.8] text-text-muted"
											/>
										</ContextMenu.SubTrigger>
										<ContextMenu.Portal>
											<ContextMenu.SubContent
												class="bg-bg border border-border rounded-xl shadow-xl p-2.5 z-50 min-w-48"
												sideOffset={4}
											>
												<div
													class="text-[10px] font-mono uppercase tracking-wider text-text-muted/70 px-1 pb-1.5"
												>
													Select Color
												</div>
												<div
													class="grid grid-cols-6 gap-1.5"
												>
													{#each TAG_PALETTE as color (color)}
														<button
															type="button"
															onclick={() =>
																handleColorSelect(
																	tag,
																	color
																)}
															title={color}
															class={cn(
																'w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer hover:scale-120 active:scale-95 shadow-2xs',
																color.toLowerCase() ===
																	tagColor.toLowerCase() &&
																	'ring-2 ring-offset-2 ring-offset-bg ring-text'
															)}
															style:background-color={color}
														></button>
													{/each}
												</div>
											</ContextMenu.SubContent>
										</ContextMenu.Portal>
									</ContextMenu.Sub>
								</ContextMenu.Content>
							</ContextMenu.Portal>
						</ContextMenu.Root>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Bottom Status / Footer Strip -->
	{#if onOpenSettings}
		<div
			class="p-2 border-t border-border flex items-center justify-between text-xs text-text-muted"
		>
			<button
				type="button"
				onclick={onOpenSettings}
				class="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-bg-muted hover:text-text transition-colors text-left text-xs cursor-pointer"
			>
				<SettingsIcon class="w-3.5 h-3.5 stroke-[1.8]" />
				<span>Preferences</span>
			</button>
		</div>
	{/if}

	<!-- Create Folder Dialog -->
	<FolderNameDialog
		bind:open={folderDialogOpen}
		onConfirm={handleCreateFolderConfirm}
		title="Create new folder"
		description="Enter a name for the new folder"
		confirmLabel="Create"
	/>

	<!-- Rename Tag Dialog -->
	<FolderNameDialog
		bind:open={renameDialogOpen}
		onConfirm={handleRenameConfirm}
		title="Rename Tag"
		description="Enter a new name for this tag across all notes"
		confirmLabel="Rename"
		defaultValue={tagToRename ?? ''}
	/>
</aside>
