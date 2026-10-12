<script lang="ts">
	import { invoke } from '@tauri-apps/api/core'
	import { toast } from 'svelte-sonner'
	import { notesState } from '../../context/notes.svelte'
	import { Button, Input } from '../ui'
	import { XIcon } from '../icons'
	import type { Settings } from '../../types/note'

	let patterns = $state<string[] | null>(null)
	let defaults = $state<string[]>([])
	let newPattern = $state('')
	let isSaving = $state(false)

	$effect(() => {
		// Track notesFolder
		const _folder = notesState.notesFolder
		void _folder
		patterns = null

		Promise.all([
			invoke<Settings>('get_settings'),
			invoke<string[]>('get_default_ignored_patterns')
		])
			.then(([settings, defaultPatterns]) => {
				defaults = defaultPatterns
				patterns = settings.ignoredPatterns ?? defaultPatterns
			})
			.catch((error) => {
				console.error('Failed to load ignored patterns:', error)
				patterns = []
			})
	})

	let isDefault = $derived(
		patterns !== null &&
			patterns.length === defaults.length &&
			patterns.every((p, i) => p === defaults[i])
	)

	async function save(updated: string[] | null) {
		isSaving = true
		try {
			const settings = await invoke<Settings>('get_settings')
			await invoke('update_settings', {
				newSettings: {
					...settings,
					ignoredPatterns: updated ?? undefined
				}
			})
			patterns = updated ?? defaults
			notesState.refreshNotes()
			try {
				await invoke('rebuild_search_index')
			} catch {
				toast.error(
					'Search index rebuild failed — search results may be stale'
				)
			}
		} catch {
			toast.error('Failed to save ignored folders')
		} finally {
			isSaving = false
		}
	}

	function handleAdd() {
		const trimmed = newPattern.trim()
		if (!trimmed || !patterns) return
		if (/[/\\]/.test(trimmed)) {
			toast.error(
				'Ignore patterns must be single directory names (no paths)'
			)
			return
		}
		if (patterns.includes(trimmed)) {
			toast.error('Already in the list')
			return
		}
		newPattern = ''
		save([...patterns, trimmed])
	}

	function handleRemove(pattern: string) {
		if (!patterns) return
		save(patterns.filter((p) => p !== pattern))
	}

	function handleReset() {
		save(null)
	}
</script>

{#if patterns === null}
	<div class="text-sm text-text-muted py-2">Loading...</div>
{:else}
	<div class="space-y-3">
		<div class="flex flex-wrap gap-1.5">
			{#each patterns as pattern (pattern)}
				<span
					class="inline-flex items-center gap-1 pl-2 pr-1 py-0.75 rounded-md bg-bg-muted text-2xs font-mono"
				>
					{pattern}
					<button
						type="button"
						aria-label={`Remove ${pattern}`}
						onclick={() => handleRemove(pattern)}
						disabled={isSaving}
						class="p-0.5 rounded hover:bg-bg-hover text-text-muted hover:text-text cursor-pointer"
					>
						<XIcon class="w-3 h-3 stroke-[1.7]" />
					</button>
				</span>
			{/each}
			{#if patterns.length === 0}
				<span class="text-sm text-text-muted">
					No folders ignored — all markdown files will be indexed
				</span>
			{/if}
		</div>
		<div class="flex gap-2">
			<Input
				type="text"
				bind:value={newPattern}
				onkeydown={(e) => {
					if (e.key === 'Enter') {
						e.preventDefault()
						handleAdd()
					}
				}}
				placeholder="Add folder name..."
				class="flex-1"
				disabled={isSaving}
			/>
			<Button
				onclick={handleAdd}
				variant="outline"
				size="sm"
				class="h-10"
				disabled={isSaving || !newPattern.trim()}
			>
				Add
			</Button>
		</div>
		{#if !isDefault}
			<button
				type="button"
				onclick={handleReset}
				disabled={isSaving}
				class="text-sm text-text-muted hover:text-text cursor-pointer font-medium"
			>
				Reset to defaults
			</button>
		{/if}
	</div>
{/if}
