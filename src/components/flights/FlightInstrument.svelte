<script lang="ts">
	import type { FlightRecord } from '../../types/flight'
	import { flightsState } from '../../context/flights.svelte'
	import SplitFlapDisplay from './SplitFlapDisplay.svelte'
	import FlightRadarMap from './FlightRadarMap.svelte'
	import FlightTelemetryGauges from './FlightTelemetryGauges.svelte'
	import InboundPlaneTracker from './InboundPlaneTracker.svelte'
	import { RefreshCwIcon, TrashIcon } from '../icons'

	interface Props {
		flight: FlightRecord
	}

	let { flight }: Props = $props()

	let isRefreshing = $derived(flightsState.isRefreshing)

	function handleRefresh() {
		void flightsState.refreshTelemetry(flight.id)
	}

	function handleDelete() {
		if (confirm(`Remove flight ${flight.flightNumber} from logbook?`)) {
			void flightsState.deleteFlight(flight.id)
		}
	}

	function formatTime(isoStr?: string): string {
		if (!isoStr) return '--:--'
		try {
			const d = new Date(isoStr)
			return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
		} catch {
			return '--:--'
		}
	}

	function formatDate(isoStr?: string): string {
		if (!isoStr) return ''
		try {
			const d = new Date(isoStr)
			return d.toLocaleDateString([], {
				weekday: 'short',
				month: 'short',
				day: 'numeric'
			})
		} catch {
			return ''
		}
	}
</script>

<div class="h-full flex flex-col overflow-y-auto p-6 max-w-4xl mx-auto gap-6 select-none">
	<!-- Top Instrument Header -->
	<div class="flex items-center justify-between border-b border-border pb-5">
		<div class="flex flex-col gap-2">
			<div class="flex items-center gap-3">
				<SplitFlapDisplay text={flight.flightNumber} size="lg" accent={true} />
				<span class="text-text-muted font-mono text-sm uppercase">/</span>
				<SplitFlapDisplay text="{flight.departure.iata}➔{flight.arrival.iata}" size="lg" />
			</div>
			<div class="flex items-center gap-2 text-xs font-mono text-text-muted">
				<span class="font-bold text-text">{flight.airline.name}</span>
				<span>•</span>
				<span>{formatDate(flight.departure.scheduledTime)}</span>
				{#if flight.bookingReference}
					<span>•</span>
					<span class="bg-bg-muted px-1.5 py-0.5 rounded text-[10px] text-text font-bold">
						PNR: {flight.bookingReference}
					</span>
				{/if}
				{#if flight.seat}
					<span>•</span>
					<span class="bg-bg-muted px-1.5 py-0.5 rounded text-[10px] text-text font-bold">
						SEAT: {flight.seat}
					</span>
				{/if}
			</div>
		</div>

		<!-- Action Knobs & Controls -->
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={handleRefresh}
				disabled={isRefreshing}
				class="px-3 py-1.5 rounded-lg border border-border bg-bg-secondary hover:bg-bg-emphasis text-xs font-mono flex items-center gap-2 text-text transition-all cursor-pointer shadow-2xs active:scale-95 disabled:opacity-50"
				title="Refresh Live OpenSky Telemetry"
			>
				<RefreshCwIcon class="w-3.5 h-3.5 {isRefreshing ? 'animate-spin text-accent' : ''}" />
				<span>{isRefreshing ? 'TRACKING...' : 'REFRESH RADAR'}</span>
			</button>

			<button
				type="button"
				onclick={handleDelete}
				class="p-2 rounded-lg border border-border bg-bg-secondary hover:bg-red-500/10 hover:border-red-500/40 text-text-muted hover:text-red-500 transition-colors cursor-pointer"
				title="Delete Flight"
			>
				<TrashIcon class="w-4 h-4" />
			</button>
		</div>
	</div>

	<!-- Route Ribbon: Departure ➔ Arrival -->
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-5 rounded-2xl bg-bg-secondary border border-border shadow-2xs">
		<!-- Departure Box -->
		<div class="flex flex-col gap-1 border-b md:border-b-0 md:border-r border-border pb-4 md:pb-0 md:pr-4">
			<div class="flex items-center justify-between">
				<span class="font-mono text-2xl font-bold tracking-tight text-text">
					{flight.departure.iata}
				</span>
				<span class="text-xs font-mono text-text-muted uppercase">
					{flight.departure.city}
				</span>
			</div>
			<div class="text-sm font-medium text-text truncate">
				{flight.departure.name}
			</div>
			<div class="mt-2 flex items-baseline gap-2 font-mono">
				<span class="text-xl font-bold text-text">
					{formatTime(flight.departure.actualTime || flight.departure.estimatedTime || flight.departure.scheduledTime)}
				</span>
				<span class="text-xs text-text-muted">
					SCHED: {formatTime(flight.departure.scheduledTime)}
				</span>
			</div>
			<div class="text-xs font-mono text-text-muted mt-1 flex items-center gap-3">
				<span>TERMINAL: <strong class="text-text">{flight.departure.terminal || '--'}</strong></span>
				<span>GATE: <strong class="text-text">{flight.departure.gate || '--'}</strong></span>
			</div>
		</div>

		<!-- Arrival Box -->
		<div class="flex flex-col gap-1 md:pl-4">
			<div class="flex items-center justify-between">
				<span class="font-mono text-2xl font-bold tracking-tight text-text">
					{flight.arrival.iata}
				</span>
				<span class="text-xs font-mono text-text-muted uppercase">
					{flight.arrival.city}
				</span>
			</div>
			<div class="text-sm font-medium text-text truncate">
				{flight.arrival.name}
			</div>
			<div class="mt-2 flex items-baseline gap-2 font-mono">
				<span class="text-xl font-bold text-text">
					{formatTime(flight.arrival.actualTime || flight.arrival.estimatedTime || flight.arrival.scheduledTime)}
				</span>
				<span class="text-xs text-text-muted">
					SCHED: {formatTime(flight.arrival.scheduledTime)}
				</span>
			</div>
			<div class="text-xs font-mono text-text-muted mt-1 flex items-center gap-3">
				<span>TERMINAL: <strong class="text-text">{flight.arrival.terminal || '--'}</strong></span>
				<span>GATE: <strong class="text-text">{flight.arrival.gate || '--'}</strong></span>
				<span>BAGGAGE: <strong class="text-accent">{flight.arrival.baggage || '--'}</strong></span>
			</div>
		</div>
	</div>

	<!-- Pure SVG Radar Vector Screen -->
	<FlightRadarMap {flight} />

	<!-- Dieter Rams Telemetry Readouts & Gauges -->
	<FlightTelemetryGauges {flight} metric={flightsState.settings.metricUnits} />

	<!-- Inbound Aircraft Status Card -->
	<InboundPlaneTracker {flight} />

	<!-- Aircraft & Technical Equipment Specs -->
	<div class="p-4 rounded-xl bg-bg-secondary border border-border font-mono text-xs text-text-muted flex flex-wrap items-center justify-between gap-4">
		<div>
			<span class="uppercase tracking-wider">AIRCRAFT: </span>
			<span class="text-text font-bold">{flight.aircraft.model}</span>
		</div>
		<div>
			<span class="uppercase tracking-wider">REG: </span>
			<span class="text-text font-bold">{flight.aircraft.registration || 'N/A'}</span>
		</div>
		<div>
			<span class="uppercase tracking-wider">ICAO24 (MODE-S): </span>
			<span class="text-accent font-bold">{flight.aircraft.icao24?.toUpperCase() || 'UNREGISTERED'}</span>
		</div>
		<div>
			<span class="uppercase tracking-wider">DISTANCE: </span>
			<span class="text-text font-bold">{flight.greatCircleDistanceNm ?? 0} NM ({flight.greatCircleDistanceKm ?? 0} KM)</span>
		</div>
	</div>
</div>
