import { mount } from 'svelte'
import 'katex/dist/katex.min.css'
import App from './App.svelte'
import './App.css'

const target = document.getElementById('app') || document.getElementById('root')
if (!target) {
	throw new Error('Failed to find target root element')
}

import { notesState } from './context/notes.svelte'

if (import.meta.env.DEV && typeof window !== 'undefined') {
	;(window as any).notesState = notesState
}

const app = mount(App, { target })

export default app
