<script lang="ts">
	interface Props {
		class?: string
		className?: string
		[key: string]: any
	}
	let {
		class: klass = 'w-4.5 h-4.5 animate-spin',
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
	<path d="M12 6l0 -3"></path>
	<path d="M16.25 7.75l2.15 -2.15"></path>
	<path d="M18 12l3 0"></path>
	<path d="M16.25 16.25l2.15 2.15"></path>
	<path d="M12 18l0 3"></path>
	<path d="M7.75 16.25l-2.15 2.15"></path>
	<path d="M6 12l-3 0"></path>
	<path d="M7.75 7.75l-2.15 -2.15"></path>
</svg>
