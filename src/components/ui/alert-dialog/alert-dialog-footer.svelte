<script lang="ts">
	import type { Snippet } from 'svelte'
	import { cn } from '../../../lib/utils'

	interface Props {
		class?: string
		children?: Snippet
	}

	let { class: className = '', children, ...restProps }: Props = $props()
</script>

<div
	class={cn(
		'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>
