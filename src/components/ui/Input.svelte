<script lang="ts">
	import type { HTMLInputAttributes } from 'svelte/elements'
	import { cn } from '../../lib/utils'

	interface Props extends Omit<HTMLInputAttributes, 'value'> {
		value?: string | number
		class?: string
		ref?: HTMLInputElement | null
	}

	let {
		value = $bindable(''),
		class: className = '',
		type = 'text',
		ref = $bindable(null),
		...restProps
	}: Props = $props()
</script>

<input
	bind:this={ref}
	{type}
	bind:value
	class={cn(
		'flex h-10 w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-text',
		'ring-offset-bg file:border-0 file:bg-transparent file:text-sm file:font-medium',
		'placeholder:text-text-muted',
		'focus-visible:outline-none focus-visible:border-accent',
		'disabled:cursor-not-allowed disabled:opacity-50',
		className
	)}
	{...restProps}
/>
