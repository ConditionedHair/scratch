<script lang="ts">
	interface Props {
		code: string
	}

	let { code }: Props = $props()

	let svg = $state<string | null>(null)
	let error = $state<string | null>(null)
	let loading = $state(true)

	$effect(() => {
		let cancelled = false
		const trimmed = code.trim()
		if (!trimmed) {
			svg = null
			error = null
			loading = false
			return
		}

		loading = true
		import('beautiful-mermaid')
			.then(({ renderMermaidSVG }) => {
				if (cancelled) return
				try {
					const rendered = renderMermaidSVG(trimmed, {
						bg: 'var(--color-bg)',
						fg: 'var(--color-text)',
						muted: 'var(--color-text-muted)',
						border: 'var(--color-border)',
						transparent: true
					})
					svg = rendered
					error = null
				} catch (err) {
					error =
						err instanceof Error
							? err.message
							: 'Invalid mermaid syntax'
					svg = null
				} finally {
					loading = false
				}
			})
			.catch(() => {
				if (cancelled) return
				error = 'Failed to load mermaid engine'
				loading = false
			})

		return () => {
			cancelled = true
		}
	})
</script>

{#if loading && !svg}
	<div
		class="text-xs text-text-muted italic px-2 pt-6 pb-3 text-center animate-pulse"
	>
		Rendering diagram...
	</div>
{:else if error}
	<div class="text-xs text-text-muted italic px-2 pt-6 pb-3 text-center">
		Mermaid syntax error
	</div>
{:else if !svg}
	<div class="text-xs text-text-muted italic px-2 pt-6 pb-3 text-center">
		Empty mermaid diagram
	</div>
{:else}
	<div class="mermaid-diagram flex justify-center py-2">
		{@html svg}
	</div>
{/if}
