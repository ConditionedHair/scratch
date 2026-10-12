<script lang="ts">
	import { onMount } from 'svelte'
	import {
		ArrowLeftIcon,
		FolderIcon,
		SwatchIcon,
		KeyboardIcon,
		InfoIcon,
		IntegrationsIcon
	} from '../icons'
	import { Button, IconButton } from '../ui'
	import GeneralSettingsSection from './GeneralSettingsSection.svelte'
	import EditorSettingsSection from './EditorSettingsSection.svelte'
	import ShortcutsSettingsSection from './ShortcutsSettingsSection.svelte'
	import AboutSettingsSection from './AboutSettingsSection.svelte'
	import ToolsSettingsSection from './ToolsSettingsSection.svelte'
	import { mod, isMac, isWindows } from '../../lib/platform'
	import type { Component } from 'svelte'

	interface Props {
		onBack: () => void
	}

	let { onBack }: Props = $props()

	type SettingsTab = 'general' | 'tools' | 'editor' | 'shortcuts' | 'about'

	const tabs: {
		id: SettingsTab
		label: string
		icon: Component<{ class?: string }>
		shortcut: string
	}[] = [
		{ id: 'general', label: 'Folder', icon: FolderIcon, shortcut: '1' },
		{
			id: 'tools',
			label: 'Integrations',
			icon: IntegrationsIcon,
			shortcut: '2'
		},
		{ id: 'editor', label: 'Appearance', icon: SwatchIcon, shortcut: '3' },
		{
			id: 'shortcuts',
			label: 'Shortcuts',
			icon: KeyboardIcon,
			shortcut: '4'
		},
		{ id: 'about', label: 'About', icon: InfoIcon, shortcut: '5' }
	]

	let activeTab = $state<SettingsTab>('general')
	let scrollContainer: HTMLDivElement | null = $state(null)

	$effect(() => {
		void activeTab
		if (scrollContainer) {
			scrollContainer.scrollTop = 0
		}
	})

	onMount(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if (e.metaKey || e.ctrlKey) {
				if (e.key === '1') {
					e.preventDefault()
					activeTab = 'general'
				} else if (e.key === '2') {
					e.preventDefault()
					activeTab = 'tools'
				} else if (e.key === '3') {
					e.preventDefault()
					activeTab = 'editor'
				} else if (e.key === '4') {
					e.preventDefault()
					activeTab = 'shortcuts'
				} else if (e.key === '5') {
					e.preventDefault()
					activeTab = 'about'
				}
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	})
</script>

<div class="h-full min-h-0 flex bg-bg w-full">
	<!-- Sidebar - matches main Notes sidebar -->
	<div
		class="w-64 h-full bg-bg-secondary border-r border-border flex flex-col select-none"
	>
		<!-- Drag region -->
		{#if !isWindows}
			<div class="h-11 shrink-0" data-tauri-drag-region></div>
		{/if}

		<!-- Header with back button and Settings title -->
		<div
			class={`flex items-center justify-between px-3 pb-2 border-b border-border shrink-0${isWindows ? ' pt-2' : ''}`}
		>
			<div class="flex items-center gap-1">
				<IconButton
					onclick={onBack}
					title={`Back (${mod}${isMac ? '' : '+'},)`}
				>
					<ArrowLeftIcon class="w-4.5 h-4.5 stroke-[1.5]" />
				</IconButton>
				<div class="font-medium text-base">Settings</div>
			</div>
		</div>

		<!-- Navigation tabs -->
		<nav class="flex-1 p-2 flex flex-col gap-1">
			{#each tabs as tab (tab.id)}
				{@const Icon = tab.icon}
				{@const isActive = activeTab === tab.id}
				<Button
					onclick={() => {
						activeTab = tab.id
					}}
					variant={isActive ? 'secondary' : 'ghost'}
					size="sm"
					class="justify-between gap-2.5 h-10 pr-3.5"
				>
					<div class="flex items-center gap-2.5">
						<Icon class="w-4.5 h-4.5 stroke-[1.5]" />
						<span>{tab.label}</span>
					</div>
					<div class="flex items-center gap-2">
						{#if isActive}
							<span
								class="w-1.5 h-1.5 rounded-full bg-accent shadow-xs"
							></span>
						{/if}
						<div class="text-xs text-text-muted font-mono">
							<span class="mr-0.5">{mod}</span>
							{tab.shortcut}
						</div>
					</div>
				</Button>
			{/each}
		</nav>
	</div>

	<!-- Main content area -->
	<div class="flex-1 min-h-0 flex flex-col bg-bg overflow-hidden">
		<!-- Drag region -->
		{#if !isWindows}
			<div class="h-11 shrink-0" data-tauri-drag-region></div>
		{/if}

		<!-- Content - centered with max width -->
		<div
			bind:this={scrollContainer}
			class="flex-1 min-h-0 overflow-y-auto scrollbar-gutter-stable"
		>
			<div
				class={`w-full max-w-3xl mx-auto px-6 pb-6${isWindows ? ' pt-2' : ''}`}
			>
				{#if activeTab === 'general'}
					<GeneralSettingsSection />
				{:else if activeTab === 'tools'}
					<ToolsSettingsSection />
				{:else if activeTab === 'editor'}
					<EditorSettingsSection />
				{:else if activeTab === 'shortcuts'}
					<ShortcutsSettingsSection />
				{:else if activeTab === 'about'}
					<AboutSettingsSection />
				{/if}
			</div>
		</div>
	</div>
</div>
