<script lang="ts">
	import type { Component, Snippet } from 'svelte'
	import { cn } from '../../lib/utils'

	interface Props {
		label: string
		subtitle?: string
		shortcut?: string
		icon?: Component<any> | Snippet
		iconText?: string
		variant?: 'note' | 'command'
		isSelected?: boolean
		onclick?: () => void
	}

	let {
		label,
		subtitle,
		shortcut,
		icon,
		iconText,
		variant = 'command',
		isSelected = false,
		onclick
	}: Props = $props()
</script>

<div
	{onclick}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			onclick?.()
		}
	}}
	role="button"
	tabindex={-1}
	class={cn(
		'w-full text-left px-3.5 py-2.5 rounded-xl flex items-center justify-between transition-all cursor-pointer border',
		isSelected
			? 'bg-bg-emphasis border-border text-text shadow-xs'
			: 'border-transparent text-text hover:bg-bg-muted/60'
	)}
>
	<div class="flex items-center gap-3 min-w-0">
		{#if icon || iconText}
			<div
				class={cn(
					'shrink-0 flex items-center justify-center text-text-muted',
					variant === 'note' &&
						'w-9 h-9 rounded-md bg-bg-emphasis flex items-center justify-center'
				)}
			>
				{#if iconText}
					<span class="text-xl text-text-muted font-serif">
						{iconText}
					</span>
				{:else if typeof icon === 'function' && icon.length === 0}
					{@render (icon as Snippet)()}
				{:else if icon}
					{@const Icon = icon as Component<any>}
					<Icon class="w-4.5 h-4.5 stroke-[1.5]" />
				{/if}
			</div>
		{/if}
		<div class="flex flex-col min-w-0">
			<span class="text-[15px] font-medium truncate">{label}</span>
			{#if subtitle}
				<span class="text-sm truncate text-text-muted">{subtitle}</span>
			{/if}
		</div>
	</div>
	{#if shortcut}
		<kbd
			class={cn(
				'text-xs px-2 py-0.5 rounded-md ml-2',
				isSelected
					? 'bg-bg-muted text-text'
					: 'bg-bg-muted text-text-muted'
			)}
		>
			{shortcut}
		</kbd>
	{/if}
</div>
