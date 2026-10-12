import { mount, unmount } from 'svelte'
import type { NodeViewRenderer, NodeViewRendererProps } from '@tiptap/core'
import type { Node as PMNode } from '@tiptap/pm/model'
import CodeBlockView from './CodeBlockView.svelte'

export class CodeBlockNodeView {
	dom: HTMLElement
	contentDOM: HTMLElement
	component: any
	controller: {
		node: PMNode
		updateAttributes: (attrs: Record<string, any>) => void
		onPreviewToggle: (showingPreview: boolean) => void
	}

	constructor({ node, editor, getPos }: NodeViewRendererProps) {
		this.dom = document.createElement('div')
		this.dom.className = 'code-block-node-view relative'

		const pre = document.createElement('pre')
		this.contentDOM = document.createElement('code')
		pre.appendChild(this.contentDOM)

		this.controller = $state({
			node,
			updateAttributes: (attrs: Record<string, any>) => {
				if (typeof getPos === 'function') {
					const pos = getPos()
					if (pos !== undefined) {
						editor.view.dispatch(
							editor.view.state.tr.setNodeMarkup(pos, undefined, {
								...node.attrs,
								...attrs
							})
						)
					}
				}
			},
			onPreviewToggle: (showingPreview: boolean) => {
				if (showingPreview) {
					pre.style.position = 'absolute'
					pre.style.overflow = 'hidden'
					pre.style.height = '0'
					pre.style.opacity = '0'
					pre.style.pointerEvents = 'none'
				} else {
					pre.style.position = ''
					pre.style.overflow = ''
					pre.style.height = ''
					pre.style.opacity = ''
					pre.style.pointerEvents = ''
				}
			}
		})

		this.component = mount(CodeBlockView, {
			target: this.dom,
			props: {
				controller: this.controller
			}
		})

		this.dom.appendChild(pre)
	}

	update(node: PMNode): boolean {
		if (node.type.name !== 'codeBlock') return false
		this.controller.node = node
		return true
	}

	destroy() {
		if (this.component) {
			unmount(this.component)
			this.component = null
		}
	}
}

export function SvelteCodeBlockNodeViewRenderer(): NodeViewRenderer {
	return (props: NodeViewRendererProps) => new CodeBlockNodeView(props)
}
