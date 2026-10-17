<script lang="ts">
	import type { FlightRecord } from '../../types/flight'
	import { PlaneIcon } from '../icons'

	interface Props {
		flight: FlightRecord
	}

	let { flight }: Props = $props()

	let inbound = $derived(flight.inboundFlight)
</script>

{#if inbound}
	<div
		class="p-4 rounded-xl border select-none transition-colors {inbound.isDelayed
			? 'bg-amber-500/10 border-amber-500/30'
			: 'bg-bg-secondary border-border'}"
	>
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<PlaneIcon class="w-4 h-4 text-accent rotate-180" />
				<span class="font-mono text-xs font-bold uppercase tracking-wider text-text">
					INBOUND AIRCRAFT: {inbound.flightNumber}
				</span>
			</div>
			<span
				class="font-mono text-[10px] px-2 py-0.5 rounded-full font-bold uppercase {inbound.isDelayed
					? 'bg-amber-500 text-black'
					: 'bg-bg-muted text-text-muted'}"
			>
				{inbound.isDelayed ? `DELAYED +${inbound.delayMinutes || 0}M` : 'ON TIME'}
			</span>
		</div>

		<div class="mt-2 text-xs text-text-muted flex items-center justify-between font-mono">
			<span>Inbound from {inbound.originIata} ({inbound.originName || inbound.originIata})</span>
			<span>Est. Arrival: {inbound.estimatedArrival ? new Date(inbound.estimatedArrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'On Schedule'}</span>
		</div>

		{#if inbound.isDelayed}
			<div class="mt-2 text-[11px] text-amber-600 dark:text-amber-400 font-sans font-medium flex items-center gap-1.5">
				<span>⚠️</span>
				<span>Your departure flight may be delayed due to late inbound aircraft turnaround.</span>
			</div>
		{/if}
	</div>
{:else}
	<div
		class="p-3.5 rounded-xl bg-bg-secondary border border-border/70 select-none flex items-center justify-between text-xs text-text-muted font-mono"
	>
		<div class="flex items-center gap-2">
			<PlaneIcon class="w-3.5 h-3.5 text-text-muted" />
			<span>AIRCRAFT: {flight.aircraft.model} ({flight.aircraft.registration || 'Reg Pending'})</span>
		</div>
		<span class="text-[10px] text-accent">ON TRACK</span>
	</div>
{/if}
