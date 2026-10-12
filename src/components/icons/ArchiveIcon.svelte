<script lang="ts">
	interface Props {
		class?: string
		className?: string
		[key: string]: any
	}
	let {
		class: klass = 'w-4.5 h-4.5',
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
	<polyline points="21 8 21 21 3 21 3 8"></polyline>
	<rect x="1" y="3" width="22" height="5"></rect>
	<line x1="10" y1="12" x2="14" y2="12"></line>
</svg>
