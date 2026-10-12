<script lang="ts">
	import { onMount } from 'svelte'
	import { getVersion } from '@tauri-apps/api/app'
	import { invoke } from '@tauri-apps/api/core'
	import { toast } from 'svelte-sonner'
	import { showUpdateToast } from '../../services/updater'
	import { Button } from '../ui'
	import { RefreshCwIcon, SpinnerIcon, GithubIcon } from '../icons'

	let appVersion = $state<string>('')
	let checkingUpdate = $state(false)

	onMount(() => {
		getVersion()
			.then((ver) => {
				appVersion = ver
			})
			.catch(() => {})
	})

	async function handleCheckForUpdates() {
		checkingUpdate = true
		const result = await showUpdateToast()
		checkingUpdate = false
		if (result === 'no-update') {
			toast.success("You're on the latest version!")
		} else if (result === 'error') {
			toast.error('Could not check for updates. Try again later.')
		}
	}

	async function handleOpenUrl(url: string) {
		try {
			await invoke('open_url_safe', { url })
		} catch (err) {
			console.error('Failed to open URL:', err)
			toast.error(
				err instanceof Error ? err.message : 'Failed to open URL'
			)
		}
	}
</script>

<div class="space-y-8 py-8">
	<!-- Version -->
	<section class="pb-2">
		<h2 class="text-xl font-medium mb-0.5">Version</h2>
		<p class="text-sm text-text-muted mb-4">
			You are currently using Scratch v{appVersion || '...'}
		</p>
		<Button
			onclick={handleCheckForUpdates}
			disabled={checkingUpdate}
			variant="outline"
			size="md"
			class="gap-1.25"
		>
			{#if checkingUpdate}
				<SpinnerIcon class="w-4.5 h-4.5 stroke-[1.5] animate-spin" />
				Checking...
			{:else}
				<RefreshCwIcon class="w-4.5 h-4.5 stroke-[1.5]" />
				Check for Updates
			{/if}
		</Button>
	</section>

	<!-- Divider -->
	<div class="border-t border-border border-dashed"></div>

	<!-- About Section -->
	<section class="pb-2">
		<h2 class="text-xl font-medium mb-1">About Scratch</h2>
		<p class="text-sm text-text-muted mb-4">
			Scratch is a minimalist markdown scratchpad for capturing quick
			thoughts, todos, and ideas. We're offline-first, keyboard-optimized,
			AI-compatible, and open source with no cloud, no accounts, and no
			subscriptions. Learn more on{' '}
			<button
				onclick={() => handleOpenUrl('https://www.ericli.io/scratch')}
				class="text-text-muted border-b border-text-muted/50 hover:text-text hover:border-text cursor-pointer transition-colors"
			>
				our website
			</button>
			.
		</p>
		<p class="text-sm text-text-muted mb-4">
			Created and maintained by{' '}
			<button
				onclick={() => handleOpenUrl('https://ericli.io')}
				class="text-text-muted border-b border-text-muted/50 hover:text-text hover:border-text cursor-pointer transition-colors"
			>
				Eric Li
			</button>{' '}
			with moral support from his cat, Mochi, and actual support from many contributors
			on GitHub.
		</p>
		<div class="flex items-center gap-1">
			<Button
				onclick={() =>
					handleOpenUrl('https://github.com/erictli/scratch')}
				variant="outline"
				size="md"
				class="gap-1.25"
			>
				<GithubIcon class="w-4.5 h-4.5 stroke-[1.5]" />
				View on GitHub
			</Button>
			<Button
				onclick={() =>
					handleOpenUrl('https://github.com/erictli/scratch/issues')}
				variant="ghost"
				size="md"
				class="gap-1.25 text-text"
			>
				Submit Feedback
			</Button>
		</div>
	</section>
</div>
