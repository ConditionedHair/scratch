<script lang="ts">
	import { CheckIcon, XIcon, LinkOffIcon } from '../icons'
	import { Input, IconButton } from '../ui'

	interface Props {
		initialUrl: string
		initialText?: string
		onsubmit: (url: string, text?: string) => void
		onremove: () => void
		oncancel: () => void
	}

	let { initialUrl, initialText, onsubmit, onremove, oncancel }: Props =
		$props()

	let hasExistingLink = $derived(!!initialUrl)
	let needsText = $derived(initialText !== undefined)

	let text = $state('')
	let url = $state('')

	$effect(() => {
		text = initialText || ''
		url = initialUrl
	})

	let urlInputRef: HTMLInputElement | null = $state(null)
	let textInputRef: HTMLInputElement | null = $state(null)

	$effect(() => {
		requestAnimationFrame(() => {
			if (needsText) {
				textInputRef?.focus()
				textInputRef?.select()
			} else {
				urlInputRef?.focus()
				urlInputRef?.select()
			}
		})
	})

	function handleSubmit() {
		if (needsText) {
			onsubmit(url, text)
		} else {
			onsubmit(url)
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleSubmit()
		} else if (e.key === 'Escape') {
			e.preventDefault()
			oncancel()
		} else if (e.key === 'Tab') {
			e.stopPropagation()
		}
	}
</script>

<div
	class={`flex gap-0.5 bg-bg border border-border rounded-lg shadow-md p-1.5 ${
		needsText ? 'flex-col items-stretch' : 'items-center'
	}`}
>
	<div class={`flex gap-1.5 ${needsText ? 'flex-col' : ''}`}>
		{#if needsText}
			<Input
				bind:ref={textInputRef}
				type="text"
				bind:value={text}
				placeholder="Link text..."
				class="w-70 h-9"
				onkeydown={handleKeyDown}
				tabindex={0}
			/>
		{/if}
		<Input
			bind:ref={urlInputRef}
			type="url"
			bind:value={url}
			placeholder="Enter URL..."
			class={needsText ? 'w-70 h-9' : 'w-55 h-9'}
			onkeydown={handleKeyDown}
			tabindex={0}
		/>
	</div>
	<div
		class={`flex gap-1 items-center ${
			needsText ? 'justify-end mt-1.5 mb-0.5' : 'ml-1.5 mr-0.5'
		}`}
	>
		<IconButton
			type="button"
			onclick={handleSubmit}
			title="Apply"
			size="xs"
			variant="ghost"
		>
			<CheckIcon class="w-4.5 h-4.5 stroke-[1.5]" />
		</IconButton>
		{#if hasExistingLink}
			<IconButton
				type="button"
				onclick={onremove}
				title="Remove link"
				size="xs"
				variant="ghost"
			>
				<LinkOffIcon class="w-4.5 h-4.5 stroke-[1.5]" />
			</IconButton>
		{/if}
		<IconButton
			type="button"
			onclick={oncancel}
			title="Cancel"
			size="xs"
			variant="ghost"
		>
			<XIcon class="w-4.5 h-4.5 stroke-[1.5]" />
		</IconButton>
	</div>
</div>
