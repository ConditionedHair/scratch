import type { TransitionConfig } from 'svelte/transition'
import { themeState } from '../context/theme.svelte'

/**
 * Checks whether animations should be skipped or reduced,
 * respecting either the in-app setting or the system prefers-reduced-motion query.
 */
export function shouldReduceMotion(): boolean {
	if (typeof window === 'undefined') return true
	if (!themeState.animationsEnabled) return true
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Fast cubic-bezier easing evaluator using Newton-Raphson approximation.
 */
export function cubicBezier(
	x1: number,
	y1: number,
	x2: number,
	y2: number
): (t: number) => number {
	const sampleCurveX = (t: number) =>
		((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t * t + 3 * x1 * t
	const sampleCurveY = (t: number) =>
		((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t * t + 3 * y1 * t
	const sampleCurveDerivativeX = (t: number) =>
		(3 * (1 - 3 * x2 + 3 * x1) * t + 2 * (3 * x2 - 6 * x1)) * t + 3 * x1

	return (x: number) => {
		if (x <= 0) return 0
		if (x >= 1) return 1
		let t = x
		for (let i = 0; i < 8; i++) {
			const currentX = sampleCurveX(t) - x
			if (Math.abs(currentX) < 1e-5) return sampleCurveY(t)
			const dX = sampleCurveDerivativeX(t)
			if (Math.abs(dX) < 1e-6) break
			t -= currentX / dX
		}
		return sampleCurveY(Math.max(0, Math.min(1, t)))
	}
}

/** Braun mechanical easing curves */
export const easeBraunSnappy = cubicBezier(0.16, 1, 0.3, 1)
export const easeBraunExit = cubicBezier(0.4, 0, 0.2, 1)

export interface ModalMotionParams {
	duration?: number
	y?: number
	startScale?: number
}

/**
 * Snappy Braun entrance for modals (Command Palette, AI Modal, Shortcuts).
 * Scale 0.98 -> 1.0, 4px downward settle, opacity 0 -> 1 over 150ms.
 */
export function modalIn(
	_node: Element,
	params: ModalMotionParams = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	const duration = params.duration ?? 150
	const y = params.y ?? -4
	const startScale = params.startScale ?? 0.98
	const scaleDiff = 1 - startScale

	return {
		duration,
		easing: easeBraunSnappy,
		css: (t) => {
			const currentScale = startScale + scaleDiff * t
			const currentY = (1 - t) * y
			return `
        opacity: ${t};
        transform: scale(${currentScale}) translateY(${currentY}px);
      `
		}
	}
}

/**
 * Exit animation for modals.
 * Snappy reversal: scale 1.0 -> 0.98, opacity 1 -> 0 over 100ms.
 */
export function modalOut(
	_node: Element,
	params: { duration?: number; endScale?: number } = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	const duration = params.duration ?? 100
	const endScale = params.endScale ?? 0.98
	const scaleDiff = 1 - endScale

	return {
		duration,
		easing: easeBraunExit,
		css: (t) => {
			const currentScale = endScale + scaleDiff * t
			return `
        opacity: ${t};
        transform: scale(${currentScale});
      `
		}
	}
}

/**
 * Backdrop entrance fade (opacity 0 -> 1 over 140ms).
 */
export function backdropIn(
	_node: Element,
	params: { duration?: number } = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	return {
		duration: params.duration ?? 140,
		easing: easeBraunSnappy,
		css: (t) => `opacity: ${t};`
	}
}

/**
 * Backdrop exit fade (opacity 1 -> 0 over 100ms).
 */
export function backdropOut(
	_node: Element,
	params: { duration?: number } = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	return {
		duration: params.duration ?? 100,
		easing: easeBraunExit,
		css: (t) => `opacity: ${t};`
	}
}

/**
 * View cross-fade entrance with subtle 4px elevation settle (140ms).
 */
export function viewFadeIn(
	_node: Element,
	params: { duration?: number; y?: number } = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	const duration = params.duration ?? 140
	const y = params.y ?? 4

	return {
		duration,
		easing: easeBraunSnappy,
		css: (t) => `
      opacity: ${t};
      transform: translateY(${(1 - t) * y}px);
    `
	}
}

/**
 * View cross-fade exit with subtle 4px drift (100ms).
 */
export function viewFadeOut(
	_node: Element,
	params: { duration?: number; y?: number } = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	const duration = params.duration ?? 100
	const y = params.y ?? -4

	return {
		duration,
		easing: easeBraunExit,
		css: (t) => `
      opacity: ${t};
      transform: translateY(${(1 - t) * y}px);
    `
	}
}

/**
 * Entrance animation for floating format bar / toolbars.
 * Slides up 8px with opacity fade over 140ms.
 */
export function floatingBarIn(
	_node: Element,
	params: { duration?: number; y?: number } = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	const duration = params.duration ?? 140
	const y = params.y ?? 8

	return {
		duration,
		easing: easeBraunSnappy,
		css: (t) => `
      opacity: ${t};
      transform: translateY(${(1 - t) * y}px);
    `
	}
}

/**
 * Exit animation for floating format bar / toolbars.
 * Slides downward 6px with opacity fade over 100ms.
 */
export function floatingBarOut(
	_node: Element,
	params: { duration?: number; y?: number } = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	const duration = params.duration ?? 100
	const y = params.y ?? 6

	return {
		duration,
		easing: easeBraunExit,
		css: (t) => `
      opacity: ${t};
      transform: translateY(${(1 - t) * y}px);
    `
	}
}

/**
 * Subtle 100ms metadata settle (e.g., tag badges and titles on note selection).
 */
export function metaSettle(
	_node: Element,
	params: { duration?: number } = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	const duration = params.duration ?? 100

	return {
		duration,
		easing: easeBraunSnappy,
		css: (t) => `opacity: ${t};`
	}
}
