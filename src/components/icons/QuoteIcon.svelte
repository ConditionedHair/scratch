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
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	{...restProps}
>
	<path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
	<path d="M6 15h15"></path>
	<path d="M21 19h-15"></path>
	<path d="M15 11h6"></path>
	<path d="M21 7h-6"></path>
	<path d="M9 9h1a1 1 0 1 1 -1 1v-2.5a2 2 0 0 1 2 -2"></path>
	<path d="M3 9h1a1 1 0 1 1 -1 1v-2.5a2 2 0 0 1 2 -2"></path>
</svg>
