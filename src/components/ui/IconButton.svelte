<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { HTMLButtonAttributes } from 'svelte/elements'
	import { cn } from '../../lib/utils'
	import Tooltip from './Tooltip.svelte'

	type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
	type IconButtonVariant =
		'primary' | 'default' | 'secondary' | 'ghost' | 'outline'

	const iconButtonSizes: Record<IconButtonSize, string> = {
		xs: 'w-6 h-6',
		sm: 'w-7 h-7',
		md: 'w-8 h-8',
		lg: 'w-9 h-9',
		xl: 'w-10 h-10'
	}

	const iconButtonVariants: Record<IconButtonVariant, string> = {
		primary:
			'bg-accent text-slate-950 font-semibold hover:brightness-105 active:scale-95 shadow-xs',
		default: 'bg-bg-emphasis text-text hover:bg-bg-muted active:scale-95',
		secondary: 'bg-bg-muted text-text hover:bg-bg-emphasis active:scale-95',
		ghost: 'hover:bg-bg-muted text-text-muted hover:text-text active:scale-95',
		outline:
			'border border-border text-text-muted hover:bg-bg-muted hover:text-text active:scale-95'
	}

	interface Props extends HTMLButtonAttributes {
		size?: IconButtonSize
		variant?: IconButtonVariant
		class?: string
		title?: string
		children?: Snippet
	}

	let {
		size = 'sm',
		variant = 'ghost',
		class: className = '',
		title,
		children,
		type = 'button',
		...restProps
	}: Props = $props()
</script>

{#if title}
	<Tooltip content={title}>
		<button
			{type}
			class={cn(
				'flex items-center justify-center rounded-md transition-colors',
				'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
				'disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
				iconButtonSizes[size],
				iconButtonVariants[variant],
				className
			)}
			tabindex={-1}
			aria-label={title}
			{...restProps}
		>
			{@render children?.()}
		</button>
	</Tooltip>
{:else}
	<button
		{type}
		class={cn(
			'flex items-center justify-center rounded-md transition-colors',
			'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
			'disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
			iconButtonSizes[size],
			iconButtonVariants[variant],
			className
		)}
		tabindex={-1}
		aria-label={title}
		{...restProps}
	>
		{@render children?.()}
	</button>
{/if}
