import { invoke } from '@tauri-apps/api/core'
import type { FlightRecord, LiveTelemetry, FlightStatus } from '../types/flight'
import { getAirportByIata } from '../lib/airports'
import {
	calculateGreatCircleDistanceKm,
	calculateGreatCircleDistanceNm
} from '../lib/flightMath'

export async function getVaultFlights(): Promise<FlightRecord[]> {
	try {
		const raw: unknown = await invoke('get_flights')
		if (Array.isArray(raw)) {
			return raw as FlightRecord[]
		}
		return []
	} catch (e) {
		console.warn('Failed to get flights from vault:', e)
		return []
	}
}

export async function saveVaultFlights(flights: FlightRecord[]): Promise<void> {
	await invoke('save_flights', { flights })
}

export async function proxyFetch(
	url: string,
	headers?: Record<string, string>
): Promise<string> {
	return invoke('flight_proxy_fetch', { url, headers })
}

interface AeroDataBoxFlightResponse {
	greatCircleDistance?: {
		meter?: number
		km?: number
		mile?: number
		nm?: number
	}
	departure?: {
		airport?: {
			iata?: string
			icao?: string
			name?: string
			municipalityName?: string
			countryCode?: string
			location?: { lat?: number; lon?: number }
		}
		scheduledTime?: { utc?: string; local?: string }
		estimatedTime?: { utc?: string; local?: string }
		actualTime?: { utc?: string; local?: string }
		terminal?: string
		gate?: string
		checkInDesk?: string
	}
	arrival?: {
		airport?: {
			iata?: string
			icao?: string
			name?: string
			municipalityName?: string
			countryCode?: string
			location?: { lat?: number; lon?: number }
		}
		scheduledTime?: { utc?: string; local?: string }
		estimatedTime?: { utc?: string; local?: string }
		actualTime?: { utc?: string; local?: string }
		terminal?: string
		gate?: string
		baggageBelt?: string
	}
	airline?: {
		name?: string
		iata?: string
		icao?: string
	}
	aircraft?: {
		model?: string
		modelCode?: string
		reg?: string
		modeS?: string // ICAO24 hex
	}
	status?: string
	number?: string
	callSign?: string
}

/**
 * Searches for a flight via AeroDataBox API on RapidAPI
 */
export async function searchAeroDataBox(
	flightNumber: string,
	dateStr: string, // YYYY-MM-DD
	rapidApiKey: string
): Promise<FlightRecord[]> {
	const cleanNumber = flightNumber.trim().replace(/\s+/g, '')
	if (!rapidApiKey) {
		throw new Error('RapidAPI Key is not configured in Settings.')
	}

	const url = `https://aerodatabox.p.rapidapi.com/flights/number/${cleanNumber}/${dateStr}`
	const headers = {
		'x-rapidapi-host': 'aerodatabox.p.rapidapi.com',
		'x-rapidapi-key': rapidApiKey
	}

	const rawJson = await proxyFetch(url, headers)
	const parsed: unknown = JSON.parse(rawJson)

	const items: AeroDataBoxFlightResponse[] = Array.isArray(parsed)
		? parsed
		: [parsed as AeroDataBoxFlightResponse]

	return items
		.filter((f) => f && f.departure?.airport?.iata && f.arrival?.airport?.iata)
		.map((f, idx) => {
			const depIata = (f.departure?.airport?.iata || '').toUpperCase()
			const arrIata = (f.arrival?.airport?.iata || '').toUpperCase()

			const depGeo = getAirportByIata(depIata)
			const arrGeo = getAirportByIata(arrIata)

			const depLat = f.departure?.airport?.location?.lat ?? depGeo?.lat ?? 0
			const depLon = f.departure?.airport?.location?.lon ?? depGeo?.lon ?? 0
			const arrLat = f.arrival?.airport?.location?.lat ?? arrGeo?.lat ?? 0
			const arrLon = f.arrival?.airport?.location?.lon ?? arrGeo?.lon ?? 0

			const distKm =
				f.greatCircleDistance?.km ??
				calculateGreatCircleDistanceKm(depLat, depLon, arrLat, arrLon)
			const distNm =
				f.greatCircleDistance?.nm ??
				calculateGreatCircleDistanceNm(depLat, depLon, arrLat, arrLon)

			const depSched =
				f.departure?.scheduledTime?.local ||
				f.departure?.scheduledTime?.utc ||
				new Date().toISOString()
			const arrSched =
				f.arrival?.scheduledTime?.local ||
				f.arrival?.scheduledTime?.utc ||
				new Date().toISOString()

			const schedDepMs = new Date(depSched).getTime()
			const schedArrMs = new Date(arrSched).getTime()
			const durationMinutes =
				schedArrMs > schedDepMs
					? Math.round((schedArrMs - schedDepMs) / 60000)
					: Math.round(distKm / 14) // ~850 km/h cruising estimate

			let status: FlightStatus = 'scheduled'
			const rawStatus = (f.status || '').toLowerCase()
			if (rawStatus.includes('land') || rawStatus.includes('arrived')) {
				status = 'landed'
			} else if (rawStatus.includes('active') || rawStatus.includes('en-route') || rawStatus.includes('airborne')) {
				status = 'active'
			} else if (rawStatus.includes('delay')) {
				status = 'delayed'
			} else if (rawStatus.includes('cancel')) {
				status = 'cancelled'
			} else if (rawStatus.includes('board')) {
				status = 'boarding'
			} else if (rawStatus.includes('depart')) {
				status = 'departed'
			}

			const record: FlightRecord = {
				id: `fl-${cleanNumber}-${dateStr}-${idx}-${Date.now().toString(36)}`,
				airline: {
					name: f.airline?.name || cleanNumber.slice(0, 2),
					iata: f.airline?.iata || cleanNumber.slice(0, 2),
					icao: f.airline?.icao
				},
				flightNumber: f.number || cleanNumber,
				callsign: f.callSign,
				departure: {
					iata: depIata,
					icao: f.departure?.airport?.icao || depGeo?.iata,
					name: f.departure?.airport?.name || depGeo?.name || depIata,
					city: f.departure?.airport?.municipalityName || depGeo?.city || depIata,
					country: f.departure?.airport?.countryCode || depGeo?.country,
					terminal: f.departure?.terminal,
					gate: f.departure?.gate,
					scheduledTime: depSched,
					estimatedTime: f.departure?.estimatedTime?.local || f.departure?.estimatedTime?.utc,
					actualTime: f.departure?.actualTime?.local || f.departure?.actualTime?.utc,
					lat: depLat,
					lon: depLon
				},
				arrival: {
					iata: arrIata,
					icao: f.arrival?.airport?.icao || arrGeo?.iata,
					name: f.arrival?.airport?.name || arrGeo?.name || arrIata,
					city: f.arrival?.airport?.municipalityName || arrGeo?.city || arrIata,
					country: f.arrival?.airport?.countryCode || arrGeo?.country,
					terminal: f.arrival?.terminal,
					gate: f.arrival?.gate,
					baggage: f.arrival?.baggageBelt,
					scheduledTime: arrSched,
					estimatedTime: f.arrival?.estimatedTime?.local || f.arrival?.estimatedTime?.utc,
					actualTime: f.arrival?.actualTime?.local || f.arrival?.actualTime?.utc,
					lat: arrLat,
					lon: arrLon
				},
				status,
				statusText: f.status,
				aircraft: {
					model: f.aircraft?.model || 'Commercial Aircraft',
					modelCode: f.aircraft?.modelCode,
					registration: f.aircraft?.reg,
					icao24: f.aircraft?.modeS?.toLowerCase()
				},
				greatCircleDistanceNm: distNm,
				greatCircleDistanceKm: distKm,
				durationMinutes,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString()
			}

			return record
		})
}

interface OpenSkyResponse {
	time: number
	states: Array<
		[
			string, // 0: icao24
			string, // 1: callsign
			string, // 2: origin_country
			number, // 3: time_position
			number, // 4: last_contact
			number, // 5: longitude
			number, // 6: latitude
			number | null, // 7: baro_altitude (meters)
			boolean, // 8: on_ground
			number | null, // 9: velocity (m/s)
			number | null, // 10: true_track (deg)
			number | null, // 11: vertical_rate (m/s)
			number[] | null, // 12: sensors
			number | null, // 13: geo_altitude (meters)
			string | null, // 14: squawk
			boolean, // 15: spi
			number // 16: position_source
		]
	> | null
}

/**
 * Fetches real-time live ADS-B telemetry from OpenSky Network using ICAO24 transponder hex.
 * Works anonymously by default, or with Basic Auth credentials if configured for higher rate limits.
 */
export async function fetchOpenSkyTelemetry(
	icao24: string,
	credentials?: { username?: string; password?: string }
): Promise<LiveTelemetry | null> {
	if (!icao24 || icao24.trim().length === 0) return null
	const cleanHex = icao24.trim().toLowerCase()
	const url = `https://opensky-network.org/api/states/all?icao24=${cleanHex}`

	let headers: Record<string, string> | undefined
	if (credentials?.username && credentials?.password) {
		const authString = `${credentials.username}:${credentials.password}`
		headers = {
			Authorization: `Basic ${btoa(authString)}`
		}
	}

	try {
		const rawJson = await proxyFetch(url, headers)
		const parsed = JSON.parse(rawJson) as OpenSkyResponse

		if (!parsed || !parsed.states || parsed.states.length === 0) {
			return null
		}

		const state = parsed.states[0]
		const lon = state[5]
		const lat = state[6]
		if (lat === null || lon === null) return null

		const altMeters = state[7] ?? state[13] ?? 0
		const speedMs = state[9] ?? 0
		const trackDeg = state[10] ?? 0
		const vertRateMs = state[11] ?? 0

		return {
			latitude: lat,
			longitude: lon,
			altitudeFt: Math.round(altMeters * 3.28084),
			speedKts: Math.round(speedMs * 1.94384),
			heading: Math.round(trackDeg),
			verticalRateFpm: Math.round(vertRateMs * 196.85),
			onGround: state[8],
			lastContact: state[4],
			lastUpdated: new Date().toISOString()
		}
	} catch (e) {
		console.warn(`OpenSky telemetry fetch failed for ${icao24}:`, e)
		return null
	}
}
