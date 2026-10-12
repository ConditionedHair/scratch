<script lang="ts">
	import { Input, IconButton } from '../ui'
	import {
		ArrowUpIcon,
		ArrowDownIcon,
		XIcon,
		ChevronDownIcon,
		ChevronRightIcon,
		ReplaceIcon,
		ReplaceAllIcon
	} from '../icons'
	import { shift } from '../../lib/platform'

	interface Props {
		query: string
		onchange: (query: string) => void
		onnext: () => void
		onprevious: () => void
		onclose: () => void
		currentMatch: number
		totalMatches: number
		inputEl?: HTMLInputElement | null
		replaceQuery: string
		onreplacechange: (value: string) => void
		onreplace: () => void
		onreplaceall: () => void
		isReplaceOpen: boolean
		ontogglereplace: () => void
	}

	let {
		query,
		onchange,
		onnext,
		onprevious,
		onclose,
		currentMatch,
		totalMatches,
		inputEl = $bindable(null),
		replaceQuery,
		onreplacechange,
		onreplace,
		onreplaceall,
		isReplaceOpen,
		ontogglereplace
	}: Props = $props()

	$effect(() => {
		const frame = requestAnimationFrame(() => inputEl?.focus())
		return () => cancelAnimationFrame(frame)
	})

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault()
			e.stopPropagation()
			if (e.shiftKey) {
				onprevious()
			} else {
				onnext()
			}
		} else if (e.key === 'Escape') {
			e.preventDefault()
			e.stopPropagation()
			onclose()
		} else if (e.key === 'Tab') {
			e.stopPropagation()
		}
	}

	function handleReplaceKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault()
			e.stopPropagation()
			if (e.metaKey || e.ctrlKey) {
				onreplaceall()
			} else {
				onreplace()
			}
		} else if (e.key === 'Escape') {
			e.preventDefault()
			e.stopPropagation()
			onclose()
		} else if (e.key === 'Tab') {
			e.stopPropagation()
		}
	}
</script>

<div
	class="flex flex-col gap-1.5 bg-bg border border-border rounded-lg shadow-lg p-1.5 w-85 text-text search-toolbar-container"
>
	<!-- First Row: Find -->
	<div class="flex items-center gap-1.5">
		<IconButton
			onclick={ontogglereplace}
			title={isReplaceOpen ? 'Hide Replace' : 'Show Replace'}
			class="shrink-0"
		>
			{#if isReplaceOpen}
				<ChevronDownIcon class="w-4 h-4 stroke-[1.8]" />
			{:else}
				<ChevronRightIcon class="w-4 h-4 stroke-[1.8]" />
			{/if}
		</IconButton>

		<Input
			bind:ref={inputEl}
			type="text"
			value={query}
			oninput={(e) => onchange((e.target as HTMLInputElement).value)}
			placeholder="Find in note..."
			class="flex-1 h-8 text-sm"
			onkeydown={handleKeyDown}
		/>

		<span
			class="text-xs text-text-muted whitespace-nowrap px-1 min-w-10 text-right"
		>
			{totalMatches > 0 ? `${currentMatch}/${totalMatches}` : '0/0'}
		</span>

		<div class="flex items-center gap-px shrink-0">
			<IconButton
				onclick={onprevious}
				disabled={totalMatches === 0}
				title="Previous match ({shift}↵)"
			>
				<ArrowUpIcon class="w-4.5 h-4.5 stroke-[1.5]" />
			</IconButton>

			<IconButton
				onclick={onnext}
				disabled={totalMatches === 0}
				title="Next match (↵)"
			>
				<ArrowDownIcon class="w-4.5 h-4.5 stroke-[1.5]" />
			</IconButton>

			<IconButton onclick={onclose} title="Close (Esc)">
				<XIcon class="w-4.5 h-4.5 stroke-[1.5]" />
			</IconButton>
		</div>
	</div>

	<!-- Second Row: Replace -->
	{#if isReplaceOpen}
		<div
			class="flex items-center gap-1.5 pl-8.5 animate-in slide-in-from-top-1 duration-150"
		>
			<Input
				type="text"
				value={replaceQuery}
				oninput={(e) =>
					onreplacechange((e.target as HTMLInputElement).value)}
				placeholder="Replace with..."
				class="flex-1 h-8 text-sm"
				onkeydown={handleReplaceKeyDown}
			/>

			<div class="flex items-center gap-px shrink-0">
				<IconButton
					onclick={onreplace}
					disabled={totalMatches === 0}
					title="Replace (↵)"
				>
					<ReplaceIcon class="w-4.5 h-4.5 stroke-[1.5]" />
				</IconButton>

				<IconButton
					onclick={onreplaceall}
					disabled={totalMatches === 0}
					title="Replace All (Ctrl/Cmd+Enter)"
				>
					<ReplaceAllIcon class="w-4.5 h-4.5 stroke-[1.5]" />
				</IconButton>
			</div>
		</div>
	{/if}
</div>
