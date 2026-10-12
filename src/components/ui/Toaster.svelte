<script lang="ts">
	import { Toaster as Sonner } from 'svelte-sonner'
	import { themeState } from '../../context/theme.svelte'
</script>

<Sonner
	theme={themeState.resolvedTheme}
	position="bottom-right"
	offset={20}
	toastOptions={{
		classes: {
			toast: 'group toast !bg-bg !border-border !text-text shadow-lg rounded-lg w-full max-w-72',
			description: '!text-text-muted',
			actionButton: '!bg-accent !text-text-inverse',
			cancelButton: '!bg-bg-muted !text-text',
			error: '!bg-bg !text-text !border-border',
			success: '!bg-bg !text-text !border-border',
			warning: '!bg-bg !text-text !border-border',
			info: '!bg-bg !text-text !border-border'
		}
	}}
/>
