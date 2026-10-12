<script lang="ts">
	interface Props {
		class?: string
		className?: string
		filled?: boolean
		[key: string]: any
	}
	let {
		class: klass = 'w-3.5 h-3.5',
		className = klass,
		filled = false,
		...restProps
	}: Props = $props()
	let finalClass = $derived(className || klass)
</script>

<svg
	class={finalClass}
	fill={filled ? 'currentColor' : 'none'}
	stroke="currentColor"
	viewBox="0 0 24 24"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	{...restProps}
>
	<polygon
		points="4 4 14 4 20 12 14 20 4 20 8.5 12 4 4"
	></polygon>
</svg>
