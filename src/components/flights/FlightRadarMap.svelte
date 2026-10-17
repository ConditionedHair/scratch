<script lang="ts">
	import type { FlightRecord } from '../../types/flight'
	import {
		generateGreatCircleArc,
		calculateBearing,
		type GeoPoint
	} from '../../lib/flightMath'

	interface Props {
		flight: FlightRecord
	}

	let { flight }: Props = $props()

	const WIDTH = 680
	const HEIGHT = 380

	// Geocoordinates of departure & arrival
	let depLat = $derived(flight.departure.lat ?? 0)
	let depLon = $derived(flight.departure.lon ?? 0)
	let arrLat = $derived(flight.arrival.lat ?? 0)
	let arrLon = $derived(flight.arrival.lon ?? 0)

	// Live telemetry position or interpolated
	let planeLat = $derived(
		flight.liveTelemetry?.latitude ??
			(depLat + (arrLat - depLat) * 0.45)
	)
	let planeLon = $derived(
		flight.liveTelemetry?.longitude ??
			(depLon + (arrLon - depLon) * 0.45)
	)
	let planeHeading = $derived(
		flight.liveTelemetry?.heading ??
			calculateBearing(depLat, depLon, arrLat, arrLon)
	)

	// Great-Circle Arc points
	let arcWaypoints = $derived<GeoPoint[]>(
		generateGreatCircleArc(
			{ lat: depLat, lon: depLon },
			{ lat: arrLat, lon: arrLon },
			50
		)
	)

	// Bounding box & Equirectangular projection mapping to SVG canvas
	let proj = $derived.by(() => {
		const allLats = arcWaypoints.map((p) => p.lat).concat([planeLat])
		const allLons = arcWaypoints.map((p) => p.lon).concat([planeLon])

		const minLat = Math.min(...allLats)
		const maxLat = Math.max(...allLats)
		let minLon = Math.min(...allLons)
		let maxLon = Math.max(...allLons)

		// Lon span
		if (maxLon - minLon > 180) {
			// Crosses antimeridian fallback
			minLon = -180
			maxLon = 180
		}

		const latPadding = Math.max(8, (maxLat - minLat) * 0.35)
		const lonPadding = Math.max(12, (maxLon - minLon) * 0.35)

		const boundMinLat = minLat - latPadding
		const boundMaxLat = maxLat + latPadding
		const boundMinLon = minLon - lonPadding
		const boundMaxLon = maxLon + lonPadding

		const latRange = Math.max(1, boundMaxLat - boundMinLat)
		const lonRange = Math.max(1, boundMaxLon - boundMinLon)

		function toSvg(lat: number, lon: number): [number, number] {
			const x = ((lon - boundMinLon) / lonRange) * (WIDTH - 120) + 60
			const y =
				HEIGHT - (((lat - boundMinLat) / latRange) * (HEIGHT - 100) + 50)
			return [Math.round(x), Math.round(y)]
		}

		return { toSvg }
	})

	let depPos = $derived(proj.toSvg(depLat, depLon))
	let arrPos = $derived(proj.toSvg(arrLat, arrLon))
	let planePos = $derived(proj.toSvg(planeLat, planeLon))

	let svgPathD = $derived.by(() => {
		if (arcWaypoints.length < 2) return ''
		return arcWaypoints
			.map((pt, i) => {
				const [x, y] = proj.toSvg(pt.lat, pt.lon)
				return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
			})
			.join(' ')
	})
</script>

<div
	class="relative w-full rounded-2xl bg-[#141517] border border-border/80 shadow-inner overflow-hidden select-none flex flex-col items-center justify-center p-3"
>
	<!-- CRT Radar Vector Screen -->
	<svg
		viewBox="0 0 {WIDTH} {HEIGHT}"
		class="w-full h-auto max-h-[380px] overflow-visible"
	>
		<defs>
			<!-- Radar Glow Filter -->
			<filter id="radarGlow" x="-20%" y="-20%" width="140%" height="140%">
				<feGaussianBlur stdDeviation="3" result="blur" />
				<feMerge>
					<feMergeNode in="blur" />
					<feMergeNode in="SourceGraphic" />
				</feMerge>
			</filter>
			<!-- Radial Background Grid -->
			<radialGradient id="radarVignette" cx="50%" cy="50%" r="50%">
				<stop offset="60%" stop-color="#181a1d" stop-opacity="0.2" />
				<stop offset="100%" stop-color="#0e0f11" stop-opacity="0.9" />
			</radialGradient>
		</defs>

		<!-- Background Vignette -->
		<rect width={WIDTH} height={HEIGHT} fill="url(#radarVignette)" rx="12" />

		<!-- Concentric Radar Instrument Rings -->
		<g stroke="currentColor" class="text-white/10" stroke-dasharray="2,4" fill="none">
			<circle cx={WIDTH / 2} cy={HEIGHT / 2} r="60" />
			<circle cx={WIDTH / 2} cy={HEIGHT / 2} r="120" />
			<circle cx={WIDTH / 2} cy={HEIGHT / 2} r="180" />
			<circle cx={WIDTH / 2} cy={HEIGHT / 2} r="240" />
		</g>

		<!-- Crosshairs -->
		<line
			x1="40"
			y1={HEIGHT / 2}
			x2={WIDTH - 40}
			y2={HEIGHT / 2}
			stroke="currentColor"
			class="text-white/10"
			stroke-dasharray="4,6"
		/>
		<line
			x1={WIDTH / 2}
			y1="30"
			x2={WIDTH / 2}
			y2={HEIGHT - 30}
			stroke="currentColor"
			class="text-white/10"
			stroke-dasharray="4,6"
		/>

		<!-- Great Circle Flight Arc Glow -->
		{#if svgPathD}
			<path
				d={svgPathD}
				fill="none"
				stroke="var(--color-accent, #ff6b00)"
				stroke-width="4"
				stroke-opacity="0.3"
				filter="url(#radarGlow)"
			/>
			<path
				d={svgPathD}
				fill="none"
				stroke="var(--color-accent, #ff6b00)"
				stroke-width="2"
				stroke-dasharray="6,4"
			/>
		{/if}

		<!-- Departure Airport Pin -->
		<g transform="translate({depPos[0]}, {depPos[1]})">
			<circle r="4" fill="#ffffff" />
			<circle r="8" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.6" />
			<text
				y="-12"
				text-anchor="middle"
				class="font-mono text-[11px] font-bold fill-white tracking-widest uppercase"
			>
				{flight.departure.iata}
			</text>
		</g>

		<!-- Arrival Airport Pin -->
		<g transform="translate({arrPos[0]}, {arrPos[1]})">
			<circle r="4" fill="#ffffff" />
			<circle r="8" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.6" />
			<text
				y="-12"
				text-anchor="middle"
				class="font-mono text-[11px] font-bold fill-white tracking-widest uppercase"
			>
				{flight.arrival.iata}
			</text>
		</g>

		<!-- Aircraft Beacon & Heading Needle -->
		<g transform="translate({planePos[0]}, {planePos[1]})">
			<!-- Pulsing Signal Ring -->
			<circle
				r="14"
				fill="none"
				stroke="var(--color-accent, #ff6b00)"
				stroke-width="1.5"
				class="animate-ping opacity-60"
			/>
			<circle
				r="6"
				fill="var(--color-accent, #ff6b00)"
				filter="url(#radarGlow)"
			/>
			<!-- Rotating Aircraft Arrow -->
			<g transform="rotate({planeHeading})">
				<path
					d="M 0 -13 L 5 4 L 0 1 L -5 4 Z"
					fill="var(--color-accent, #ff6b00)"
					stroke="#ffffff"
					stroke-width="1"
				/>
			</g>
			<!-- Callout badge -->
			<g transform="translate(0, 24)">
				<rect
					x="-34"
					y="-10"
					width="68"
					height="18"
					rx="4"
					fill="#1c1e22"
					stroke="var(--color-accent, #ff6b00)"
					stroke-width="1"
				/>
				<text
					y="3"
					text-anchor="middle"
					class="font-mono text-[9px] font-bold fill-white tracking-wider"
				>
					{flight.flightNumber}
				</text>
			</g>
		</g>
	</svg>

	<!-- Telemetry HUD Bottom Bar Overlay -->
	<div
		class="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white/70 font-mono text-[11px] bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10"
	>
		<div class="flex items-center gap-3">
			<span class="flex items-center gap-1">
				<span class="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
				<span class="text-white font-semibold">RADAR ACTIVE</span>
			</span>
			<span class="opacity-40">|</span>
			<span>HDG {planeHeading.toString().padStart(3, '0')}°</span>
		</div>
		<div class="flex items-center gap-3">
			{#if flight.liveTelemetry}
				<span>ALT {flight.liveTelemetry.altitudeFt.toLocaleString()} FT</span>
				<span class="opacity-40">|</span>
				<span>SPD {flight.liveTelemetry.speedKts} KTS</span>
			{:else}
				<span>ESTIMATED ROUTE</span>
			{/if}
		</div>
	</div>
</div>
