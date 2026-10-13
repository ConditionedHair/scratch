<script lang="ts">
	import { open } from '@tauri-apps/plugin-dialog'
	import { notesState } from '../../context/notes.svelte'
	import { themeState } from '../../context/theme.svelte'
	import { Button } from '../ui'

	async function handleSelectFolder() {
		try {
			const selected = await open({
				directory: true,
				multiple: false,
				title: 'Choose Notes Folder'
			})

			if (selected && typeof selected === 'string') {
				await notesState.setNotesFolder(selected)
				await themeState.loadSettingsFromBackend()
			}
		} catch (err) {
			console.error('Failed to select folder:', err)
		}
	}
</script>

<div class="h-full flex flex-col bg-bg-secondary">
	<!-- Draggable title bar area -->
	<div class="h-10 shrink-0" data-tauri-drag-region></div>

	<div class="flex-1 flex items-center justify-center">
		<div class="text-center p-8 max-w-lg select-none">
			<div
				role="img"
				aria-label="Folders"
				class="w-48 aspect-square mx-auto mb-2 opacity-40 animate-fade-in-up"
				style="animation-delay: 0ms; background-color: var(--color-text); -webkit-mask-image: url(/folders-dark.png); -webkit-mask-size: contain; -webkit-mask-repeat: no-repeat; -webkit-mask-position: center; mask-image: url(/folders-dark.png); mask-size: contain; mask-repeat: no-repeat; mask-position: center;"
			></div>

			<h1
				class="text-3xl text-text font-serif mb-2 tracking-[-0.01em] animate-fade-in-up"
				style="animation-delay: 100ms;"
			>
				Welcome to Scratch
			</h1>
			<p
				class="text-text-muted mb-6 animate-fade-in-up"
				style="animation-delay: 100ms;"
			>
				Scratch is an offline-first notes app. Your notes are simply
				stored on your computer as markdown files.
			</p>
			<div class="animate-fade-in-up" style="animation-delay: 200ms;">
				<Button onclick={handleSelectFolder} size="xl">
					Choose your notes folder
				</Button>
			</div>

			<p
				class="mt-2 text-xs text-text-muted/60 animate-fade-in-up"
				style="animation-delay: 300ms;"
			>
				You can change this later
			</p>
		</div>
	</div>
</div>
