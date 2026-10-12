import { cubicOut, cubicIn } from 'svelte/easing'
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

export interface ModalMotionParams {
	duration?: number
	y?: number
	startScale?: number
}

/**
 * Entrance animation for modals (Command Palette, AI Modal, Shortcuts).
 * Scale 0.97 -> 1.0, 12px downward settle, opacity 0 -> 1 over 250ms.
 */
export function modalIn(
	_node: Element,
	params: ModalMotionParams = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	const duration = params.duration ?? 250
	const y = params.y ?? -12
	const startScale = params.startScale ?? 0.97
	const scaleDiff = 1 - startScale

	return {
		duration,
		easing: cubicOut,
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
 * Reverses gracefully: scale 1.0 -> 0.97, opacity 1 -> 0 over 180ms.
 */
export function modalOut(
	_node: Element,
	params: { duration?: number; endScale?: number } = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	const duration = params.duration ?? 180
	const endScale = params.endScale ?? 0.97
	const scaleDiff = 1 - endScale

	return {
		duration,
		easing: cubicIn,
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
 * Backdrop entrance fade (opacity 0 -> 1 over 250ms).
 */
export function backdropIn(
	_node: Element,
	params: { duration?: number } = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	return {
		duration: params.duration ?? 250,
		easing: cubicOut,
		css: (t) => `opacity: ${t};`
	}
}

/**
 * Backdrop exit fade (opacity 1 -> 0 over 180ms).
 */
export function backdropOut(
	_node: Element,
	params: { duration?: number } = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	return {
		duration: params.duration ?? 180,
		easing: cubicIn,
		css: (t) => `opacity: ${t};`
	}
}

/**
 * View cross-fade entrance with subtle 8-12px vertical lift (250ms).
 */
export function viewFadeIn(
	_node: Element,
	params: { duration?: number; y?: number } = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	const duration = params.duration ?? 250
	const y = params.y ?? 10

	return {
		duration,
		easing: cubicOut,
		css: (t) => `
      opacity: ${t};
      transform: translateY(${(1 - t) * y}px);
    `
	}
}

/**
 * View cross-fade exit with subtle vertical drift (180ms).
 */
export function viewFadeOut(
	_node: Element,
	params: { duration?: number; y?: number } = {}
): TransitionConfig {
	if (shouldReduceMotion()) {
		return { duration: 0 }
	}

	const duration = params.duration ?? 180
	const y = params.y ?? -8

	return {
		duration,
		easing: cubicIn,
		css: (t) => `
      opacity: ${t};
      transform: translateY(${(1 - t) * y}px);
    `
	}
}
