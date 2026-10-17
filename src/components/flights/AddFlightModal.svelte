<script lang="ts">
	import { toast } from 'svelte-sonner'
	import { flightsState } from '../../context/flights.svelte'
	import { calendarState } from '../../context/calendar.svelte'
	import { mailState } from '../../context/mail.svelte'
	import * as flightService from '../../services/flights'
	import {
		scanCalendarForFlights,
		scanMailForFlights,
		type DiscoveredFlightCandidate
	} from '../../services/flightImporter'
	import { getAirportByIata } from '../../lib/airports'
	import {
		calculateGreatCircleDistanceKm,
		calculateGreatCircleDistanceNm
	} from '../../lib/flightMath'
	import type { FlightRecord } from '../../types/flight'
	import { PlaneIcon, RefreshCwIcon, MailIcon, CalendarIcon } from '../icons'

	interface Props {
		open: boolean
		onClose: () => void
	}

	let { open = $bindable(false), onClose }: Props = $props()

	type AddTab = 'search' | 'autoScan' | 'manual'
	let activeTab = $state<AddTab>('search')

	// Search form
	let flightNumber = $state('')
	let flightDate = $state(new Date().toISOString().split('T')[0])
	let isSearching = $state(false)
	let searchResults = $state<FlightRecord[]>([])

	// Auto-scan from mail & calendar
	let isScanning = $state(false)
	let discoveredFlights = $state<DiscoveredFlightCandidate[]>([])

	// Manual form
	let manualAirline = $state('Qantas')
	let manualFlightNo = $state('QF 1')
	let manualDepIata = $state('SYD')
	let manualArrIata = $state('LHR')
	let manualDepTime = $state(new Date().toISOString().slice(0, 16))
	let manualArrTime = $state(new Date(Date.now() + 14 * 3600000).toISOString().slice(0, 16))
	let manualAircraft = $state('Airbus A380-800')
	let manualPnr = $state('')
	let manualSeat = $state('')

	async function handleSearch() {
		const cleanNum = flightNumber.trim().toUpperCase()
		if (!cleanNum) {
			toast.error('Enter a flight number (e.g. QF1 or UA870)')
			return
		}

		const apiKey = flightsState.settings.rapidApiKey
		if (!apiKey) {
			toast.error('AeroDataBox API key is required. Please set it in Settings.')
			return
		}

		isSearching = true
		searchResults = []
		try {
			const res = await flightService.searchAeroDataBox(
				cleanNum,
				flightDate,
				apiKey
			)
			searchResults = res
			if (res.length === 0) {
				toast.info('No scheduled flights found for this date/number')
			}
		} catch (e: unknown) {
			console.error('Flight search error:', e)
			toast.error(e instanceof Error ? e.message : 'Flight lookup failed')
		} finally {
			isSearching = false
		}
	}

	function handleScanSources() {
		isScanning = true
		try {
			const calFound = scanCalendarForFlights(calendarState.events)
			const mailFound = scanMailForFlights(mailState.threads)
			discoveredFlights = [...calFound, ...mailFound]
			if (discoveredFlights.length === 0) {
				toast.info('No upcoming flight booking emails or calendar events found')
			} else {
				toast.success(`Discovered ${discoveredFlights.length} flight reservation(s)`)
			}
		} catch (e) {
			console.error('Scan failed:', e)
			toast.error('Scan failed')
		} finally {
			isScanning = false
		}
	}

	async function handleAddCandidate(cand: DiscoveredFlightCandidate) {
		const apiKey = flightsState.settings.rapidApiKey
		if (apiKey) {
			// Try lookup via AeroDataBox
			try {
				toast.info(`Looking up ${cand.flightNumber}...`)
				const results = await flightService.searchAeroDataBox(
					cand.flightNumber,
					cand.date,
					apiKey
				)
				if (results.length > 0) {
					const first = results[0]
					if (cand.bookingReference) {
						first.bookingReference = cand.bookingReference
					}
					await flightsState.addFlight(first)
					onClose()
					return
				}
			} catch (e) {
				console.warn('API lookup for candidate failed, creating fallback:', e)
			}
		}

		// Fallback create candidate record directly
		const depGeo = getAirportByIata(cand.originIata || 'SYD')
		const arrGeo = getAirportByIata(cand.destinationIata || 'SIN')

		const depLat = depGeo?.lat ?? -33.9461
		const depLon = depGeo?.lon ?? 151.1772
		const arrLat = arrGeo?.lat ?? 1.3644
		const arrLon = arrGeo?.lon ?? 103.9915

		const distKm = calculateGreatCircleDistanceKm(depLat, depLon, arrLat, arrLon)
		const distNm = calculateGreatCircleDistanceNm(depLat, depLon, arrLat, arrLon)

		const flight: FlightRecord = {
			id: `fl-${cand.flightNumber}-${cand.date}-${Date.now().toString(36)}`,
			airline: {
				name: cand.airlineCode,
				iata: cand.airlineCode
			},
			flightNumber: cand.flightNumber,
			departure: {
				iata: cand.originIata || 'SYD',
				name: depGeo?.name || cand.originIata || 'Departure Airport',
				city: depGeo?.city || 'Origin',
				scheduledTime: `${cand.date}T10:00:00Z`,
				lat: depLat,
				lon: depLon
			},
			arrival: {
				iata: cand.destinationIata || 'SIN',
				name: arrGeo?.name || cand.destinationIata || 'Arrival Airport',
				city: arrGeo?.city || 'Destination',
				scheduledTime: `${cand.date}T18:00:00Z`,
				lat: arrLat,
				lon: arrLon
			},
			status: 'scheduled',
			aircraft: {
				model: 'Commercial Aircraft'
			},
			bookingReference: cand.bookingReference,
			greatCircleDistanceNm: distNm,
			greatCircleDistanceKm: distKm,
			durationMinutes: 480,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}

		await flightsState.addFlight(flight)
		onClose()
	}

	async function handleAddManual() {
		const depIata = manualDepIata.trim().toUpperCase()
		const arrIata = manualArrIata.trim().toUpperCase()

		const depGeo = getAirportByIata(depIata)
		const arrGeo = getAirportByIata(arrIata)

		const depLat = depGeo?.lat ?? 0
		const depLon = depGeo?.lon ?? 0
		const arrLat = arrGeo?.lat ?? 0
		const arrLon = arrGeo?.lon ?? 0

		const distKm = calculateGreatCircleDistanceKm(depLat, depLon, arrLat, arrLon)
		const distNm = calculateGreatCircleDistanceNm(depLat, depLon, arrLat, arrLon)

		const d1 = new Date(manualDepTime).getTime()
		const d2 = new Date(manualArrTime).getTime()
		const duration = d2 > d1 ? Math.round((d2 - d1) / 60000) : 360

		const flight: FlightRecord = {
			id: `fl-${manualFlightNo}-${Date.now().toString(36)}`,
			airline: {
				name: manualAirline,
				iata: manualFlightNo.slice(0, 2).toUpperCase()
			},
			flightNumber: manualFlightNo.toUpperCase().trim(),
			departure: {
				iata: depIata,
				name: depGeo?.name || depIata,
				city: depGeo?.city || depIata,
				scheduledTime: new Date(manualDepTime).toISOString(),
				lat: depLat,
				lon: depLon
			},
			arrival: {
				iata: arrIata,
				name: arrGeo?.name || arrIata,
				city: arrGeo?.city || arrIata,
				scheduledTime: new Date(manualArrTime).toISOString(),
				lat: arrLat,
				lon: arrLon
			},
			status: 'scheduled',
			aircraft: {
				model: manualAircraft
			},
			bookingReference: manualPnr || undefined,
			seat: manualSeat || undefined,
			greatCircleDistanceNm: distNm,
			greatCircleDistanceKm: distKm,
			durationMinutes: duration,
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString()
		}

		await flightsState.addFlight(flight)
		onClose()
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none"
	>
		<!-- Modal Window -->
		<div
			class="w-full max-w-xl rounded-2xl bg-bg-secondary border border-border shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
		>
			<!-- Top Modal Bar -->
			<div class="px-5 py-4 border-b border-border flex items-center justify-between">
				<div class="flex items-center gap-2">
					<PlaneIcon class="w-4 h-4 text-accent" />
					<span class="font-bold tracking-tight text-xs uppercase font-mono text-text">
						TRACK NEW FLIGHT
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

			<!-- Tabs -->
			<div class="px-5 pt-3 pb-1 border-b border-border flex items-center gap-2 font-mono text-xs">
				<button
					type="button"
					onclick={() => (activeTab = 'search')}
					class="pb-2 border-b-2 font-semibold transition-colors cursor-pointer {activeTab === 'search'
						? 'border-accent text-accent'
						: 'border-transparent text-text-muted hover:text-text'}"
				>
					AeroDataBox Search
				</button>
				<button
					type="button"
					onclick={() => {
						activeTab = 'autoScan'
						if (discoveredFlights.length === 0) handleScanSources()
					}}
					class="pb-2 border-b-2 font-semibold transition-colors cursor-pointer flex items-center gap-1.5 {activeTab === 'autoScan'
						? 'border-accent text-accent'
						: 'border-transparent text-text-muted hover:text-text'}"
				>
					<span>Auto-Scan Mail & Cal</span>
					{#if discoveredFlights.length > 0}
						<span class="bg-accent text-white px-1.5 py-0.2 rounded-full text-[10px]">
							{discoveredFlights.length}
						</span>
					{/if}
				</button>
				<button
					type="button"
					onclick={() => (activeTab = 'manual')}
					class="pb-2 border-b-2 font-semibold transition-colors cursor-pointer {activeTab === 'manual'
						? 'border-accent text-accent'
						: 'border-transparent text-text-muted hover:text-text'}"
				>
					Manual Entry
				</button>
			</div>

			<!-- Body -->
			<div class="p-5 flex-1 overflow-y-auto">
				{#if activeTab === 'search'}
					<div class="flex flex-col gap-4">
						<div class="grid grid-cols-2 gap-3 font-mono text-xs">
							<div>
								<label for="fl-no-input" class="block text-text-muted uppercase text-[10px] mb-1">
									Flight Number
								</label>
								<input
									id="fl-no-input"
									type="text"
									bind:value={flightNumber}
									placeholder="e.g. QF1, UA870"
									class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text font-mono uppercase focus:outline-none focus:border-accent"
								/>
							</div>
							<div>
								<label for="fl-date-input" class="block text-text-muted uppercase text-[10px] mb-1">
									Departure Date
								</label>
								<input
									id="fl-date-input"
									type="date"
									bind:value={flightDate}
									class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text font-mono focus:outline-none focus:border-accent"
								/>
							</div>
						</div>

						{#if !flightsState.settings.rapidApiKey}
							<div class="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs font-mono text-amber-600 dark:text-amber-400">
								AeroDataBox API key is missing. Enter it in Settings or use the Manual Entry / Auto-Scan tabs.
							</div>
						{/if}

						<button
							type="button"
							onclick={handleSearch}
							disabled={isSearching}
							class="w-full py-2.5 rounded-xl bg-accent text-white font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer shadow-xs disabled:opacity-50"
						>
							{#if isSearching}
								<RefreshCwIcon class="w-4 h-4 animate-spin" />
								<span>SEARCHING AERODATABOX...</span>
							{:else}
								<span>LOOKUP FLIGHT</span>
							{/if}
						</button>

						<!-- Search Results List -->
						{#if searchResults.length > 0}
							<div class="mt-2 flex flex-col gap-2">
								<div class="text-[10px] font-mono uppercase text-text-muted">
									AVAILABLE FLIGHTS ({searchResults.length})
								</div>
								{#each searchResults as item (item.id)}
									<div
										class="p-3 rounded-xl border border-border bg-bg flex items-center justify-between font-mono"
									>
										<div class="flex flex-col gap-0.5">
											<div class="flex items-center gap-2">
												<span class="font-bold text-text">{item.flightNumber}</span>
												<span class="text-text-muted text-xs">({item.airline.name})</span>
											</div>
											<div class="text-xs text-text">
												{item.departure.iata} ➔ {item.arrival.iata}
											</div>
											<div class="text-[10px] text-text-muted">
												{new Date(item.departure.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {item.aircraft.model}
											</div>
										</div>
										<button
											type="button"
											onclick={async () => {
												await flightsState.addFlight(item)
												onClose()
											}}
											class="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-bold font-mono hover:opacity-90 cursor-pointer"
										>
											TRACK
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else if activeTab === 'autoScan'}
					<div class="flex flex-col gap-4">
						<div class="flex items-center justify-between font-mono text-xs">
							<span class="text-text-muted">Scanning connected Gmail & Calendar...</span>
							<button
								type="button"
								onclick={handleScanSources}
								disabled={isScanning}
								class="px-2.5 py-1 rounded border border-border bg-bg hover:bg-bg-emphasis text-[11px] flex items-center gap-1.5 cursor-pointer"
							>
								<RefreshCwIcon class="w-3 h-3 {isScanning ? 'animate-spin text-accent' : ''}" />
								<span>RE-SCAN</span>
							</button>
						</div>

						{#if discoveredFlights.length === 0}
							<div class="p-8 text-center text-xs font-mono text-text-muted flex flex-col items-center gap-2">
								<span>No flight confirmations found in recent emails or events.</span>
								<span class="text-[10px] opacity-70">
									Make sure Gmail or Google Calendar is connected in Settings.
								</span>
							</div>
						{:else}
							<div class="flex flex-col gap-2">
								{#each discoveredFlights as cand, idx (idx)}
									<div
										class="p-3 rounded-xl border border-border bg-bg flex items-center justify-between font-mono text-xs"
									>
										<div class="flex flex-col gap-1">
											<div class="flex items-center gap-2">
												<span class="font-bold text-accent">{cand.flightNumber}</span>
												{#if cand.source === 'calendar'}
													<CalendarIcon class="w-3.5 h-3.5 text-text-muted" />
												{:else}
													<MailIcon class="w-3.5 h-3.5 text-text-muted" />
												{/if}
												<span class="text-[10px] text-text-muted truncate max-w-[180px]">
													{cand.sourceTitle}
												</span>
											</div>
											<div class="text-[11px] text-text">
												Date: {cand.date}
												{#if cand.bookingReference}
													• PNR: <strong>{cand.bookingReference}</strong>
												{/if}
											</div>
										</div>

										<button
											type="button"
											onclick={() => handleAddCandidate(cand)}
											class="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-bold hover:opacity-90 cursor-pointer"
										>
											IMPORT
										</button>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				{:else if activeTab === 'manual'}
					<div class="flex flex-col gap-3 font-mono text-xs">
						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="manual-airline-input" class="block text-text-muted uppercase text-[10px] mb-1">Airline</label>
								<input
									id="manual-airline-input"
									type="text"
									bind:value={manualAirline}
									class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text font-mono"
								/>
							</div>
							<div>
								<label for="manual-flight-no-input" class="block text-text-muted uppercase text-[10px] mb-1">Flight Number</label>
								<input
									id="manual-flight-no-input"
									type="text"
									bind:value={manualFlightNo}
									class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text font-mono uppercase"
								/>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="manual-dep-iata-input" class="block text-text-muted uppercase text-[10px] mb-1">Departure IATA</label>
								<input
									id="manual-dep-iata-input"
									type="text"
									maxlength="3"
									bind:value={manualDepIata}
									class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text font-mono uppercase font-bold"
								/>
							</div>
							<div>
								<label for="manual-arr-iata-input" class="block text-text-muted uppercase text-[10px] mb-1">Arrival IATA</label>
								<input
									id="manual-arr-iata-input"
									type="text"
									maxlength="3"
									bind:value={manualArrIata}
									class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text font-mono uppercase font-bold"
								/>
							</div>
						</div>

						<div class="grid grid-cols-2 gap-3">
							<div>
								<label for="manual-dep-time-input" class="block text-text-muted uppercase text-[10px] mb-1">Departure Time</label>
								<input
									id="manual-dep-time-input"
									type="datetime-local"
									bind:value={manualDepTime}
									class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text font-mono"
								/>
							</div>
							<div>
								<label for="manual-arr-time-input" class="block text-text-muted uppercase text-[10px] mb-1">Arrival Time</label>
								<input
									id="manual-arr-time-input"
									type="datetime-local"
									bind:value={manualArrTime}
									class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text font-mono"
								/>
							</div>
						</div>

						<div class="grid grid-cols-3 gap-3">
							<div>
								<label for="manual-aircraft-input" class="block text-text-muted uppercase text-[10px] mb-1">Aircraft</label>
								<input
									id="manual-aircraft-input"
									type="text"
									bind:value={manualAircraft}
									class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text font-mono"
								/>
							</div>
							<div>
								<label for="manual-pnr-input" class="block text-text-muted uppercase text-[10px] mb-1">PNR / Ref</label>
								<input
									id="manual-pnr-input"
									type="text"
									bind:value={manualPnr}
									placeholder="e.g. 6XYZ9Q"
									class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text font-mono uppercase"
								/>
							</div>
							<div>
								<label for="manual-seat-input" class="block text-text-muted uppercase text-[10px] mb-1">Seat</label>
								<input
									id="manual-seat-input"
									type="text"
									bind:value={manualSeat}
									placeholder="e.g. 1A"
									class="w-full px-3 py-2 rounded-lg bg-bg border border-border text-text font-mono uppercase"
								/>
							</div>
						</div>

						<button
							type="button"
							onclick={handleAddManual}
							class="mt-2 w-full py-2.5 rounded-xl bg-accent text-white font-mono text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity cursor-pointer shadow-xs"
						>
							ADD TO LOGBOOK
						</button>
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
