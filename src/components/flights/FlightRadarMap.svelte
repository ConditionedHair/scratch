<script lang="ts">
	import type { FlightRecord } from '../../types/flight'
	import {
		generateGreatCircleArc,
		calculateBearing,
		type GeoPoint
	} from '../../lib/flightMath'
	import {
		WORLD_LAND_POLYGONS,
		WORLD_BORDER_LINES
	} from '../../lib/worldVectorData'

	interface Props {
		flight: FlightRecord
	}

	let { flight }: Props = $props()

	const WIDTH = 680
	const HEIGHT = 380
	const ASPECT = WIDTH / HEIGHT

	// Zoom and Pan controls
	let zoomLevel = $state(1.0)
	let panOffsetX = $state(0)
	let panOffsetY = $state(0)

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
			60
		)
	)

	// Geographic Bounding Box with aspect ratio preservation
	let bounds = $derived.by(() => {
		const allLats = arcWaypoints.map((p) => p.lat).concat([planeLat])
		const allLons = arcWaypoints.map((p) => p.lon).concat([planeLon])

		const minLat = Math.min(...allLats)
		const maxLat = Math.max(...allLats)
		let minLon = Math.min(...allLons)
		let maxLon = Math.max(...allLons)

		// Handle antimeridian wrap
		if (maxLon - minLon > 180) {
			minLon = -180
			maxLon = 180
		}

		const midLat = (minLat + maxLat) / 2
		const midLon = (minLon + maxLon) / 2
		const cosLat = Math.max(0.2, Math.cos((midLat * Math.PI) / 180))

		// Base padding around the flight path
		const latSpan = Math.max(12, maxLat - minLat + 14)
		const lonSpan = Math.max(16, maxLon - minLon + 18)

		let halfH = (latSpan / 2) / zoomLevel
		let halfW = (lonSpan / 2) / zoomLevel

		// Aspect-ratio lock with cosine latitude correction
		if ((halfW * cosLat) / halfH < ASPECT) {
			halfW = (halfH * ASPECT) / cosLat
		} else {
			halfH = (halfW * cosLat) / ASPECT
		}

		// Apply pan offsets
		const centerLat = midLat + (panOffsetY / HEIGHT) * (halfH * 2)
		const centerLon = midLon - (panOffsetX / WIDTH) * (halfW * 2)

		return {
			minLat: Math.max(-85, centerLat - halfH),
			maxLat: Math.min(85, centerLat + halfH),
			minLon: centerLon - halfW,
			maxLon: centerLon + halfW
		}
	})

	// Equirectangular projection mapping to SVG canvas
	function toSvg(lat: number, lon: number): [number, number] {
		const { minLat, maxLat, minLon, maxLon } = bounds
		const lonRange = Math.max(1, maxLon - minLon)
		const latRange = Math.max(1, maxLat - minLat)

		const x = ((lon - minLon) / lonRange) * WIDTH
		const y = HEIGHT - ((lat - minLat) / latRange) * HEIGHT
		return [Math.round(x * 10) / 10, Math.round(y * 10) / 10]
	}

	let depPos = $derived(toSvg(depLat, depLon))
	let arrPos = $derived(toSvg(arrLat, arrLon))
	let planePos = $derived(toSvg(planeLat, planeLon))

	// Great Circle Flight Route Arc Path
	let flightArcD = $derived.by(() => {
		if (arcWaypoints.length < 2) return ''
		return arcWaypoints
			.map((pt, i) => {
				const [x, y] = toSvg(pt.lat, pt.lon)
				return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
			})
			.join(' ')
	})

	// Render visible Landmass Polygons
	let landSvgPath = $derived.by(() => {
		const { minLat, maxLat, minLon, maxLon } = bounds
		const pad = 15
		const paths: string[] = []

		for (const poly of WORLD_LAND_POLYGONS) {
			for (const ring of poly) {
				const inBounds = ring.some(
					([lon, lat]) =>
						lat >= minLat - pad &&
						lat <= maxLat + pad &&
						lon >= minLon - pad &&
						lon <= maxLon + pad
				)
				if (!inBounds) continue

				const parts = ring.map(([lon, lat], i) => {
					const [x, y] = toSvg(lat, lon)
					return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
				})
				paths.push(parts.join(' ') + ' Z')
			}
		}

		return paths.join(' ')
	})

	// Render visible Country Borders
	let bordersSvgPath = $derived.by(() => {
		const { minLat, maxLat, minLon, maxLon } = bounds
		const pad = 12
		const paths: string[] = []

		for (const line of WORLD_BORDER_LINES) {
			const inBounds = line.some(
				([lon, lat]) =>
					lat >= minLat - pad &&
					lat <= maxLat + pad &&
					lon >= minLon - pad &&
					lon <= maxLon + pad
			)
			if (!inBounds) continue

			const parts = line.map(([lon, lat], i) => {
				const [x, y] = toSvg(lat, lon)
				return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
			})
			paths.push(parts.join(' '))
		}

		return paths.join(' ')
	})

	function zoomIn() {
		zoomLevel = Math.min(3.5, zoomLevel + 0.35)
	}

	function zoomOut() {
		zoomLevel = Math.max(0.6, zoomLevel - 0.35)
	}

	function resetZoom() {
		zoomLevel = 1.0
		panOffsetX = 0
		panOffsetY = 0
	}
</script>

<div
	class="relative w-full rounded-2xl bg-[#121316] border border-border/80 shadow-inner overflow-hidden select-none flex flex-col items-center justify-center p-3 group"
>
	<!-- CRT Radar Vector Screen -->
	<svg
		viewBox="0 0 {WIDTH} {HEIGHT}"
		class="w-full h-auto max-h-[400px] overflow-hidden"
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
			<!-- Radar Outer Vignette -->
			<radialGradient id="radarVignette" cx="50%" cy="50%" r="50%">
				<stop offset="60%" stop-color="#181a1d" stop-opacity="0.1" />
				<stop offset="100%" stop-color="#0e0f11" stop-opacity="0.85" />
			</radialGradient>
		</defs>

		<!-- Ocean Canvas Background -->
		<rect width={WIDTH} height={HEIGHT} fill="#121417" rx="10" />

		<!-- Geographic Vector Landmasses -->
		{#if landSvgPath}
			<path
				d={landSvgPath}
				fill="#1c2027"
				stroke="#2c333f"
				stroke-width="0.85"
				stroke-linejoin="round"
			/>
		{/if}

		<!-- Geographic Country Borders -->
		{#if bordersSvgPath}
			<path
				d={bordersSvgPath}
				fill="none"
				stroke="#333b49"
				stroke-width="0.6"
				stroke-dasharray="2,3"
				stroke-linecap="round"
			/>
		{/if}

		<!-- Radar Vignette Overlay -->
		<rect width={WIDTH} height={HEIGHT} fill="url(#radarVignette)" rx="10" pointer-events="none" />

		<!-- Concentric Radar Instrument Rings -->
		<g stroke="currentColor" class="text-white/10" stroke-dasharray="2,4" fill="none">
			<circle cx={WIDTH / 2} cy={HEIGHT / 2} r="65" />
			<circle cx={WIDTH / 2} cy={HEIGHT / 2} r="130" />
			<circle cx={WIDTH / 2} cy={HEIGHT / 2} r="195" />
			<circle cx={WIDTH / 2} cy={HEIGHT / 2} r="260" />
		</g>

		<!-- Radar Center Crosshairs -->
		<line
			x1="30"
			y1={HEIGHT / 2}
			x2={WIDTH - 30}
			y2={HEIGHT / 2}
			stroke="currentColor"
			class="text-white/10"
			stroke-dasharray="4,6"
		/>
		<line
			x1={WIDTH / 2}
			y1="20"
			x2={WIDTH / 2}
			y2={HEIGHT - 20}
			stroke="currentColor"
			class="text-white/10"
			stroke-dasharray="4,6"
		/>

		<!-- Great Circle Flight Arc Glow -->
		{#if flightArcD}
			<path
				d={flightArcD}
				fill="none"
				stroke="var(--color-accent, #ff6b00)"
				stroke-width="4.5"
				stroke-opacity="0.35"
				filter="url(#radarGlow)"
			/>
			<path
				d={flightArcD}
				fill="none"
				stroke="var(--color-accent, #ff6b00)"
				stroke-width="2.2"
				stroke-dasharray="6,4"
			/>
		{/if}

		<!-- Departure Airport Pin -->
		<g transform="translate({depPos[0]}, {depPos[1]})">
			<circle r="4" fill="#ffffff" />
			<circle r="9" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.65" />
			<text
				y="-13"
				text-anchor="middle"
				class="font-mono text-[11px] font-bold fill-white tracking-widest uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
			>
				{flight.departure.iata}
			</text>
		</g>

		<!-- Arrival Airport Pin -->
		<g transform="translate({arrPos[0]}, {arrPos[1]})">
			<circle r="4" fill="#ffffff" />
			<circle r="9" fill="none" stroke="#ffffff" stroke-width="1.5" opacity="0.65" />
			<text
				y="-13"
				text-anchor="middle"
				class="font-mono text-[11px] font-bold fill-white tracking-widest uppercase drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]"
			>
				{flight.arrival.iata}
			</text>
		</g>

		<!-- Aircraft Beacon & Heading Arrow -->
		<g transform="translate({planePos[0]}, {planePos[1]})">
			<!-- Pulsing Signal Ring -->
			<circle
				r="15"
				fill="none"
				stroke="var(--color-accent, #ff6b00)"
				stroke-width="1.5"
				class="animate-ping opacity-60"
			/>
			<circle
				r="6.5"
				fill="var(--color-accent, #ff6b00)"
				filter="url(#radarGlow)"
			/>
			<!-- Rotating Aircraft Needle -->
			<g transform="rotate({planeHeading})">
				<path
					d="M 0 -14 L 6 5 L 0 1.5 L -6 5 Z"
					fill="var(--color-accent, #ff6b00)"
					stroke="#ffffff"
					stroke-width="1.2"
				/>
			</g>
			<!-- Callout badge -->
			<g transform="translate(0, 26)">
				<rect
					x="-34"
					y="-10"
					width="68"
					height="19"
					rx="4"
					fill="#1c1e23"
					stroke="var(--color-accent, #ff6b00)"
					stroke-width="1"
				/>
				<text
					y="3.5"
					text-anchor="middle"
					class="font-mono text-[9px] font-bold fill-white tracking-wider"
				>
					{flight.flightNumber}
				</text>
			</g>
		</g>
	</svg>

	<!-- Dieter Rams Hardware Zoom & View Knobs (Top Right) -->
	<div
		class="absolute top-4 right-4 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-1 rounded-lg border border-white/10 text-white/80 font-mono text-xs shadow-md"
	>
		<button
			type="button"
			onclick={zoomIn}
			class="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
			title="Zoom In"
		>
			+
		</button>
		<button
			type="button"
			onclick={zoomOut}
			class="w-6 h-6 rounded flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer"
			title="Zoom Out"
		>
			-
		</button>
		<button
			type="button"
			onclick={resetZoom}
			class="px-1.5 h-6 rounded text-[10px] flex items-center justify-center hover:bg-white/10 hover:text-white transition-colors cursor-pointer font-bold"
			title="Reset View"
		>
			FIT
		</button>
	</div>

	<!-- Telemetry HUD Bottom Bar Overlay -->
	<div
		class="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white/70 font-mono text-[11px] bg-black/65 backdrop-blur-md px-3.5 py-2 rounded-lg border border-white/10 shadow-lg"
	>
		<div class="flex items-center gap-3">
			<span class="flex items-center gap-1.5">
				<span class="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
				<span class="text-white font-semibold">RADAR ACTIVE</span>
			</span>
			<span class="opacity-40">|</span>
			<span>HDG {planeHeading.toString().padStart(3, '0')}°</span>
			<span class="opacity-40">|</span>
			<span>ZOOM {Math.round(zoomLevel * 100)}%</span>
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
