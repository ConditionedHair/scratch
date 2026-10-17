<script lang="ts">
	interface Props {
		text: string
		length?: number
		size?: 'sm' | 'md' | 'lg'
		accent?: boolean
	}

	let { text = '', length, size = 'md', accent = false }: Props = $props()

	let chars = $derived.by(() => {
		const upper = text.toUpperCase()
		const targetLen = length ? Math.max(length, upper.length) : upper.length
		return upper.padEnd(targetLen, ' ').split('')
	})

	const sizeClasses = {
		sm: 'h-6 text-[11px] min-w-[14px] px-1',
		md: 'h-8 text-sm min-w-[20px] px-1.5',
		lg: 'h-11 text-xl min-w-[26px] px-2 font-bold'
	}
</script>

<div class="inline-flex items-center gap-0.5 select-none font-mono">
	{#each chars as char, idx (idx)}
		<div
			class={`relative flex items-center justify-center rounded-[3px] shadow-sm overflow-hidden border border-border/80 ${
				sizeClasses[size]
			} ${
				accent
					? 'bg-accent text-white font-bold'
					: 'bg-bg-emphasis text-text font-semibold'
			}`}
		>
			<!-- Split line seam -->
			<div
				class="absolute inset-x-0 top-1/2 h-[1px] bg-black/30 dark:bg-black/50 z-10 pointer-events-none"
			></div>
			<!-- Top highlight -->
			<div
				class="absolute inset-x-0 top-0 h-1/2 bg-white/5 pointer-events-none"
			></div>
			<!-- Tabular char -->
			<span class="z-0 tracking-tight leading-none">{char === ' ' ? '\u00A0' : char}</span>
		</div>
	{/each}
</div>
