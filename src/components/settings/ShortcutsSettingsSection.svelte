<script lang="ts">
	import { shortcutCategories } from '../../lib/shortcuts'

	// Categories to show in settings (exclude Markdown Syntax)
	const settingsCategories = ['Navigation', 'Notes', 'Editor', 'Settings']
</script>

<div class="space-y-8 pb-8">
	{#each settingsCategories as categoryName, idx (categoryName)}
		{@const category = shortcutCategories.find(
			(c) => c.title === categoryName
		)}
		{#if category}
			<div>
				{#if idx > 0}
					<div class="border-t border-border border-dashed"></div>
				{/if}
				<section>
					<h2 class="text-xl font-medium pt-8 mb-4">
						{categoryName}
					</h2>
					<div class="space-y-3">
						{#each category.shortcuts as shortcut (shortcut.description)}
							<div
								class="flex items-center justify-between gap-4"
							>
								<span class="text-sm text-text font-medium">
									{shortcut.description}
								</span>
								<div class="flex items-center gap-1.5">
									{#each shortcut.keys as key (key)}
										<kbd
											class="text-xs px-1.5 py-0.5 rounded-md bg-bg-muted text-text min-w-6.5 inline-flex items-center justify-center"
										>
											{key}
										</kbd>
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</section>
			</div>
		{/if}
	{/each}
</div>
