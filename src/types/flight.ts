export type FlightStatus =
	| 'scheduled'
	| 'boarding'
	| 'departed'
	| 'active'
	| 'landed'
	| 'delayed'
	| 'cancelled'
	| 'diverted'

export interface AirportInfo {
	iata: string
	icao?: string
	name: string
	city: string
	country?: string
	terminal?: string
	gate?: string
	baggage?: string
	scheduledTime: string // ISO 8601 string
	estimatedTime?: string
	actualTime?: string
	timezone?: string
	lat?: number
	lon?: number
}

export interface AircraftInfo {
	model: string // e.g. "Airbus A350-1000" or "Boeing 787-9"
	modelCode?: string // e.g. "A35K" or "B789"
	registration?: string // e.g. "VH-ZNK"
	icao24?: string // 24-bit ICAO transponder hex (e.g. "7c6c82") for OpenSky tracking
	ageYears?: number
}

export interface LiveTelemetry {
	latitude: number
	longitude: number
	altitudeFt: number
	speedKts: number
	heading: number // 0 - 360 degrees
	verticalRateFpm: number
	onGround: boolean
	lastContact: number // unix timestamp
	lastUpdated: string // ISO 8601
}

export interface InboundFlightInfo {
	flightNumber: string
	originIata: string
	originName?: string
	status: FlightStatus
	scheduledArrival: string
	estimatedArrival?: string
	actualArrival?: string
	delayMinutes?: number
	isDelayed: boolean
}

export interface FlightRecord {
	id: string
	airline: {
		name: string
		iata: string
		icao?: string
	}
	flightNumber: string // e.g. "QF 1"
	callsign?: string // ATC callsign e.g. "QFA1"
	departure: AirportInfo
	arrival: AirportInfo
	status: FlightStatus
	statusText?: string // e.g. "Delayed 25m" or "En Route"
	aircraft: AircraftInfo
	liveTelemetry?: LiveTelemetry
	inboundFlight?: InboundFlightInfo
	bookingReference?: string // PNR
	seat?: string
	passenger?: string
	notes?: string
	greatCircleDistanceNm?: number
	greatCircleDistanceKm?: number
	durationMinutes?: number
	createdAt: string
	updatedAt: string
}

export interface FlightStats {
	totalFlights: number
	totalMiles: number
	totalKm: number
	totalDurationMinutes: number
	airportsVisited: string[]
	countriesVisited: string[]
	aircraftTypes: Record<string, number>
	airlines: Record<string, number>
}

export interface FlightSettingsConfig {
	rapidApiKey?: string
	autoRefreshActive: boolean
	refreshIntervalMinutes: number // default 15
	metricUnits: boolean // true = km/m, false = miles/ft
}
