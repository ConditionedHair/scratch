<script lang="ts">
	import { onMount } from 'svelte'
	import { dndzone, type DndEvent } from 'svelte-dnd-action'
	import { DropdownMenu } from 'bits-ui'
	import { notesState } from '../../context/notes.svelte'
	import * as notesService from '../../services/notes'
	import { getTagColor, assignTagColor, tagPillCss } from '../../lib/tags'
	import { PlusIcon, XIcon } from '../icons'

	interface Props {
		noteId: string
		tags: string[]
		tagColors?: Record<string, string>
	}

	let { noteId, tags, tagColors }: Props = $props()

	let inputValue = $state('')
	let isEditing = $state(false)
	let inputEl: HTMLInputElement | null = $state(null)

	interface TagItem {
		id: string
		name: string
	}

	const maxDirectVisible = 2

	let allTagNames = $derived.by(() => {
		const set = new Set<string>()
		for (const note of notesState.notes ?? []) {
			for (const tag of note.tags) {
				set.add(tag)
			}
		}
		return Array.from(set).sort((a, b) => a.localeCompare(b))
	})

	let suggestions = $derived.by(() => {
		const query = inputValue.trim().toLowerCase()
		const available = allTagNames.filter((t) => !tags.includes(t))
		if (!query) return available
		return available.filter((t) => t.toLowerCase().includes(query))
	})

	let visibleTags = $derived(tags.slice(0, maxDirectVisible))
	let hiddenTags = $derived(tags.slice(maxDirectVisible))

	let dndItems = $state<TagItem[]>([])

	$effect(() => {
		dndItems = visibleTags.map((t) => ({ id: t, name: t }))
	})

	async function applyTags(newTags: string[]) {
		try {
			await notesService.setNoteTags(noteId, newTags)
			await notesState.reloadCurrentNote()
		} catch (error) {
			console.error('Failed to update tags:', error)
		}
	}

	async function persistColorIfNew(tag: string) {
		try {
			const currentSettings = await notesService.getSettings()
			const updatedColors = assignTagColor(tag, currentSettings.tagColors)
			if (updatedColors !== currentSettings.tagColors) {
				await notesService.updateSettings({
					...currentSettings,
					tagColors: updatedColors
				})
			}
		} catch (error) {
			console.error('Failed to persist tag color:', error)
		}
	}

	function commitTag(rawTag: string) {
		const tag = rawTag.trim().replace(/^#/, '')
		inputValue = ''
		if (!tag || tags.includes(tag)) return
		const newTags = [...tags, tag]
		void applyTags(newTags)
		void persistColorIfNew(tag)
	}

	function removeTag(tag: string) {
		void applyTags(tags.filter((t) => t !== tag))
	}

	function handleConsider(e: CustomEvent<DndEvent<TagItem>>) {
		dndItems = e.detail.items
	}

	function handleFinalize(e: CustomEvent<DndEvent<TagItem>>) {
		dndItems = e.detail.items
		const newVisible = dndItems.map((i) => i.name)
		void applyTags([...newVisible, ...hiddenTags])
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (
			e.key === 'Enter' ||
			e.key === ',' ||
			(e.key === ' ' && inputValue.trim().length > 0)
		) {
			e.preventDefault()
			commitTag(inputValue)
		} else if (
			e.key === 'Backspace' &&
			inputValue === '' &&
			tags.length > 0
		) {
			removeTag(tags[tags.length - 1])
		} else if (e.key === 'Escape') {
			inputValue = ''
			isEditing = false
			inputEl?.blur()
		}
	}

	function handleWindowFocusTagInput() {
		isEditing = true
		requestAnimationFrame(() => inputEl?.focus())
	}

	onMount(() => {
		window.addEventListener('focus-tag-input', handleWindowFocusTagInput)
		return () => {
			window.removeEventListener(
				'focus-tag-input',
				handleWindowFocusTagInput
			)
		}
	})
</script>

<div
	class="relative flex items-center gap-1.5 flex-nowrap min-w-0 shrink overflow-hidden"
>
	<div
		use:dndzone={{
			items: dndItems,
			flipDurationMs: 150,
			dropTargetStyle: {}
		}}
		onconsider={handleConsider}
		onfinalize={handleFinalize}
		class="flex items-center gap-1.5 flex-nowrap min-w-0 shrink overflow-hidden"
	>
		{#each dndItems as item (item.id)}
			{@const color = getTagColor(item.name, tagColors)}
			<span
				style={tagPillCss(color)}
				title={`#${item.name}`}
				class="flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-medium leading-none cursor-grab active:cursor-grabbing touch-none border shadow-2xs group shrink min-w-0 max-w-[130px] sm:max-w-[170px] transition-all duration-100 ease-braun-snappy"
			>
				<span
					class="w-1.5 h-1.5 rounded-full shrink-0"
					style:background-color={color}
				></span>
				<span class="truncate">#{item.name}</span>
				<button
					type="button"
					onclick={(e) => {
						e.stopPropagation()
						removeTag(item.name)
					}}
					class="opacity-50 hover:opacity-100 active:scale-90 transition-all duration-100 ease-braun-snappy ml-0.5 cursor-pointer shrink-0"
					tabindex={-1}
					aria-label={`Remove tag ${item.name}`}
				>
					<XIcon class="w-2.5 h-2.5 stroke-[2.2]" />
				</button>
			</span>
		{/each}
	</div>

	{#if hiddenTags.length > 0}
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<button
						{...props}
						type="button"
						class="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-full border border-border bg-bg hover:bg-bg-emphasis text-text-muted hover:text-text transition-colors cursor-pointer shrink-0 shadow-2xs"
						title={`${hiddenTags.length} more tag${hiddenTags.length > 1 ? 's' : ''}: ${hiddenTags.map((t) => `#${t}`).join(', ')}`}
					>
						+{hiddenTags.length}
					</button>
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					class="p-1.5 bg-bg-secondary border border-border rounded-xl shadow-xl z-50 min-w-44 animate-in fade-in zoom-in-95 duration-150"
					sideOffset={6}
					align="start"
				>
					<div
						class="px-2 py-1 text-[10px] font-bold font-mono tracking-wider uppercase text-text-muted border-b border-border/60 mb-1"
					>
						Additional Tags ({hiddenTags.length})
					</div>
					<div class="space-y-0.5 max-h-48 overflow-y-auto">
						{#each hiddenTags as tag (tag)}
							{@const color = getTagColor(tag, tagColors)}
							<div
								class="flex items-center justify-between gap-2 px-2 py-1 rounded-lg hover:bg-bg-emphasis/70 transition-colors text-xs"
							>
								<div class="flex items-center gap-2 min-w-0">
									<span
										class="w-2 h-2 rounded-full shrink-0 shadow-xs"
										style:background-color={color}
									></span>
									<span class="truncate font-medium text-text"
										>#{tag}</span
									>
								</div>
								<button
									type="button"
									onclick={(e) => {
										e.stopPropagation()
										removeTag(tag)
									}}
									class="opacity-50 hover:opacity-100 p-0.5 hover:bg-bg-muted rounded text-text-muted hover:text-text cursor-pointer shrink-0"
									title={`Remove #${tag}`}
								>
									<XIcon class="w-3 h-3 stroke-[2]" />
								</button>
							</div>
						{/each}
					</div>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu.Root>
	{/if}

	{#if isEditing}
		<input
			bind:this={inputEl}
			type="text"
			bind:value={inputValue}
			onkeydown={handleKeyDown}
			onblur={() => {
				setTimeout(() => {
					if (inputValue.trim()) {
						commitTag(inputValue)
					}
					isEditing = false
				}, 180)
			}}
			placeholder="Add tag..."
			autocomplete="off"
			autocorrect="off"
			autocapitalize="off"
			spellcheck={false}
			class="text-xs bg-bg border border-border rounded-md px-2 py-0.5 outline-none text-text placeholder-text-muted/50 min-w-16 w-24 shrink-0 shadow-2xs"
		/>
	{:else}
		<button
			type="button"
			onclick={() => {
				isEditing = true
				requestAnimationFrame(() => inputEl?.focus())
			}}
			class="flex items-center gap-1 text-[11px] text-text-muted hover:text-text px-1.5 py-0.5 rounded-md hover:bg-bg-muted/70 transition-colors border border-dashed border-border/70 hover:border-border cursor-pointer shrink-0"
			title="Add tag"
		>
			<PlusIcon class="w-3 h-3 stroke-[2]" />
			<span>{tags.length === 0 ? 'Add tag' : 'Tag'}</span>
		</button>
	{/if}

	{#if isEditing && suggestions.length > 0}
		<div
			class="absolute top-full left-0 mt-1 z-50 bg-bg border border-border rounded-lg shadow-lg p-1.5 max-h-48 overflow-y-auto w-48 flex flex-col gap-0.5"
		>
			{#each suggestions as t (t)}
				{@const color = getTagColor(t, tagColors)}
				<button
					type="button"
					tabindex={-1}
					onclick={() => {
						commitTag(t)
						requestAnimationFrame(() => inputEl?.focus())
					}}
					class="w-full text-left p-1.5 rounded-md transition-colors hover:bg-bg-muted text-text flex items-center gap-2 cursor-pointer"
				>
					<span
						class="w-2 h-2 rounded-full shrink-0 shadow-xs"
						style:background-color={color}
					></span>
					<span class="text-xs font-medium truncate">#{t}</span>
				</button>
			{/each}
		</div>
	{/if}
</div>
