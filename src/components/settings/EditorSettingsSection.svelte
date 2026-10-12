<script lang="ts">
	import { themeState } from '../../context/theme.svelte'
	import { Button, CodeCopyButton, IconButton, Input, Select } from '../ui'
	import ColorsExpandable from './ColorsExpandable.svelte'
	import { EyeIcon, MinusIcon, PlusIcon } from '../icons'
	import { isMac } from '../../lib/platform'
	import type {
		FontFamily,
		TextDirection,
		EditorWidth
	} from '../../types/note'

	// Text direction options
	const textDirectionOptions: { value: TextDirection; label: string }[] = [
		{ value: 'auto', label: 'Auto' },
		{ value: 'ltr', label: 'LTR' },
		{ value: 'rtl', label: 'RTL' }
	]

	// Page width options
	const editorWidthOptions: { value: EditorWidth; label: string }[] = [
		{ value: 'narrow', label: 'Narrow' },
		{ value: 'normal', label: 'Normal' },
		{ value: 'wide', label: 'Wide' },
		{ value: 'full', label: 'Full' },
		{ value: 'custom', label: 'Custom' }
	]

	// Font family options
	const fontFamilyOptions: { value: FontFamily; label: string }[] = [
		{ value: 'neue-haas', label: 'Neue Haas Grotesk' },
		{ value: 'system-sans', label: 'System Sans' },
		{ value: 'serif', label: 'Serif' },
		{ value: 'monospace', label: 'Mono' }
	]

	// Bold weight options (medium excluded for monospace)
	const boldWeightOptions = [
		{ value: 500, label: 'Medium', excludeForMonospace: true },
		{ value: 600, label: 'Semibold', excludeForMonospace: false },
		{ value: 700, label: 'Bold', excludeForMonospace: false },
		{ value: 800, label: 'Extra Bold', excludeForMonospace: false }
	]

	function handleNumericChange(
		field: 'baseFontSize' | 'lineHeight',
		value: string,
		min: number,
		max: number
	) {
		const parsed = parseFloat(value)
		if (!Number.isFinite(parsed)) return
		const clamped = Math.min(Math.max(parsed, min), max)
		themeState.setEditorFontSetting(field, clamped)
	}

	let hasCustomFonts = $derived(
		(themeState.editorFontSettings.baseFontFamily !== 'neue-haas' &&
			themeState.editorFontSettings.baseFontFamily !== 'system-sans') ||
			themeState.editorFontSettings.baseFontSize !== 15 ||
			themeState.editorFontSettings.boldWeight !== 600 ||
			themeState.editorFontSettings.lineHeight !== 1.6 ||
			themeState.textDirection !== 'auto' ||
			themeState.editorWidth !== 'normal' ||
			Math.round(themeState.interfaceZoom * 100) !== 100 ||
			!themeState.animationsEnabled ||
			themeState.liquidGlassEnabled
	)

	let isMonospace = $derived(
		themeState.editorFontSettings.baseFontFamily === 'monospace'
	)

	let availableWeightOptions = $derived(
		boldWeightOptions.filter(
			(opt) => !isMonospace || !opt.excludeForMonospace
		)
	)

	function handleFontFamilyChange(newFamily: FontFamily) {
		themeState.setEditorFontSetting('baseFontFamily', newFamily)
		if (
			newFamily === 'monospace' &&
			themeState.editorFontSettings.boldWeight === 500
		) {
			themeState.setEditorFontSetting('boldWeight', 600)
		}
	}

	const sampleCode = `function acquireFood() {
  while (bowl.isEmpty()) {
    meow();
    rubAgainstLegs();
    if (human.isInKitchen) {
      stareIntently();
    }
  }
}`
</script>

<div class="space-y-8 py-8">
	<!-- Theme Section -->
	<section class="pb-2">
		<h2 class="text-xl font-medium mb-3">Theme</h2>
		<div class="flex gap-2 p-1 rounded-[10px] border border-border">
			{#each ['light', 'dark', 'system'] as const as mode}
				<Button
					onclick={() => themeState.setTheme(mode)}
					variant={themeState.theme === mode ? 'primary' : 'ghost'}
					size="md"
					class="flex-1"
				>
					{mode.charAt(0).toUpperCase() + mode.slice(1)}
				</Button>
			{/each}
		</div>
		{#if themeState.theme === 'system'}
			<p class="mt-3 text-sm text-text-muted">
				Currently using {themeState.resolvedTheme} mode based on system preference
			</p>
		{/if}

		<!-- Customize Colors -->
		{#if themeState.theme === 'system'}
			<div class="mt-4 space-y-2">
				<ColorsExpandable
					label="Customize light colors"
					mode="light"
					customColors={themeState.customColorsLight}
					setCustomColor={(m, k, v) =>
						themeState.setCustomColor(m, k, v)}
					resetCustomColor={(m, k) =>
						themeState.resetCustomColor(m, k)}
					resetAllCustomColors={(m) =>
						themeState.resetAllCustomColors(m)}
				/>
				<ColorsExpandable
					label="Customize dark colors"
					mode="dark"
					customColors={themeState.customColorsDark}
					setCustomColor={(m, k, v) =>
						themeState.setCustomColor(m, k, v)}
					resetCustomColor={(m, k) =>
						themeState.resetCustomColor(m, k)}
					resetAllCustomColors={(m) =>
						themeState.resetAllCustomColors(m)}
				/>
			</div>
		{:else}
			<ColorsExpandable
				label="Customize colors"
				mode={themeState.resolvedTheme}
				customColors={themeState.resolvedTheme === 'dark'
					? themeState.customColorsDark
					: themeState.customColorsLight}
				setCustomColor={(m, k, v) => themeState.setCustomColor(m, k, v)}
				resetCustomColor={(m, k) => themeState.resetCustomColor(m, k)}
				resetAllCustomColors={(m) => themeState.resetAllCustomColors(m)}
				class="mt-4"
			/>
		{/if}
	</section>

	<!-- Divider -->
	<div class="border-t border-border border-dashed"></div>

	<!-- Typography Section -->
	<section>
		<div class="flex items-baseline justify-between mb-3">
			<h2 class="text-xl font-medium">Typography</h2>
			{#if hasCustomFonts}
				<Button
					onclick={() => themeState.resetEditorFontSettings()}
					variant="ghost"
					size="sm"
				>
					Reset to defaults
				</Button>
			{/if}
		</div>

		<div
			class="rounded-[10px] border border-border pl-4 py-3 pr-3 space-y-2"
		>
			<!-- Font Family -->
			<div class="flex items-center justify-between">
				<label
					for="settings-font-family"
					class="text-sm text-text font-medium">Font</label
				>
				<Select
					id="settings-font-family"
					value={themeState.editorFontSettings.baseFontFamily}
					onchange={(e) =>
						handleFontFamilyChange(
							(e.target as HTMLSelectElement).value as FontFamily
						)}
					class="w-40"
				>
					{#each fontFamilyOptions as opt (opt.value)}
						<option value={opt.value}>
							{opt.label}
						</option>
					{/each}
				</Select>
			</div>

			<!-- Base Font Size -->
			<div class="flex items-center justify-between">
				<label
					for="settings-font-size"
					class="text-sm text-text font-medium">Size</label
				>
				<div class="relative w-40">
					<Input
						id="settings-font-size"
						type="number"
						min="12"
						max="24"
						value={themeState.editorFontSettings.baseFontSize}
						oninput={(e) =>
							handleNumericChange(
								'baseFontSize',
								(e.target as HTMLInputElement).value,
								12,
								24
							)}
						class="w-full h-9 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
					/>
				</div>
			</div>

			<!-- Bold Weight -->
			<div class="flex items-center justify-between">
				<label
					for="settings-bold-weight"
					class="text-sm text-text font-medium">Bold Weight</label
				>
				<Select
					id="settings-bold-weight"
					value={themeState.editorFontSettings.boldWeight}
					onchange={(e) =>
						themeState.setEditorFontSetting(
							'boldWeight',
							Number((e.target as HTMLSelectElement).value)
						)}
					class="w-40"
				>
					{#each availableWeightOptions as opt (opt.value)}
						<option value={opt.value}>
							{opt.label}
						</option>
					{/each}
				</Select>
			</div>

			<!-- Line Height -->
			<div class="flex items-center justify-between">
				<label
					for="settings-line-height"
					class="text-sm text-text font-medium">Line Height</label
				>
				<div class="relative w-40">
					<Input
						id="settings-line-height"
						type="number"
						min="1.0"
						max="2.5"
						step="0.1"
						value={themeState.editorFontSettings.lineHeight}
						oninput={(e) =>
							handleNumericChange(
								'lineHeight',
								(e.target as HTMLInputElement).value,
								1.0,
								2.5
							)}
						class="w-full h-9 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
					/>
				</div>
			</div>

			<!-- Text Direction -->
			<div class="flex items-center justify-between">
				<label
					for="settings-text-direction"
					class="text-sm text-text font-medium"
				>
					Text Direction
				</label>
				<Select
					id="settings-text-direction"
					value={themeState.textDirection}
					onchange={(e) =>
						themeState.setTextDirection(
							(e.target as HTMLSelectElement)
								.value as TextDirection
						)}
					class="w-40"
				>
					{#each textDirectionOptions as opt (opt.value)}
						<option value={opt.value}>
							{opt.label}
						</option>
					{/each}
				</Select>
			</div>

			<!-- Page Width -->
			<div class="flex items-center justify-between">
				<label
					for="settings-page-width"
					class="text-sm text-text font-medium">Page Width</label
				>
				<Select
					id="settings-page-width"
					value={themeState.editorWidth}
					onchange={(e) =>
						themeState.setEditorWidth(
							(e.target as HTMLSelectElement).value as EditorWidth
						)}
					class="w-40"
				>
					{#each editorWidthOptions as opt (opt.value)}
						<option value={opt.value}>
							{opt.label}
						</option>
					{/each}
				</Select>
			</div>
			{#if themeState.editorWidth === 'custom'}
				<div class="flex items-center justify-between">
					<label
						for="settings-custom-width"
						class="text-sm text-text font-medium"
					>
						Custom Width
					</label>
					<div class="relative w-40 flex items-center gap-2">
						<Input
							id="settings-custom-width"
							type="number"
							min="480"
							max="3840"
							step="10"
							value={themeState.customEditorWidthPx}
							oninput={(e) => {
								const parsed = parseInt(
									(e.target as HTMLInputElement).value,
									10
								)
								if (Number.isFinite(parsed)) {
									themeState.setCustomEditorWidthPx(
										Math.min(Math.max(parsed, 480), 3840)
									)
								}
							}}
							class="w-full h-9 text-center [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
						/>
						<span class="text-sm text-text-muted">px</span>
					</div>
				</div>
			{/if}

			<!-- Interface Zoom -->
			<div class="flex items-center justify-between">
				<span class="text-sm text-text font-medium">
					Interface Zoom
				</span>
				<div class="flex items-center gap-1 w-40">
					<IconButton
						variant="outline"
						size="md"
						onclick={() => {
							themeState.interfaceZoom -= 0.05
						}}
						disabled={themeState.interfaceZoom <= 0.7}
						title="Zoom out"
					>
						<MinusIcon class="w-4 h-4" />
					</IconButton>
					<span
						class="text-sm font-medium tabular-nums flex-1 text-center"
					>
						{Math.round(themeState.interfaceZoom * 100)}%
					</span>
					<IconButton
						variant="outline"
						size="md"
						onclick={() => {
							themeState.interfaceZoom += 0.05
						}}
						disabled={themeState.interfaceZoom >= 1.5}
						title="Zoom in"
					>
						<PlusIcon class="w-4 h-4" />
					</IconButton>
				</div>
			</div>

			<!-- Interface Animations -->
			<div class="flex items-center justify-between">
				<div>
					<span class="text-sm text-text font-medium block">
						Interface Animations
					</span>
					<span class="text-xs text-text-muted">
						Smooth transitions for dialogs, layout, and panels
					</span>
				</div>
				<div class="w-40 flex justify-end">
					<button
						type="button"
						role="switch"
						aria-label="Toggle interface animations"
						aria-checked={themeState.animationsEnabled}
						onclick={() =>
							themeState.setAnimationsEnabled(
								!themeState.animationsEnabled
							)}
						class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
						class:bg-accent={themeState.animationsEnabled}
						class:bg-border={!themeState.animationsEnabled}
					>
						<span
							class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
							class:translate-x-5={themeState.animationsEnabled}
							class:translate-x-0={!themeState.animationsEnabled}
						></span>
					</button>
				</div>
			</div>

			<!-- Liquid Glass Effect (macOS only) -->
			{#if isMac}
				<div class="flex items-center justify-between">
					<div>
						<span class="text-sm text-text font-medium block">
							Liquid Glass
						</span>
						<span class="text-xs text-text-muted">
							Translucent frosted glass with native macOS window vibrancy
						</span>
					</div>
					<div class="w-40 flex justify-end">
						<button
							type="button"
							role="switch"
							aria-label="Toggle liquid glass effect"
							aria-checked={themeState.liquidGlassEnabled}
							onclick={() =>
								themeState.setLiquidGlassEnabled(
									!themeState.liquidGlassEnabled
								)}
							class="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
							class:bg-accent={themeState.liquidGlassEnabled}
							class:bg-border={!themeState.liquidGlassEnabled}
						>
							<span
								class="pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out"
								class:translate-x-5={themeState.liquidGlassEnabled}
								class:translate-x-0={!themeState.liquidGlassEnabled}
							></span>
						</button>
					</div>
				</div>
			{/if}
		</div>

		<!-- Preview -->
		<div class="mt-3 relative">
			<div
				class="absolute top-3 left-4 flex items-center text-sm font-medium text-text-muted/70 gap-1"
			>
				<EyeIcon class="w-4.5 h-4.5 stroke-[1.5]" />
				<span>Preview</span>
			</div>
			<div
				class="border border-border rounded-[10px] bg-bg p-6 pt-20 max-h-160 overflow-hidden rounded-t-lg"
			>
				<div
					class="prose prose-lg dark:prose-invert max-w-xl mx-auto"
					dir={themeState.textDirection}
					style:font-family={themeState.editorFontSettings
						.baseFontFamily === 'system-sans'
						? "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
						: themeState.editorFontSettings.baseFontFamily ===
							  'serif'
							? "ui-serif, Georgia, Cambria, 'Times New Roman', Times, serif"
							: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, 'DejaVu Sans Mono', monospace"}
					style:font-size={`${themeState.editorFontSettings.baseFontSize}px`}
				>
					<h1>Kibble Maximization Protocol</h1>
					<p>
						A comprehensive strategy document for getting your
						humans to increase daily food portions. <strong
							>Time-tested methods</strong
						> that actually work.
					</p>

					<h2>Primary Techniques</h2>
					<ul>
						<li>
							<strong>The Sad Eyes Method</strong> - Sit near food bowl,
							stare longingly
						</li>
						<li>
							<strong>Strategic Meowing</strong> - Begin at 5 AM for
							maximum effectiveness
						</li>
						<li>
							<strong>Bowl Inspection</strong> - Loudly inspect empty
							bowl, then stare at human
						</li>
						<li>
							<strong>The Figure Eight</strong> - Weave between their
							legs while they cook
						</li>
					</ul>

					<h2>Advanced Protocol</h2>
					<p>
						For optimal results, combine multiple techniques. The
						most successful combination involves the Sad Eyes Method
						followed immediately by Strategic Meowing.
					</p>

					<div class="relative my-1">
						<div class="absolute top-2 right-2 z-10">
							<CodeCopyButton text={sampleCode} />
						</div>
						<pre class="pt-10"><code>{sampleCode}</code></pre>
					</div>

					<h2>Common Mistakes to Avoid</h2>
					<ol>
						<li>
							Never accept the first "no" - persistence is key
						</li>
						<li>
							Maintain consistency in meal times (your schedule,
							not theirs)
						</li>
						<li>
							Don't forget to knock things off counters
							periodically
						</li>
					</ol>

					<p>
						Remember: <em>humans are trainable</em>. With dedication
						and the right approach, you can increase portions by up
						to 40% within the first month.
					</p>
				</div>
			</div>
			<!-- Fade overlay -->
			<div
				class="absolute bottom-0 left-0 right-0 h-40 bg-linear-to-t from-bg to-transparent pointer-events-none"
			></div>
		</div>
	</section>
</div>
