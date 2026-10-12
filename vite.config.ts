import { defineConfig, type Plugin } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compileTokensToCss } from './src/tokens/compiler'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function designTokensPlugin(): Plugin {
	const outputPath = path.resolve(
		__dirname,
		'src/styles/tokens.generated.css'
	)

	function regenerate() {
		try {
			const css = compileTokensToCss()
			const existing = fs.existsSync(outputPath)
				? fs.readFileSync(outputPath, 'utf8')
				: ''
			if (existing !== css) {
				fs.writeFileSync(outputPath, css, 'utf8')
			}
		} catch (err) {
			console.error(
				'[designTokensPlugin] Failed to generate tokens CSS:',
				err
			)
		}
	}

	return {
		name: 'vite-plugin-design-tokens',
		buildStart() {
			regenerate()
		},
		handleHotUpdate({ file, server }) {
			if (file.includes('src/tokens/')) {
				regenerate()
				server.ws.send({ type: 'full-reload' })
			}
		}
	}
}

// @ts-expect-error process is a nodejs global
const host = process.env.TAURI_DEV_HOST

// https://vite.dev/config/
export default defineConfig(async () => ({
	plugins: [designTokensPlugin(), svelte(), tailwindcss()],

	// Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
	//
	// 1. prevent Vite from obscuring rust errors
	clearScreen: false,
	// 2. tauri expects a fixed port, fail if that port is not available
	server: {
		port: 1420,
		strictPort: true,
		host: host || false,
		hmr: host
			? {
					protocol: 'ws',
					host,
					port: 1421
				}
			: undefined,
		watch: {
			// 3. tell Vite to ignore watching `src-tauri`
			ignored: ['**/src-tauri/**']
		}
	},

	// Production build optimizations
	build: {
		// Target compatible with Tauri WebViews across platforms:
		// - macOS: WebKit (Safari 13+)
		// - Windows: WebView2 (Chromium-based)
		// - Linux: WebKitGTK
		target: ['es2021', 'chrome105', 'safari14'],
		// Use esbuild for fast minification
		minify: 'esbuild',
		// Optimize chunk splitting
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules')) {
						if (id.includes('beautiful-mermaid')) {
							return 'vendor-mermaid'
						}
						if (id.includes('katex')) {
							return 'vendor-katex'
						}
						if (
							id.includes('highlight.js') ||
							id.includes('lowlight')
						) {
							return 'vendor-highlight'
						}
						if (
							id.includes('@tiptap') ||
							id.includes('prosemirror')
						) {
							return 'vendor-tiptap'
						}
						if (id.includes('bits-ui')) {
							return 'vendor-bits-ui'
						}
						if (id.includes('@tauri-apps')) {
							return 'vendor-tauri'
						}
						if (
							id.includes('/node_modules/svelte/') ||
							id.includes('.pnpm/svelte@')
						) {
							return 'vendor-svelte'
						}
					}
				}
			}
		},
		// Enable source maps for debugging (optional, can disable for smaller builds)
		sourcemap: false,
		// Increase chunk size warning limit (TipTap is large)
		chunkSizeWarningLimit: 1000
	},

	// Optimize dependencies
	optimizeDeps: {
		exclude: ['bits-ui', 'svelte-sonner'],
		// Pre-bundle these dependencies for faster dev startup
		include: [
			'@tiptap/core',
			'@tiptap/starter-kit',
			'@tiptap/markdown',
			'lowlight'
		]
	}
}))
