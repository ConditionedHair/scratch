<script lang="ts">
	import type { FlightRecord } from '../../types/flight'
	import { formatFlightDuration } from '../../lib/flightMath'

	interface Props {
		flight: FlightRecord
		metric?: boolean
	}

	let { flight, metric = false }: Props = $props()

	let speed = $derived(
		flight.liveTelemetry?.speedKts ?? 480
	)
	let altitude = $derived(
		flight.liveTelemetry?.altitudeFt ?? 36000
	)
	let verticalRate = $derived(
		flight.liveTelemetry?.verticalRateFpm ?? 0
	)

	let displaySpeed = $derived(
		metric ? Math.round(speed * 1.852) : speed
	)
	let speedUnit = $derived(metric ? 'KM/H' : 'KTS')

	let displayAlt = $derived(
		metric ? Math.round(altitude * 0.3048) : altitude
	)
	let altUnit = $derived(metric ? 'M' : 'FT')

	let distanceRemaining = $derived(
		metric
			? `${flight.greatCircleDistanceKm ?? 0} KM`
			: `${flight.greatCircleDistanceNm ?? 0} NM`
	)

	let flightDurationStr = $derived(
		formatFlightDuration(flight.durationMinutes ?? 0)
	)
</script>

<div class="grid grid-cols-2 md:grid-cols-4 gap-3 select-none">
	<!-- Gauge 1: Groundspeed -->
	<div
		class="p-3.5 rounded-xl bg-bg-secondary border border-border flex flex-col justify-between shadow-2xs group hover:border-accent/40 transition-colors"
	>
		<div class="flex items-center justify-between text-text-muted text-[10px] font-mono uppercase tracking-wider">
			<span>GROUND SPEED</span>
			<span class="text-accent font-semibold">{speedUnit}</span>
		</div>
		<div class="mt-2 flex items-baseline gap-1.5">
			<span class="font-mono text-2xl font-bold tracking-tight text-text">
				{displaySpeed.toLocaleString()}
			</span>
			<span class="text-[11px] font-mono text-text-muted">{speedUnit}</span>
		</div>
		<!-- Stepped indicator bar -->
		<div class="mt-2 w-full h-1.5 rounded-full bg-bg-muted overflow-hidden flex">
			<div
				class="h-full bg-accent transition-all duration-500 rounded-full"
				style="width: {Math.min(100, (displaySpeed / (metric ? 1000 : 550)) * 100)}%"
			></div>
		</div>
	</div>

	<!-- Gauge 2: Altitude -->
	<div
		class="p-3.5 rounded-xl bg-bg-secondary border border-border flex flex-col justify-between shadow-2xs group hover:border-accent/40 transition-colors"
	>
		<div class="flex items-center justify-between text-text-muted text-[10px] font-mono uppercase tracking-wider">
			<span>ALTITUDE</span>
			<span class="text-accent font-semibold">{altUnit}</span>
		</div>
		<div class="mt-2 flex items-baseline gap-1.5">
			<span class="font-mono text-2xl font-bold tracking-tight text-text">
				{displayAlt.toLocaleString()}
			</span>
			<span class="text-[11px] font-mono text-text-muted">{altUnit}</span>
		</div>
		<!-- Stepped indicator bar -->
		<div class="mt-2 w-full h-1.5 rounded-full bg-bg-muted overflow-hidden flex">
			<div
				class="h-full bg-accent transition-all duration-500 rounded-full"
				style="width: {Math.min(100, (displayAlt / (metric ? 12000 : 42000)) * 100)}%"
			></div>
		</div>
	</div>

	<!-- Gauge 3: Vertical Rate / Flight Stage -->
	<div
		class="p-3.5 rounded-xl bg-bg-secondary border border-border flex flex-col justify-between shadow-2xs group hover:border-accent/40 transition-colors"
	>
		<div class="flex items-center justify-between text-text-muted text-[10px] font-mono uppercase tracking-wider">
			<span>CLIMB / DESCENT</span>
			<span class="text-text-muted font-semibold">FPM</span>
		</div>
		<div class="mt-2 flex items-baseline gap-1.5">
			<span class="font-mono text-2xl font-bold tracking-tight text-text">
				{verticalRate > 0 ? `+${verticalRate}` : verticalRate}
			</span>
			<span class="text-[11px] font-mono text-text-muted">
				{verticalRate > 100 ? 'CLIMBING' : verticalRate < -100 ? 'DESCENDING' : 'CRUISE'}
			</span>
		</div>
		<div class="mt-2 text-[10px] font-mono text-text-muted truncate">
			{flight.status.toUpperCase()} • {flightDurationStr} TOTAL
		</div>
	</div>

	<!-- Gauge 4: Gates & Baggage Belt -->
	<div
		class="p-3.5 rounded-xl bg-bg-secondary border border-border flex flex-col justify-between shadow-2xs group hover:border-accent/40 transition-colors"
	>
		<div class="flex items-center justify-between text-text-muted text-[10px] font-mono uppercase tracking-wider">
			<span>GATE / CAROUSEL</span>
			<span class="text-accent font-semibold">CLAIM</span>
		</div>
		<div class="mt-2 flex items-baseline justify-between">
			<div>
				<div class="text-[9px] font-mono uppercase text-text-muted">DEPARTURE</div>
				<div class="font-mono text-base font-bold text-text">
					{flight.departure.gate || flight.departure.terminal ? `G${flight.departure.gate || '-'} / T${flight.departure.terminal || '-'}` : 'TBD'}
				</div>
			</div>
			<div class="text-right">
				<div class="text-[9px] font-mono uppercase text-text-muted">BAGGAGE</div>
				<div class="font-mono text-base font-bold text-accent">
					{flight.arrival.baggage ? `BELT ${flight.arrival.baggage}` : 'TBD'}
				</div>
			</div>
		</div>
		<div class="mt-2 text-[10px] font-mono text-text-muted truncate">
			DIST: {distanceRemaining}
		</div>
	</div>
</div>
