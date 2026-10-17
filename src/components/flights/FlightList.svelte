<script lang="ts">
	import { flightsState } from '../../context/flights.svelte'
	import { PlusIcon, PlaneIcon } from '../icons'

	interface Props {
		onOpenAddModal: () => void
		onOpenLogbook: () => void
	}

	let { onOpenAddModal, onOpenLogbook }: Props = $props()

	type FilterTab = 'all' | 'active' | 'upcoming' | 'past'
	let activeTab = $state<FilterTab>('all')
	let searchQuery = $state('')

	let filteredFlights = $derived.by(() => {
		let list = flightsState.flights
		if (activeTab === 'active') {
			list = flightsState.activeFlights
		} else if (activeTab === 'upcoming') {
			list = flightsState.upcomingFlights
		} else if (activeTab === 'past') {
			list = flightsState.pastFlights
		}

		if (!searchQuery.trim()) return list

		const q = searchQuery.toLowerCase().trim()
		return list.filter(
			(f) =>
				f.flightNumber.toLowerCase().includes(q) ||
				f.airline.name.toLowerCase().includes(q) ||
				f.departure.iata.toLowerCase().includes(q) ||
				f.arrival.iata.toLowerCase().includes(q) ||
				f.departure.city.toLowerCase().includes(q) ||
				f.arrival.city.toLowerCase().includes(q)
		)
	})

	function getStatusBadgeClass(status: string): string {
		switch (status) {
			case 'active':
			case 'boarding':
			case 'departed':
				return 'bg-accent text-white font-bold'
			case 'delayed':
				return 'bg-amber-500 text-black font-bold'
			case 'landed':
				return 'bg-bg-muted text-text-muted'
			case 'cancelled':
				return 'bg-red-500/20 text-red-500 font-bold'
			default:
				return 'bg-bg-muted text-text font-medium'
		}
	}
</script>

<div class="h-full flex flex-col border-r border-border bg-bg-secondary select-none">
	<!-- Header & Actions -->
	<div class="p-3.5 border-b border-border flex flex-col gap-2.5">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<PlaneIcon class="w-4 h-4 text-accent" />
				<span class="font-bold tracking-tight text-xs uppercase font-mono text-text">
					FLIGHT LOGBOOK
				</span>
			</div>

			<div class="flex items-center gap-1.5">
				<button
					type="button"
					onclick={onOpenLogbook}
					class="px-2 py-1 rounded text-[11px] font-mono text-text-muted hover:text-text hover:bg-bg-muted transition-colors cursor-pointer"
					title="View Passport & Stats"
				>
					STATS
				</button>
				<button
					type="button"
					onclick={onOpenAddModal}
					class="p-1 rounded bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
					title="Track New Flight"
				>
					<PlusIcon class="w-3.5 h-3.5 stroke-[2.5]" />
				</button>
			</div>
		</div>

		<!-- Search Input -->
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search flight, airline, city..."
			class="w-full px-2.5 py-1.5 rounded-lg bg-bg border border-border text-xs text-text placeholder:text-text-muted focus:outline-none focus:border-accent font-mono transition-colors"
		/>

		<!-- Filter Tabs -->
		<div class="flex items-center gap-1 p-0.5 rounded-lg bg-bg border border-border text-[10px] font-mono">
			<button
				type="button"
				onclick={() => (activeTab = 'all')}
				class="flex-1 py-1 rounded text-center transition-colors cursor-pointer {activeTab === 'all'
					? 'bg-bg-emphasis font-bold text-text shadow-2xs'
					: 'text-text-muted hover:text-text'}"
			>
				ALL ({flightsState.flights.length})
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'active')}
				class="flex-1 py-1 rounded text-center transition-colors cursor-pointer {activeTab === 'active'
					? 'bg-accent text-white font-bold shadow-2xs'
					: 'text-text-muted hover:text-text'}"
			>
				ACTIVE ({flightsState.activeFlights.length})
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'upcoming')}
				class="flex-1 py-1 rounded text-center transition-colors cursor-pointer {activeTab === 'upcoming'
					? 'bg-bg-emphasis font-bold text-text shadow-2xs'
					: 'text-text-muted hover:text-text'}"
			>
				UPCOMING
			</button>
			<button
				type="button"
				onclick={() => (activeTab = 'past')}
				class="flex-1 py-1 rounded text-center transition-colors cursor-pointer {activeTab === 'past'
					? 'bg-bg-emphasis font-bold text-text shadow-2xs'
					: 'text-text-muted hover:text-text'}"
			>
				PAST
			</button>
		</div>
	</div>

	<!-- Flight List Scrollable Canvas -->
	<div class="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
		{#if filteredFlights.length === 0}
			<div class="p-8 text-center text-xs font-mono text-text-muted flex flex-col items-center gap-3">
				<PlaneIcon class="w-8 h-8 opacity-30 stroke-[1.5]" />
				<span>No flights found</span>
				<button
					type="button"
					onclick={onOpenAddModal}
					class="px-3 py-1.5 rounded-lg bg-accent text-white font-mono text-xs cursor-pointer shadow-2xs hover:opacity-90 transition-opacity"
				>
					+ Track a Flight
				</button>
			</div>
		{:else}
			{#each filteredFlights as flight (flight.id)}
				{@const isSelected = flight.id === flightsState.selectedFlightId}
				<button
					type="button"
					onclick={() => flightsState.selectFlight(flight.id)}
					class="w-full text-left p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 {isSelected
						? 'bg-bg border-accent shadow-xs'
						: 'bg-bg/50 border-border hover:bg-bg hover:border-border/80'}"
				>
					<div class="flex items-center justify-between">
						<span class="font-mono text-xs font-bold text-text tracking-wide">
							{flight.flightNumber}
						</span>
						<span
							class="text-[9px] font-mono px-1.5 py-0.5 rounded tracking-wider uppercase {getStatusBadgeClass(
								flight.status
							)}"
						>
							{flight.statusText || flight.status}
						</span>
					</div>

					<div class="flex items-center justify-between font-mono text-sm font-semibold text-text">
						<span>{flight.departure.iata}</span>
						<span class="text-accent text-xs">➔</span>
						<span>{flight.arrival.iata}</span>
					</div>

					<div class="flex items-center justify-between text-[11px] font-mono text-text-muted">
						<span class="truncate max-w-[120px]">{flight.airline.name}</span>
						<span>
							{new Date(flight.departure.scheduledTime).toLocaleDateString([], {
								month: 'short',
								day: 'numeric'
							})}
						</span>
					</div>
				</button>
			{/each}
		{/if}
	</div>
</div>
