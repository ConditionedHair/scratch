<script lang="ts">
	import type { Snippet } from 'svelte'
	import { Tooltip } from 'bits-ui'
	import { cn } from '../../lib/utils'

	interface Props {
		children?: Snippet
		content: string | Snippet
		side?: 'top' | 'right' | 'bottom' | 'left'
		delayDuration?: number
		class?: string
	}

	let {
		children,
		content,
		side = 'bottom',
		delayDuration = 200,
		class: className = ''
	}: Props = $props()
</script>

<Tooltip.Provider {delayDuration}>
	<Tooltip.Root>
		<Tooltip.Trigger>
			{#snippet child({ props })}
				<span {...props} class="inline-flex">
					{@render children?.()}
				</span>
			{/snippet}
		</Tooltip.Trigger>
		<Tooltip.Portal>
			<Tooltip.Content
				{side}
				sideOffset={4}
				class={cn(
					'z-[10000] overflow-hidden rounded-md bg-text/80 backdrop-blur-sm text-text-inverse px-2 py-1 mx-1.5 text-xs shadow-md',
					'animate-in fade-in-0 zoom-in-95',
					'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
					className
				)}
			>
				{#if typeof content === 'string'}
					{content}
				{:else if content}
					{@render content()}
				{/if}
			</Tooltip.Content>
		</Tooltip.Portal>
	</Tooltip.Root>
</Tooltip.Provider>
