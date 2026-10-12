<script lang="ts">
	import {
		AlertDialog,
		AlertDialogAction,
		AlertDialogCancel,
		AlertDialogContent,
		AlertDialogDescription,
		AlertDialogFooter,
		AlertDialogHeader,
		AlertDialogTitle,
		Input
	} from '../ui'

	interface Props {
		open: boolean
		onOpenChange?: (open: boolean) => void
		onConfirm: (name: string) => void
		title?: string
		description?: string
		confirmLabel?: string
		defaultValue?: string
	}

	let {
		open = $bindable(),
		onOpenChange,
		onConfirm,
		title = 'Create New Folder',
		description = 'Enter a name for your new folder',
		confirmLabel = 'Create',
		defaultValue = ''
	}: Props = $props()

	let name = $state('')
	let inputEl: HTMLInputElement | null = $state(null)

	$effect(() => {
		if (open) {
			name = defaultValue
			setTimeout(() => inputEl?.focus(), 50)
		}
	})

	function handleConfirm() {
		const trimmed = name.trim()
		if (trimmed) {
			onConfirm(trimmed)
		}
	}

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault()
			handleConfirm()
		}
	}
</script>

<AlertDialog
	bind:open
	onOpenChange={(val) => {
		onOpenChange?.(val)
	}}
>
	<AlertDialogContent>
		<AlertDialogHeader>
			<AlertDialogTitle>{title}</AlertDialogTitle>
			<AlertDialogDescription class="-mt-1">
				{description}
			</AlertDialogDescription>
		</AlertDialogHeader>
		<Input
			bind:ref={inputEl}
			type="text"
			bind:value={name}
			onkeydown={handleKeyDown}
			placeholder="Folder name"
			class="mt-1"
		/>
		<AlertDialogFooter>
			<AlertDialogCancel>Cancel</AlertDialogCancel>
			<AlertDialogAction onclick={handleConfirm} disabled={!name.trim()}>
				{confirmLabel}
			</AlertDialogAction>
		</AlertDialogFooter>
	</AlertDialogContent>
</AlertDialog>
