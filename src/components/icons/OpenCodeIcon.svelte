<script lang="ts">
	interface Props {
		class?: string
		className?: string
		[key: string]: any
	}
	let {
		class: klass = 'w-4.5 h-4.5 text-text-muted',
		className = klass,
		...restProps
	}: Props = $props()
	let finalClass = $derived(className || klass)
</script>

<svg
	class={finalClass}
	fill="currentColor"
	viewBox="0 0 240 300"
	{...restProps}
>
	<title>OpenCode icon</title>
	<path d="M180 60H60V240H180V60ZM240 300H0V0H240V300Z"></path>
	<path d="M180 240H60V120H180V240Z" opacity="0.55"></path>
</svg>
