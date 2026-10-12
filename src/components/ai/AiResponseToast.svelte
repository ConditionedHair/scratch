<script lang="ts">
	import { ClaudeIcon, CodexIcon, OpenCodeIcon, OllamaIcon } from '../icons'
	import { mod } from '../../lib/platform'
	import type { AiProvider } from '../../services/ai'
	import { CodeCopyButton } from '../ui'

	interface Props {
		output: string
		provider: AiProvider
	}

	let { output, provider }: Props = $props()

	type BlockToken =
		| { type: 'code'; code: string }
		| { type: 'list'; listType: 'ul' | 'ol'; items: string[] }
		| { type: 'header'; text: string }
		| { type: 'paragraph'; text: string }
		| { type: 'space' }

	function parseBlocks(text: string): BlockToken[] {
		const lines = text.split('\n')
		const blocks: BlockToken[] = []
		let inCodeBlock = false
		let codeBlockContent: string[] = []
		let listItems: string[] = []
		let listType: 'ul' | 'ol' | null = null

		const flushList = () => {
			if (listItems.length > 0 && listType) {
				blocks.push({ type: 'list', listType, items: [...listItems] })
				listItems = []
				listType = null
			}
		}

		lines.forEach((line) => {
			if (line.trim().startsWith('```')) {
				if (inCodeBlock) {
					blocks.push({
						type: 'code',
						code: codeBlockContent.join('\n')
					})
					codeBlockContent = []
					inCodeBlock = false
				} else {
					flushList()
					inCodeBlock = true
				}
				return
			}

			if (inCodeBlock) {
				codeBlockContent.push(line)
				return
			}

			if (line.match(/^\s*[-*]\s+/)) {
				if (listType !== 'ul') {
					flushList()
					listType = 'ul'
				}
				listItems.push(line.replace(/^\s*[-*]\s+/, ''))
				return
			}

			if (line.match(/^\s*\d+\.\s+/)) {
				if (listType !== 'ol') {
					flushList()
					listType = 'ol'
				}
				listItems.push(line.replace(/^\s*\d+\.\s+/, ''))
				return
			}

			const headerMatch = line.match(/^(#{1,6})\s+(.+)$/)
			if (headerMatch) {
				flushList()
				blocks.push({ type: 'header', text: headerMatch[2] })
				return
			}

			flushList()
			if (line.trim()) {
				blocks.push({ type: 'paragraph', text: line })
			} else if (blocks.length > 0) {
				blocks.push({ type: 'space' })
			}
		})

		if (inCodeBlock && codeBlockContent.length > 0) {
			blocks.push({ type: 'code', code: codeBlockContent.join('\n') })
		}

		flushList()
		return blocks
	}

	function renderInline(text: string): string {
		return text
			.replace(
				/`([^`]+)`/g,
				'<code class="bg-bg-secondary rounded px-1 py-0.5 font-mono text-xs">$1</code>'
			)
			.replace(
				/(\*\*|__)(.+?)\1/g,
				'<strong class="font-semibold">$2</strong>'
			)
			.replace(
				/(?<!\*)\*(?!\*)(.+?)\*(?!\*)|(?<!_)_(?!_)(.+?)_(?!_)/g,
				'<em class="italic">$1$2</em>'
			)
	}

	let blocks = $derived(parseBlocks(output))
</script>

<div class="flex gap-3 items-start">
	{#if provider === 'codex'}
		<CodexIcon class="w-4.5 h-4.5 shrink-0 mt-px" />
	{:else if provider === 'opencode'}
		<OpenCodeIcon class="w-4.5 h-4.5 shrink-0 mt-px" />
	{:else if provider === 'ollama'}
		<OllamaIcon class="w-4.5 h-4.5 shrink-0 mt-px" />
	{:else}
		<ClaudeIcon class="w-4.5 h-4.5 shrink-0 mt-px" />
	{/if}

	<div class="flex-1 space-y-2 min-w-0">
		<div class="font-medium text-sm">AI Edit Complete</div>
		<div class="text-text-muted max-h-60 overflow-y-auto pr-2">
			{#each blocks as block}
				{#if block.type === 'code'}
					<div class="relative my-1">
						<div class="absolute top-1.5 right-1.5 z-10">
							<CodeCopyButton
								text={block.code}
								class="bg-bg/80 backdrop-blur-sm"
							/>
						</div>
						<pre
							class="bg-bg-secondary rounded px-2 pt-8 pb-1 my-1 overflow-x-auto"><code
								class="text-xs font-mono">{block.code}</code
							></pre>
					</div>
				{:else if block.type === 'list'}
					{#if block.listType === 'ol'}
						<ol class="list-decimal list-inside space-y-0.5 my-1">
							{#each block.items as item}
								<li class="text-xs">
									{@html renderInline(item)}
								</li>
							{/each}
						</ol>
					{:else}
						<ul class="list-disc list-inside space-y-0.5 my-1">
							{#each block.items as item}
								<li class="text-xs">
									{@html renderInline(item)}
								</li>
							{/each}
						</ul>
					{/if}
				{:else if block.type === 'header'}
					<p class="text-xs my-1 font-semibold">
						{@html renderInline(block.text)}
					</p>
				{:else if block.type === 'paragraph'}
					<p class="text-xs my-1">{@html renderInline(block.text)}</p>
				{:else if block.type === 'space'}
					<div class="h-1"></div>
				{/if}
			{/each}
		</div>
		<div
			class="text-xs text-text-muted mt-2 pt-2.5 border-t border-border border-dashed"
		>
			Use {mod}+Z to undo changes
		</div>
	</div>
</div>
