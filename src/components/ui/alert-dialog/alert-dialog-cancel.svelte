<script lang="ts">
	import type { Snippet } from 'svelte'
	import { AlertDialog } from 'bits-ui'
	import { cn } from '../../../lib/utils'

	interface Props {
		class?: string
		children?: Snippet
		onclick?: (e: MouseEvent) => void
	}

	let {
		class: className = '',
		children,
		onclick,
		...restProps
	}: Props = $props()
</script>

<AlertDialog.Cancel
	{onclick}
	class={cn(
		'inline-flex items-center justify-center whitespace-nowrap font-medium transition-colors',
		'focus-visible:outline focus-visible:outline-accent',
		'disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
		'h-8 px-3 text-sm border border-border bg-transparent hover:bg-bg-muted text-text rounded-md',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</AlertDialog.Cancel>
