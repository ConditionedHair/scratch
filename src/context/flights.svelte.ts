import { toast } from 'svelte-sonner'
import type {
	FlightRecord,
	FlightStats,
	FlightSettingsConfig
} from '../types/flight'
import * as flightService from '../services/flights'
import { getSettings, updateSettings as updateNoteSettings } from '../services/notes'

export class FlightsState {
	flights = $state<FlightRecord[]>([])
	selectedFlightId = $state<string | null>(null)
	isLoading = $state<boolean>(false)
	isRefreshing = $state<boolean>(false)
	error = $state<string | null>(null)
	hasLoaded = $state<boolean>(false)

	settings = $state<FlightSettingsConfig>({
		rapidApiKey: '',
		autoRefreshActive: true,
		refreshIntervalMinutes: 15,
		metricUnits: false
	})

	constructor() {
		// Auto-load on mount
		void this.init()
	}

	async init(): Promise<void> {
		this.isLoading = true
		try {
			// Load settings from note settings
			const noteSettings = await getSettings()
			if (noteSettings.flightSettings) {
				const fs = noteSettings.flightSettings as Partial<FlightSettingsConfig>
				this.settings = {
					rapidApiKey: fs.rapidApiKey || '',
					openSkyUsername: fs.openSkyUsername || '',
					openSkyPassword: fs.openSkyPassword || '',
					autoRefreshActive: fs.autoRefreshActive ?? true,
					refreshIntervalMinutes: fs.refreshIntervalMinutes ?? 15,
					metricUnits: fs.metricUnits ?? false
				}
			}

			// Load flights from vault
			const vaultFlights = await flightService.getVaultFlights()
			this.flights = vaultFlights
			if (vaultFlights.length > 0 && !this.selectedFlightId) {
				// Select first active or first upcoming flight by default
				const active = vaultFlights.find((f) => f.status === 'active' || f.status === 'boarding' || f.status === 'departed')
				this.selectedFlightId = active ? active.id : vaultFlights[0].id
			}
			this.hasLoaded = true
		} catch (e) {
			console.error('Failed to initialize flights state:', e)
			this.error = 'Failed to load flights'
		} finally {
			this.isLoading = false
		}
	}

	// Derived currently selected flight
	currentFlight = $derived<FlightRecord | null>(
		this.flights.find((f) => f.id === this.selectedFlightId) ??
			(this.flights.length > 0 ? this.flights[0] : null)
	)

	// Derived categorized lists
	activeFlights = $derived<FlightRecord[]>(
		this.flights.filter(
			(f) =>
				f.status === 'active' ||
				f.status === 'boarding' ||
				f.status === 'departed'
		)
	)

	upcomingFlights = $derived<FlightRecord[]>(
		this.flights.filter(
			(f) =>
				f.status === 'scheduled' ||
				(f.status === 'delayed' && !f.liveTelemetry?.onGround)
		)
	)

	pastFlights = $derived<FlightRecord[]>(
		this.flights.filter(
			(f) => f.status === 'landed' || f.status === 'cancelled'
		)
	)

	// Derived Flighty-style passport statistics
	stats = $derived.by<FlightStats>(() => {
		let totalMiles = 0
		let totalKm = 0
		let totalDurationMinutes = 0
		const airports = new Set<string>()
		const countries = new Set<string>()
		const aircraftMap: Record<string, number> = {}
		const airlinesMap: Record<string, number> = {}

		for (const f of this.flights) {
			totalMiles += f.greatCircleDistanceNm ?? 0
			totalKm += f.greatCircleDistanceKm ?? 0
			totalDurationMinutes += f.durationMinutes ?? 0

			if (f.departure.iata) airports.add(f.departure.iata)
			if (f.arrival.iata) airports.add(f.arrival.iata)
			if (f.departure.country) countries.add(f.departure.country)
			if (f.arrival.country) countries.add(f.arrival.country)

			const acModel = f.aircraft.model || 'Unknown Aircraft'
			aircraftMap[acModel] = (aircraftMap[acModel] || 0) + 1

			const alName = f.airline.name || f.airline.iata
			airlinesMap[alName] = (airlinesMap[alName] || 0) + 1
		}

		return {
			totalFlights: this.flights.length,
			totalMiles,
			totalKm,
			totalDurationMinutes,
			airportsVisited: Array.from(airports),
			countriesVisited: Array.from(countries),
			aircraftTypes: aircraftMap,
			airlines: airlinesMap
		}
	})

	selectFlight(id: string | null) {
		this.selectedFlightId = id
	}

	async addFlight(flight: FlightRecord): Promise<void> {
		// Avoid duplicate by flightNumber and departure date
		const exists = this.flights.some(
			(f) =>
				f.flightNumber === flight.flightNumber &&
				f.departure.scheduledTime.slice(0, 10) ===
					flight.departure.scheduledTime.slice(0, 10)
		)

		if (exists) {
			toast.info(`Flight ${flight.flightNumber} already exists in your logbook`)
			return
		}

		const updated = [flight, ...this.flights]
		this.flights = updated
		this.selectedFlightId = flight.id
		await flightService.saveVaultFlights(updated)
		toast.success(`Added ${flight.flightNumber} (${flight.departure.iata} ➔ ${flight.arrival.iata})`)

		// Attempt immediate live telemetry check or position calculation silently
		void this.refreshTelemetry(flight.id, true)
	}

	async updateFlight(id: string, updates: Partial<FlightRecord>): Promise<void> {
		this.flights = this.flights.map((f) => {
			if (f.id === id) {
				return { ...f, ...updates, updatedAt: new Date().toISOString() }
			}
			return f
		})
		await flightService.saveVaultFlights(this.flights)
	}

	async deleteFlight(id: string): Promise<void> {
		const target = this.flights.find((f) => f.id === id)
		this.flights = this.flights.filter((f) => f.id !== id)
		if (this.selectedFlightId === id) {
			this.selectedFlightId = this.flights.length > 0 ? this.flights[0].id : null
		}
		await flightService.saveVaultFlights(this.flights)
		if (target) {
			toast.success(`Removed ${target.flightNumber}`)
		}
	}

	/**
	 * Refreshes live OpenSky ADS-B telemetry for a flight.
	 * If ICAO24 is unassigned or out of coverage, falls back to:
	 * 1. Checking AeroDataBox if an airframe has been assigned recently.
	 * 2. Searching OpenSky by airline callsign in the route's bounding box.
	 * 3. Calculating dead-reckoning Great-Circle telemetry if airborne.
	 */
	async refreshTelemetry(flightId: string, silent = false): Promise<void> {
		const flight = this.flights.find((f) => f.id === flightId)
		if (!flight) return

		this.isRefreshing = true
		try {
			let icao24 = flight.aircraft.icao24?.trim().toLowerCase()

			// 1. If no icao24, check if RapidAPI AeroDataBox now has an assigned registration/modeS
			if (!icao24 && this.settings.rapidApiKey) {
				try {
					const dateStr = (flight.departure.scheduledTime || new Date().toISOString()).slice(0, 10)
					const freshRecords = await flightService.searchAeroDataBox(
						flight.flightNumber,
						dateStr,
						this.settings.rapidApiKey
					)
					const matched = freshRecords.find(
						(r) =>
							r.departure.iata === flight.departure.iata &&
							r.arrival.iata === flight.arrival.iata
					)
					if (matched) {
						// Update any fresh flight details (times, gate, terminal, baggage, aircraft)
						const updates: Partial<FlightRecord> = {
							departure: { ...flight.departure, ...matched.departure },
							arrival: { ...flight.arrival, ...matched.arrival },
							aircraft: { ...flight.aircraft, ...matched.aircraft },
							status: matched.status
						}
						if (matched.aircraft.icao24) {
							icao24 = matched.aircraft.icao24.trim().toLowerCase()
						}
						await this.updateFlight(flightId, updates)
					}
				} catch (e) {
					console.warn('AeroDataBox recheck failed:', e)
				}
			}

			// 2. If icao24 is available, try querying OpenSky by Mode-S hex
			if (icao24) {
				const telemetry = await flightService.fetchOpenSkyTelemetry(icao24, {
					username: this.settings.openSkyUsername,
					password: this.settings.openSkyPassword
				})
				if (telemetry) {
					await this.updateFlight(flightId, {
						liveTelemetry: telemetry,
						status: telemetry.onGround
							? flight.status === 'scheduled'
								? 'boarding'
								: 'landed'
							: 'active'
					})
					if (!silent) {
						toast.success(`Live radar signal acquired for ${flight.flightNumber} (${icao24.toUpperCase()})`)
					}
					return
				}
			}

			// 3. If no icao24 or OpenSky returned no states for icao24, attempt search by airline callsign
			const depLat = flight.departure.lat ?? 0
			const depLon = flight.departure.lon ?? 0
			const arrLat = flight.arrival.lat ?? 0
			const arrLon = flight.arrival.lon ?? 0

			if (depLat !== 0 || arrLat !== 0) {
				const bounds = {
					minLat: Math.min(depLat, arrLat),
					maxLat: Math.max(depLat, arrLat),
					minLon: Math.min(depLon, arrLon),
					maxLon: Math.max(depLon, arrLon)
				}
				const callsignMatch = await flightService.findOpenSkyAircraftByCallsign(
					flight.flightNumber,
					flight.airline.iata,
					bounds,
					{
						username: this.settings.openSkyUsername,
						password: this.settings.openSkyPassword
					}
				)
				if (callsignMatch) {
					await this.updateFlight(flightId, {
						aircraft: {
							...flight.aircraft,
							icao24: callsignMatch.icao24
						},
						liveTelemetry: callsignMatch.telemetry,
						status: callsignMatch.telemetry.onGround
							? flight.status === 'scheduled'
								? 'boarding'
								: 'landed'
							: 'active'
					})
					if (!silent) {
						toast.success(
							`Transponder ${callsignMatch.icao24.toUpperCase()} matched via callsign for ${flight.flightNumber}`
						)
					}
					return
				}
			}

			// 4. Fallback to Dead-Reckoning calculation based on flight schedule
			const deadReckoning = flightService.calculateDeadReckoningTelemetry(flight)

			if (deadReckoning.stage === 'enroute') {
				await this.updateFlight(flightId, {
					liveTelemetry: deadReckoning.telemetry,
					status: 'active'
				})
				if (!silent) {
					if (icao24) {
						toast.info(`ADS-B signal out of receiver coverage • Great-Circle track active`)
					} else {
						toast.info(`Aircraft airframe unassigned by airline • Great-Circle track active`)
					}
				}
			} else if (deadReckoning.stage === 'scheduled') {
				let timeFormatted = '--:--'
				try {
					if (flight.departure.scheduledTime) {
						timeFormatted = new Date(flight.departure.scheduledTime).toLocaleTimeString([], {
							hour: '2-digit',
							minute: '2-digit'
						})
					}
				} catch {
					// ignore
				}
				if (!silent) {
					toast.info(
						`Flight scheduled for ${timeFormatted} • Aircraft airframe unassigned by airline`
					)
				}
			} else {
				// Landed / arrived
				await this.updateFlight(flightId, {
					status: 'landed',
					liveTelemetry: deadReckoning.telemetry
				})
				if (!silent) {
					toast.info(`Flight completed • No active radar signal`)
				}
			}
		} catch (e) {
			console.warn('Telemetry refresh error:', e)
			if (!silent) {
				toast.error('Failed to update radar telemetry')
			}
		} finally {
			this.isRefreshing = false
		}
	}

	async updateFlightSettings(newSettings: Partial<FlightSettingsConfig>): Promise<void> {
		this.settings = { ...this.settings, ...newSettings }
		try {
			const noteSettings = await getSettings()
			await updateNoteSettings({
				...noteSettings,
				flightSettings: this.settings as unknown as Record<string, unknown>
			})
			toast.success('Flight settings updated')
		} catch (e) {
			console.error('Failed to persist flight settings:', e)
			toast.error('Failed to save settings')
		}
	}
}

export const flightsState = new FlightsState()
