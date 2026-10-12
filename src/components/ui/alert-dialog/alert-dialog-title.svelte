<script lang="ts">
	import type { Snippet } from 'svelte'
	import { AlertDialog } from 'bits-ui'
	import { cn } from '../../../lib/utils'

	interface Props {
		class?: string
		children?: Snippet
	}

	let { class: className = '', children, ...restProps }: Props = $props()
</script>

<AlertDialog.Title
	class={cn('text-lg font-medium text-text', className)}
	{...restProps}
>
	{@render children?.()}
</AlertDialog.Title>
