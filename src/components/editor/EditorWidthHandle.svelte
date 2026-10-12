<script lang="ts">
	import { themeState } from '../../context/theme.svelte'
	import { cn } from '../../lib/utils'
	import type { EditorWidth } from '../../types/note'

	// Preset widths in px (rem * 16) for snap detection
	const PRESET_PX: { width: EditorWidth; px: number }[] = [
		{ width: 'narrow', px: 576 },
		{ width: 'normal', px: 768 },
		{ width: 'wide', px: 1024 }
	]

	const MIN_WIDTH = 480
	const SNAP_THRESHOLD = 20

	interface Props {
		containerEl: HTMLDivElement | null
	}

	let { containerEl }: Props = $props()

	let isDragging = $state(false)
	let dragWidth = $state(0)
	let snappedPreset = $state<EditorWidth | null>(null)
	let handleOffset = $state(0)

	let dragState: {
		startX: number
		initialWidth: number
		side: 'left' | 'right'
		containerWidth: number
	} | null = null

	function updateHandleOffset() {
		if (!containerEl) return
		const containerWidth = containerEl.clientWidth
		const proseMirror =
			containerEl.querySelector<HTMLElement>('.ProseMirror')
		if (proseMirror) {
			const maxWidth = getComputedStyle(proseMirror).maxWidth
			if (maxWidth && maxWidth !== 'none') {
				const editorPx =
					maxWidth === '100%' ? containerWidth : parseFloat(maxWidth)
				const clampedEditor = Math.min(editorPx, containerWidth)
				handleOffset = (containerWidth - clampedEditor) / 2
				return
			}
		}
		handleOffset = 0
	}

	$effect(() => {
		// Depend on width states to re-calculate
		void themeState.editorWidth
		void themeState.customEditorWidthPx
		updateHandleOffset()

		if (!containerEl) return
		const observer = new ResizeObserver(() => updateHandleOffset())
		observer.observe(containerEl)
		return () => observer.disconnect()
	})

	function getCurrentEditorWidth(): number {
		if (!containerEl) return 768
		const proseMirror =
			containerEl.querySelector<HTMLElement>('.ProseMirror')
		if (proseMirror) {
			const maxWidth = getComputedStyle(proseMirror).maxWidth
			if (maxWidth && maxWidth !== 'none' && maxWidth !== '100%') {
				return parseFloat(maxWidth)
			}
		}
		if (themeState.editorWidth === 'custom')
			return themeState.customEditorWidthPx
		if (themeState.editorWidth === 'full') return containerEl.clientWidth
		const preset = PRESET_PX.find((p) => p.width === themeState.editorWidth)
		return preset?.px ?? 768
	}

	function handlePointerDown(side: 'left' | 'right', e: PointerEvent) {
		e.preventDefault()
		e.stopPropagation()
		;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)

		const containerWidth = containerEl?.clientWidth ?? 1200
		const initialWidth = Math.min(getCurrentEditorWidth(), containerWidth)

		dragState = {
			startX: e.clientX,
			initialWidth,
			side,
			containerWidth
		}
		isDragging = true
		dragWidth = initialWidth
		snappedPreset = null
	}

	function handlePointerMove(e: PointerEvent) {
		if (!dragState) return
		const { startX, initialWidth, side, containerWidth } = dragState

		const delta = e.clientX - startX
		const newWidth =
			side === 'right'
				? initialWidth + delta * 2
				: initialWidth - delta * 2
		const clamped = Math.max(MIN_WIDTH, Math.min(newWidth, containerWidth))

		let snapped: EditorWidth | null = null
		let finalWidth = clamped
		for (const preset of PRESET_PX) {
			if (
				Math.abs(clamped - preset.px) < SNAP_THRESHOLD &&
				preset.px <= containerWidth
			) {
				snapped = preset.width
				finalWidth = preset.px
				break
			}
		}

		snappedPreset = snapped
		dragWidth = finalWidth
		themeState.setEditorMaxWidthLive(`${finalWidth}px`)
		handleOffset = (containerWidth - finalWidth) / 2
	}

	function handlePointerUp(e: PointerEvent) {
		if (!dragState) return
		;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)

		if (snappedPreset) {
			themeState.setEditorWidth(snappedPreset)
		} else {
			themeState.setCustomEditorWidthPx(Math.round(dragWidth))
		}

		dragState = null
		isDragging = false
	}

	function handlePointerCancel() {
		if (!dragState) return
		dragState = null
		isDragging = false
		themeState.setEditorWidth(themeState.editorWidth)
	}

	function handleDoubleClick() {
		themeState.setEditorWidth('normal')
	}
</script>

{#if !((themeState.editorWidth === 'full' || handleOffset === 0) && !isDragging)}
	<div class="absolute inset-0 pointer-events-none z-10">
		{#if isDragging}
			<div class="absolute top-3 left-1/2 -translate-x-1/2 z-50">
				<div
					class="bg-text text-text-inverse text-xs font-medium px-2.5 py-1 rounded-md shadow-lg whitespace-nowrap"
				>
					{snappedPreset
						? `${snappedPreset.charAt(0).toUpperCase() + snappedPreset.slice(1)} (${Math.round(dragWidth)}px)`
						: `${Math.round(dragWidth)}px`}
				</div>
			</div>
		{/if}

		<!-- Left handle -->
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize editor width (left)"
			class={cn(
				'absolute top-0 h-full w-3 cursor-col-resize pointer-events-auto group',
				isDragging && 'z-20'
			)}
			style:left="{handleOffset - 6}px"
			onpointerdown={(e) => handlePointerDown('left', e)}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerCancel}
			ondblclick={handleDoubleClick}
		>
			<div
				class={cn(
					'absolute left-1/2 -translate-x-1/2 top-0 h-full w-0.75 rounded-full bg-border transition-opacity duration-150',
					isDragging
						? 'opacity-100'
						: 'opacity-0 group-hover:opacity-100'
				)}
			></div>
		</div>

		<!-- Right handle -->
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize editor width (right)"
			class={cn(
				'absolute top-0 h-full w-3 cursor-col-resize pointer-events-auto group',
				isDragging && 'z-20'
			)}
			style:right="{handleOffset - 6}px"
			onpointerdown={(e) => handlePointerDown('right', e)}
			onpointermove={handlePointerMove}
			onpointerup={handlePointerUp}
			onpointercancel={handlePointerCancel}
			ondblclick={handleDoubleClick}
		>
			<div
				class={cn(
					'absolute left-1/2 -translate-x-1/2 top-0 h-full w-0.75 rounded-full bg-border transition-opacity duration-150',
					isDragging
						? 'opacity-100'
						: 'opacity-0 group-hover:opacity-100'
				)}
			></div>
		</div>
	</div>
{/if}
