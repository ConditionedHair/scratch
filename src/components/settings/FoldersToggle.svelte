<script lang="ts">
	import { onMount } from 'svelte'
	import { invoke } from '@tauri-apps/api/core'
	import { toast } from 'svelte-sonner'
	import { Button } from '../ui'
	import type { Settings } from '../../types/note'

	let foldersEnabled = $state<boolean | null>(null)
	let isUpdating = $state(false)

	onMount(() => {
		invoke<Settings>('get_settings')
			.then((s) => {
				foldersEnabled = s.foldersEnabled === true
			})
			.catch((error) => {
				console.error('Failed to load folder setting:', error)
				foldersEnabled = false
			})
	})

	async function handleToggle(enabled: boolean) {
		if (isUpdating) return
		isUpdating = true
		try {
			const settings = await invoke<Settings>('get_settings')
			await invoke('update_settings', {
				newSettings: { ...settings, foldersEnabled: enabled }
			})
			foldersEnabled = enabled
		} catch {
			toast.error('Failed to update folder setting')
		} finally {
			isUpdating = false
		}
	}
</script>

{#if foldersEnabled === null}
	<div class="flex gap-1 p-1 rounded-[10px] border border-border shrink-0">
		<Button variant="ghost" size="xs" disabled>Off</Button>
		<Button variant="ghost" size="xs" disabled>On</Button>
	</div>
{:else}
	<div class="flex gap-1 p-1 rounded-[10px] border border-border shrink-0">
		<Button
			onclick={() => handleToggle(false)}
			variant={!foldersEnabled ? 'primary' : 'ghost'}
			size="xs"
			disabled={isUpdating}
		>
			Off
		</Button>
		<Button
			onclick={() => handleToggle(true)}
			variant={foldersEnabled ? 'primary' : 'ghost'}
			size="xs"
			disabled={isUpdating}
		>
			On
		</Button>
	</div>
{/if}
