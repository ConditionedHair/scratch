import { shouldReduceMotion } from './motion'
import type {
	AppView,
	WorkspaceDirection,
	WorkspaceMotionParams
} from '../types/workspace'

const workspaceOrder = ['notes', 'calendar', 'mail'] as const

/** Settings is outside the spatial workspace sequence. */
export function workspaceDirection(
	from: AppView,
	to: AppView
): WorkspaceDirection {
	if (from === 'settings' || to === 'settings') return 0
	return Math.sign(
		workspaceOrder.indexOf(to) - workspaceOrder.indexOf(from)
	) as WorkspaceDirection
}

/**
 * Animate only the newly active workspace, never queueing or retaining old views.
 * Notes can stay mounted while inactive to preserve the editor and its selection.
 */
export function workspaceMotion(
	node: HTMLElement,
	initial: WorkspaceMotionParams
) {
	let params = initial
	let animation: Animation | undefined
	const media = window.matchMedia('(prefers-reduced-motion: reduce)')

	function cancel() {
		animation?.cancel()
		animation = undefined
	}

	function enter() {
		cancel()
		if (
			!params.active ||
			!params.direction ||
			!params.enabled ||
			shouldReduceMotion()
		)
			return
		animation = node.animate(
			[
				{
					transform: `translateX(${params.direction * 24}px)`,
					opacity: 0.72
				},
				{ transform: 'translateX(0)', opacity: 1 }
			],
			{ duration: 220, easing: 'cubic-bezier(0.16, 1, 0.3, 1)' }
		)
	}

	function handleReducedMotion() {
		if (media.matches) cancel()
	}

	enter()
	media.addEventListener('change', handleReducedMotion)

	return {
		update(next: WorkspaceMotionParams) {
			const entering = next.active && !params.active
			params = next
			if (!params.active || !params.enabled || shouldReduceMotion())
				cancel()
			else if (entering) enter()
		},
		destroy() {
			cancel()
			media.removeEventListener('change', handleReducedMotion)
		}
	}
}
