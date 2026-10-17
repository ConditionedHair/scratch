<script lang="ts">
	import { flightsState } from '../../context/flights.svelte'
	import { formatFlightDuration } from '../../lib/flightMath'
	import { PlaneIcon } from '../icons'

	interface Props {
		open: boolean
		onClose: () => void
	}

	let { open = $bindable(false), onClose }: Props = $props()

	let stats = $derived(flightsState.stats)
	let earthCircumnavigations = $derived(
		(stats.totalKm / 40075).toFixed(1)
	)
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
	>
		<div
			class="w-full max-w-xl rounded-2xl bg-bg-secondary border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
		>
			<!-- Header -->
			<div class="px-5 py-4 border-b border-border flex items-center justify-between">
				<div class="flex items-center gap-2">
					<PlaneIcon class="w-4 h-4 text-accent" />
					<span class="font-bold tracking-tight text-xs uppercase font-mono text-text">
						FLIGHT PASSPORT & STATS
					</span>
				</div>
				<button
					type="button"
					onclick={onClose}
					class="text-xs font-mono text-text-muted hover:text-text cursor-pointer p-1"
				>
					ESC / CLOSE
				</button>
			</div>

			<!-- Content -->
			<div class="p-6 flex-1 overflow-y-auto flex flex-col gap-6 font-mono">
				<!-- Stat Counter Grid -->
				<div class="grid grid-cols-2 md:grid-cols-4 gap-3">
					<div class="p-3.5 rounded-xl bg-bg border border-border flex flex-col">
						<span class="text-[10px] text-text-muted uppercase">FLIGHTS</span>
						<span class="text-2xl font-bold text-text mt-1">{stats.totalFlights}</span>
					</div>
					<div class="p-3.5 rounded-xl bg-bg border border-border flex flex-col">
						<span class="text-[10px] text-text-muted uppercase">DISTANCE</span>
						<span class="text-xl font-bold text-accent mt-1">
							{stats.totalMiles.toLocaleString()}
						</span>
						<span class="text-[9px] text-text-muted mt-0.5">MILES ({stats.totalKm.toLocaleString()} KM)</span>
					</div>
					<div class="p-3.5 rounded-xl bg-bg border border-border flex flex-col">
						<span class="text-[10px] text-text-muted uppercase">AIR TIME</span>
						<span class="text-xl font-bold text-text mt-1">
							{formatFlightDuration(stats.totalDurationMinutes)}
						</span>
					</div>
					<div class="p-3.5 rounded-xl bg-bg border border-border flex flex-col">
						<span class="text-[10px] text-text-muted uppercase">EARTH ORBITS</span>
						<span class="text-2xl font-bold text-text mt-1">{earthCircumnavigations}x</span>
					</div>
				</div>

				<!-- Airports Visited -->
				<div class="flex flex-col gap-2">
					<span class="text-xs uppercase text-text font-bold">
						AIRPORTS VISITED ({stats.airportsVisited.length})
					</span>
					<div class="flex flex-wrap gap-1.5 p-3 rounded-xl bg-bg border border-border">
						{#if stats.airportsVisited.length === 0}
							<span class="text-xs text-text-muted italic">No airports logged yet</span>
						{:else}
							{#each stats.airportsVisited as apt (apt)}
								<span
									class="px-2 py-0.5 rounded bg-bg-muted border border-border/60 text-xs font-bold text-text"
								>
									{apt}
								</span>
							{/each}
						{/if}
					</div>
				</div>

				<!-- Countries Visited -->
				<div class="flex flex-col gap-2">
					<span class="text-xs uppercase text-text font-bold">
						COUNTRIES VISITED ({stats.countriesVisited.length})
					</span>
					<div class="flex flex-wrap gap-1.5 p-3 rounded-xl bg-bg border border-border">
						{#if stats.countriesVisited.length === 0}
							<span class="text-xs text-text-muted italic">No countries logged yet</span>
						{:else}
							{#each stats.countriesVisited as c (c)}
								<span
									class="px-2 py-0.5 rounded bg-accent/15 border border-accent/30 text-xs font-bold text-accent"
								>
									{c}
								</span>
							{/each}
						{/if}
					</div>
				</div>

				<!-- Aircraft Breakdown -->
				<div class="flex flex-col gap-2">
					<span class="text-xs uppercase text-text font-bold">AIRCRAFT FLEET</span>
					<div class="flex flex-col gap-1 p-3 rounded-xl bg-bg border border-border text-xs">
						{#if Object.keys(stats.aircraftTypes).length === 0}
							<span class="text-text-muted italic">No aircraft logged yet</span>
						{:else}
							{#each Object.entries(stats.aircraftTypes) as [ac, count] (ac)}
								<div class="flex items-center justify-between py-1 border-b border-border/40 last:border-none">
									<span class="text-text font-medium">{ac}</span>
									<span class="text-text-muted font-bold">{count} {count === 1 ? 'flight' : 'flights'}</span>
								</div>
							{/each}
						{/if}
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
