<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { HTMLSelectAttributes } from 'svelte/elements'
	import { cn } from '../../lib/utils'
	import { ChevronDownIcon } from '../icons'

	interface Props extends Omit<HTMLSelectAttributes, 'value'> {
		value?: any
		class?: string
		children?: Snippet
	}

	let {
		value = $bindable(),
		class: className = '',
		children,
		...restProps
	}: Props = $props()
</script>

<div class="relative">
	<select
		bind:value
		class={cn(
			'flex h-9 w-full items-center justify-between rounded-md border border-border bg-bg px-3 py-2 text-sm text-text',
			'focus:outline focus:outline-accent',
			'disabled:cursor-not-allowed disabled:opacity-50',
			'[&>option]:bg-bg [&>option]:text-text',
			'appearance-none pr-8 cursor-pointer',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</select>
	<ChevronDownIcon
		class="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 stroke-[1.7] text-text-muted pointer-events-none"
	/>
</div>
