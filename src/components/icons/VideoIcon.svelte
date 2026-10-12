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
	<polygon points="23 7 16 12 23 17 23 7"></polygon>
	<rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
</svg>
