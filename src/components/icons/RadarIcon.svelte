<script lang="ts">
	interface Props {
		class?: string
		className?: string
		[key: string]: unknown
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
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	{...restProps}
>
	<path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
	<path d="M21 12h-8a1 1 0 1 0 -1 1v8a9 9 0 0 0 9 -9"></path>
	<path d="M16 9a5 5 0 1 0 -7 7"></path>
	<path d="M20.486 9a9 9 0 1 0 -11.486 11.486"></path>
	<path d="M12 3v9"></path>
</svg>
