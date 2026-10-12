<script lang="ts">
	import { calendarState } from '../../context/calendar.svelte'
	import type { CalendarViewMode } from '../../types/calendar'
	import {
		CalendarIcon,
		ColumnsIcon,
		ListIcon,
		PlusIcon,
		RefreshCwIcon,
		SpinnerIcon,
		CheckIcon
	} from '../icons'

	interface Props {
		onOpenCreateModal: () => void
	}

	let { onOpenCreateModal }: Props = $props()

	const VIEW_MODES: Array<{
		id: CalendarViewMode
		label: string
		icon: typeof CalendarIcon
	}> = [
		{ id: 'month', label: 'Month', icon: CalendarIcon },
		{ id: 'week', label: 'Week', icon: ColumnsIcon },
		{ id: 'day', label: 'Day', icon: ListIcon }
	]
</script>

<aside
	class="w-full h-full flex flex-col select-none bg-bg-secondary text-text transition-colors border-r border-border"
>
	<!-- Calendar Header Strip with Signal Accent Plus Button -->
	<div
		class="h-11 px-3.5 border-b border-border flex items-center justify-between shrink-0"
	>
		<div class="flex items-center gap-2">
			<span
				class="text-[11px] font-bold tracking-wider uppercase text-text-muted"
			>
				CALENDAR
			</span>
			{#if calendarState.isSyncing}
				<SpinnerIcon class="w-3 h-3 animate-spin text-text-muted/60" />
			{/if}
		</div>

		<!-- Signal Yellow Circular New Event Button -->
		<button
			type="button"
			onclick={onOpenCreateModal}
			class="w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer hover:brightness-105 active:scale-95 bg-accent text-slate-950 font-bold shadow-xs"
			title="New Event"
		>
			<PlusIcon class="w-3.5 h-3.5 stroke-[2.5]" />
		</button>
	</div>

	<!-- Navigation Views & Calendars List -->
	<div class="flex-1 overflow-y-auto p-2 space-y-4">
		<!-- Views Section -->
		<div>
			<div
				class="px-2.5 pb-1 text-[10px] font-bold uppercase tracking-wider text-text-muted/70"
			>
				VIEWS
			</div>
			<div class="space-y-0.5">
				{#each VIEW_MODES as mode (mode.id)}
					{@const Icon = mode.icon}
					{@const isActive = calendarState.viewMode === mode.id}
					<button
						type="button"
						onclick={() => calendarState.setViewMode(mode.id)}
						class={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
							isActive
								? 'bg-bg-emphasis text-text font-semibold shadow-2xs'
								: 'text-text-muted hover:text-text hover:bg-bg-muted/70 font-medium'
						}`}
					>
						<div class="flex items-center gap-2">
							<Icon class="w-4 h-4 opacity-75 stroke-[1.8]" />
							<span>{mode.label}</span>
						</div>
					</button>
				{/each}
			</div>
		</div>

		<!-- Calendars List Section -->
		{#if calendarState.calendars.length > 0}
			<div>
				<div
					class="text-[10px] font-bold uppercase tracking-wider text-text-muted px-2.5 mb-1.5 flex items-center justify-between"
				>
					<span>CALENDARS</span>
					<span class="font-mono text-[9px] text-text-muted/60"
						>{calendarState.calendars.length}</span
					>
				</div>
				<div class="space-y-0.5">
					{#each calendarState.calendars as cal (cal.id)}
						<button
							type="button"
							onclick={() =>
								calendarState.toggleVisibility(
									cal.id,
									!cal.selected
								)}
							class={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left cursor-pointer ${
								cal.selected
									? 'text-text font-medium hover:bg-bg-muted/70'
									: 'text-text-muted/50 hover:text-text hover:bg-bg-muted/40'
							}`}
						>
							<div class="flex items-center gap-2 min-w-0">
								<span
									class="w-2 h-2 rounded-full shrink-0 shadow-2xs"
									style:background-color={cal.bgColor ||
										'#eab308'}
								></span>
								<span class="truncate">{cal.summary}</span>
							</div>
							{#if cal.selected}
								<CheckIcon
									class="w-3.5 h-3.5 stroke-[2.5] text-accent shrink-0 ml-1.5"
								/>
							{/if}
						</button>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Bottom Account & Status Strip -->
	<div
		class="p-2 border-t border-border flex items-center justify-between text-xs text-text-muted shrink-0"
	>
		<div class="flex items-center gap-1.5 min-w-0 flex-1 px-1">
			<span
				class={`w-1.5 h-1.5 rounded-full shrink-0 ${calendarState.connected ? 'bg-emerald-500' : 'bg-zinc-500'}`}
			></span>
			<span
				class="truncate text-[11px] font-mono text-text-muted/80"
				title={calendarState.userEmail ||
					(calendarState.connected ? 'Connected' : 'Local')}
			>
				{calendarState.userEmail ||
					(calendarState.connected
						? 'Google Calendar'
						: 'Local Calendar')}
			</span>
		</div>

		<button
			type="button"
			onclick={() => calendarState.refresh()}
			disabled={calendarState.isSyncing}
			class="p-1 rounded-md hover:bg-bg-muted text-text-muted hover:text-text transition-colors cursor-pointer"
			title="Sync Calendar Now"
		>
			<RefreshCwIcon
				class={`w-3.5 h-3.5 stroke-[1.8] ${calendarState.isSyncing ? 'animate-spin text-accent' : ''}`}
			/>
		</button>
	</div>
</aside>
