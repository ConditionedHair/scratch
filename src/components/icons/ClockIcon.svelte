<script lang="ts">
	interface Props {
		class?: string
		className?: string
		[key: string]: any
	}
	let {
		class: klass = 'w-4 h-4',
		className = klass,
		...restProps
	}: Props = $props()
	let finalClass = $derived(className || klass)
</script>

<svg
	class={finalClass}
	fill="none"
	stroke="currentColor"
	viewBox="0 0 24 24"
	stroke-width="1.8"
	stroke-linecap="round"
	stroke-linejoin="round"
	{...restProps}
>
	<circle cx="12" cy="12" r="10"></circle>
	<polyline points="12 6 12 12 16 14"></polyline>
</svg>
