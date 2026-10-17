<script lang="ts">
	import type { FlightRecord } from '../../types/flight'
	import { flightsState } from '../../context/flights.svelte'
	import SplitFlapDisplay from './SplitFlapDisplay.svelte'
	import FlightRadarMap from './FlightRadarMap.svelte'
	import FlightTelemetryGauges from './FlightTelemetryGauges.svelte'
	import InboundPlaneTracker from './InboundPlaneTracker.svelte'
	import { RefreshCwIcon, TrashIcon, PencilIcon, CheckIcon, XIcon } from '../icons'

	interface Props {
		flight: FlightRecord
	}

	let { flight }: Props = $props()

	let isRefreshing = $derived(flightsState.isRefreshing)
	let isEditingEquipment = $state(false)
	let editModel = $state('')
	let editReg = $state('')
	let editIcao24 = $state('')

	$effect(() => {
		editModel = flight.aircraft.model || ''
		editReg = flight.aircraft.registration || ''
		editIcao24 = flight.aircraft.icao24 || ''
	})

	async function handleSaveEquipment() {
		const cleanHex = editIcao24.trim().toLowerCase()
		const cleanReg = editReg.trim().toUpperCase()
		const cleanModel = editModel.trim() || flight.aircraft.model

		await flightsState.updateFlight(flight.id, {
			aircraft: {
				...flight.aircraft,
				model: cleanModel,
				registration: cleanReg || undefined,
				icao24: cleanHex || undefined
			}
		})
		isEditingEquipment = false

		if (cleanHex) {
			void flightsState.refreshTelemetry(flight.id)
		}
	}

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
	<div class="p-4 rounded-xl bg-bg-secondary border border-border font-mono text-xs text-text-muted flex flex-col gap-3">
		{#if !isEditingEquipment}
			<div class="flex flex-wrap items-center justify-between gap-4">
				<div>
					<span class="uppercase tracking-wider">AIRCRAFT: </span>
					<span class="text-text font-bold">{flight.aircraft.model}</span>
				</div>
				<div>
					<span class="uppercase tracking-wider">REG: </span>
					<span class="text-text font-bold">{flight.aircraft.registration || 'N/A'}</span>
				</div>
				<div class="flex items-center gap-1.5">
					<span class="uppercase tracking-wider">ICAO24 (MODE-S): </span>
					{#if flight.aircraft.icao24}
						<span class="text-accent font-bold">{flight.aircraft.icao24.toUpperCase()}</span>
					{:else}
						<button
							type="button"
							onclick={() => (isEditingEquipment = true)}
							class="text-accent hover:underline font-bold cursor-pointer inline-flex items-center gap-1"
							title="Click to register Mode-S transponder hex"
						>
							<span>UNASSIGNED</span>
							<PencilIcon class="w-3 h-3 opacity-70" />
						</button>
					{/if}
				</div>
				<div>
					<span class="uppercase tracking-wider">DISTANCE: </span>
					<span class="text-text font-bold">{flight.greatCircleDistanceNm ?? 0} NM ({flight.greatCircleDistanceKm ?? 0} KM)</span>
				</div>
				<button
					type="button"
					onclick={() => (isEditingEquipment = true)}
					class="px-2 py-1 rounded bg-bg-muted hover:bg-bg-emphasis text-text hover:text-accent text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
					title="Edit airframe details or Mode-S transponder"
				>
					<PencilIcon class="w-3 h-3" />
					<span>EDIT SPECS</span>
				</button>
			</div>
		{:else}
			<form onsubmit={(e) => { e.preventDefault(); void handleSaveEquipment(); }} class="flex flex-col gap-3">
				<div class="flex items-center justify-between border-b border-border pb-2">
					<span class="font-bold text-text uppercase tracking-wider text-[11px]">
						AIRCRAFT EQUIPMENT & TRANSPONDER OVERRIDE
					</span>
					<button
						type="button"
						onclick={() => (isEditingEquipment = false)}
						class="text-text-muted hover:text-text cursor-pointer"
					>
						<XIcon class="w-4 h-4" />
					</button>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-3">
					<div>
						<label for="eq-model" class="block text-[10px] uppercase text-text-muted mb-1 font-bold">Model</label>
						<input
							id="eq-model"
							type="text"
							bind:value={editModel}
							placeholder="e.g. Airbus A321neo"
							class="w-full px-2.5 py-1.5 rounded-lg border border-border bg-bg text-text text-xs font-mono focus:border-accent outline-none"
						/>
					</div>
					<div>
						<label for="eq-reg" class="block text-[10px] uppercase text-text-muted mb-1 font-bold">Tail Reg</label>
						<input
							id="eq-reg"
							type="text"
							bind:value={editReg}
							placeholder="e.g. TC-LTD"
							class="w-full px-2.5 py-1.5 rounded-lg border border-border bg-bg text-text text-xs font-mono uppercase focus:border-accent outline-none"
						/>
					</div>
					<div>
						<label for="eq-icao" class="block text-[10px] uppercase text-accent mb-1 font-bold">ICAO24 (Mode-S Hex)</label>
						<input
							id="eq-icao"
							type="text"
							bind:value={editIcao24}
							placeholder="e.g. 4b821a (6 hex chars)"
							maxlength="6"
							class="w-full px-2.5 py-1.5 rounded-lg border border-border bg-bg text-accent text-xs font-mono uppercase focus:border-accent outline-none"
						/>
					</div>
				</div>
				<div class="flex items-center justify-end gap-2 pt-1">
					<button
						type="button"
						onclick={() => (isEditingEquipment = false)}
						class="px-3 py-1 rounded-lg border border-border bg-bg-secondary hover:bg-bg-emphasis text-xs cursor-pointer text-text-muted"
					>
						CANCEL
					</button>
					<button
						type="submit"
						class="px-3 py-1 rounded-lg bg-accent text-white hover:opacity-90 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs"
					>
						<CheckIcon class="w-3.5 h-3.5" />
						<span>SAVE & TRACK</span>
					</button>
				</div>
			</form>
		{/if}
	</div>
</div>
