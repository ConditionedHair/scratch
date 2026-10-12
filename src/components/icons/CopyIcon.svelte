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
	<path
		d="M7 9.667a2.667 2.667 0 0 1 2.667 -2.667h8.666a2.667 2.667 0 0 1 2.667 2.667v8.666a2.667 2.667 0 0 1 -2.667 2.667h-8.666a2.667 2.667 0 0 1 -2.667 -2.667l0 -8.666"
	></path>
	<path
		d="M4.012 16.737a2.005 2.005 0 0 1 -1.012 -1.737v-10c0 -1.1 .9 -2 2 -2h10c.75 0 1.158 .385 1.5 1"
	></path>
</svg>
