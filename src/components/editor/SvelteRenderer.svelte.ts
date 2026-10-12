import { mount, unmount } from 'svelte'

export interface SvelteRendererOptions<P = any> {
	props?: P
	editor?: any
}

export class SvelteRenderer<
	Ref = any,
	Props extends Record<string, any> = any
> {
	element: HTMLElement
	instance: any
	controller: any

	constructor(Component: any, options: SvelteRendererOptions<Props> = {}) {
		this.element = document.createElement('div')
		this.controller = $state({ ...options.props })

		this.instance = mount(Component, {
			target: this.element,
			props: {
				controller: this.controller,
				...options.props
			}
		})
	}

	get ref(): Ref {
		return this.instance
	}

	updateProps(props: Partial<Props>) {
		if (this.controller) {
			Object.assign(this.controller, props)
		}
	}

	destroy() {
		if (this.instance) {
			unmount(this.instance)
			this.instance = null
		}
		this.element.remove()
	}
}
