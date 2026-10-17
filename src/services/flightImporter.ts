import type { CalendarEvent } from '../types/calendar'
import type { MailThread } from '../types/mail'

export interface DiscoveredFlightCandidate {
	source: 'calendar' | 'email'
	sourceId: string
	sourceTitle: string
	airlineCode: string
	flightNumber: string // e.g. "QF1"
	date: string // YYYY-MM-DD
	bookingReference?: string
	originIata?: string
	destinationIata?: string
	rawText: string
}

// Well known airline IATA codes
const AIRLINE_CODES = [
	'QF', 'VA', 'JQ', 'NZ', 'SQ', 'TG', 'MH', 'GA', 'CX', 'JL', 'NH', 'KE', 'OZ',
	'BA', 'AF', 'KL', 'LH', 'LX', 'OS', 'IB', 'AZ', 'AY', 'SK', 'EI', 'VS', 'FR', 'U2',
	'AA', 'UA', 'DL', 'WN', 'B6', 'AS', 'NK', 'F9', 'AC', 'WS', 'AM', 'LA', 'AV',
	'EK', 'QR', 'EY', 'TK', 'SV', 'MS', 'ET', 'SA'
]

const AIRLINE_REGEX = new RegExp(
	`\\b(${AIRLINE_CODES.join('|')})\\s*(\\d{1,4})\\b`,
	'gi'
)

// PNR / Confirmation code regex
const PNR_REGEX = /(?:booking\s*ref(?:erence)?|confirmation\s*(?:code|number)?|record\s*locator|pnr)[\s:#]+([A-Z0-9]{5,7})\b/i

// Route regex e.g. "SYD to LHR" or "SYD - LHR" or "SYD -> LHR"
const ROUTE_REGEX = /\b([A-Z]{3})\s*(?:to|->|-|➔|✈)\s*([A-Z]{3})\b/i

export function parseFlightCandidateFromText(
	text: string,
	dateFallback: string,
	source: 'calendar' | 'email',
	sourceId: string,
	sourceTitle: string
): DiscoveredFlightCandidate[] {
	if (!text) return []

	const candidates: DiscoveredFlightCandidate[] = []
	const matches = Array.from(text.matchAll(AIRLINE_REGEX))

	for (const match of matches) {
		const airline = match[1].toUpperCase()
		const number = match[2]
		const fullFlight = `${airline}${number}`

		// Extract PNR if nearby
		const pnrMatch = text.match(PNR_REGEX)
		const bookingRef = pnrMatch ? pnrMatch[1].toUpperCase() : undefined

		// Extract Route if present
		const routeMatch = text.match(ROUTE_REGEX)
		const origin = routeMatch ? routeMatch[1].toUpperCase() : undefined
		const dest = routeMatch ? routeMatch[2].toUpperCase() : undefined

		// Date format YYYY-MM-DD
		let date = dateFallback
		if (date.includes('T')) {
			date = date.split('T')[0]
		}

		candidates.push({
			source,
			sourceId,
			sourceTitle,
			airlineCode: airline,
			flightNumber: fullFlight,
			date,
			bookingReference: bookingRef,
			originIata: origin,
			destinationIata: dest,
			rawText: match[0]
		})
	}

	return candidates
}

export function scanCalendarForFlights(
	events: CalendarEvent[]
): DiscoveredFlightCandidate[] {
	const results: DiscoveredFlightCandidate[] = []
	for (const ev of events) {
		const combined = `${ev.title || ''} ${ev.description || ''} ${ev.location || ''}`
		const dateFallback = ev.startTime || new Date().toISOString()
		const found = parseFlightCandidateFromText(
			combined,
			dateFallback,
			'calendar',
			ev.id,
			ev.title
		)
		results.push(...found)
	}
	return results
}

export function scanMailForFlights(
	threads: MailThread[]
): DiscoveredFlightCandidate[] {
	const results: DiscoveredFlightCandidate[] = []
	for (const th of threads) {
		const combined = `${th.subject || ''} ${th.snippet || ''}`
		const dateFallback = th.date || new Date().toISOString()
		const found = parseFlightCandidateFromText(
			combined,
			dateFallback,
			'email',
			th.id,
			th.subject
		)
		results.push(...found)
	}
	return results
}
