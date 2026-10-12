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

<AlertDialog.Portal>
	<AlertDialog.Overlay
		class="fixed inset-0 z-50 bg-text/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
	/>
	<AlertDialog.Content
		class={cn(
			'fixed left-[50%] top-[50%] z-50 grid w-full max-w-md translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-bg p-6 shadow-lg duration-200 rounded-lg',
			className
		)}
		{...restProps}
	>
		{@render children?.()}
	</AlertDialog.Content>
</AlertDialog.Portal>
