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

<AlertDialog.Description
	class={cn('text-sm text-text-muted', className)}
	{...restProps}
>
	{@render children?.()}
</AlertDialog.Description>
