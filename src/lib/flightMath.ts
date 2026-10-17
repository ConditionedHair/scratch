export interface GeoPoint {
	lat: number
	lon: number
}

const EARTH_RADIUS_KM = 6371
const KM_TO_NM = 0.539957

function toRadians(degrees: number): number {
	return (degrees * Math.PI) / 180
}

function toDegrees(radians: number): number {
	return (radians * 180) / Math.PI
}

/**
 * Calculates Great-Circle distance between two points using the Haversine formula.
 */
export function calculateGreatCircleDistanceKm(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number {
	const dLat = toRadians(lat2 - lat1)
	const dLon = toRadians(lon2 - lon1)
	const rLat1 = toRadians(lat1)
	const rLat2 = toRadians(lat2)

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(rLat1) * Math.cos(rLat2)
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
	return Math.round(EARTH_RADIUS_KM * c)
}

export function calculateGreatCircleDistanceNm(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number {
	return Math.round(calculateGreatCircleDistanceKm(lat1, lon1, lat2, lon2) * KM_TO_NM)
}

/**
 * Computes initial compass bearing (0 - 360 deg) from point A to point B.
 */
export function calculateBearing(
	lat1: number,
	lon1: number,
	lat2: number,
	lon2: number
): number {
	const rLat1 = toRadians(lat1)
	const rLat2 = toRadians(lat2)
	const dLon = toRadians(lon2 - lon1)

	const y = Math.sin(dLon) * Math.cos(rLat2)
	const x =
		Math.cos(rLat1) * Math.sin(rLat2) -
		Math.sin(rLat1) * Math.cos(rLat2) * Math.cos(dLon)
	const brng = toDegrees(Math.atan2(y, x))
	return (Math.round(brng) + 360) % 360
}

/**
 * Generates N intermediate Great-Circle waypoints between two points for smooth radar curved arcs.
 */
export function generateGreatCircleArc(
	start: GeoPoint,
	end: GeoPoint,
	numPoints: number = 60
): GeoPoint[] {
	const points: GeoPoint[] = []
	const rLat1 = toRadians(start.lat)
	const rLon1 = toRadians(start.lon)
	const rLat2 = toRadians(end.lat)
	const rLon2 = toRadians(end.lon)

	const d =
		2 *
		Math.asin(
			Math.sqrt(
				Math.pow(Math.sin((rLat1 - rLat2) / 2), 2) +
					Math.cos(rLat1) *
						Math.cos(rLat2) *
						Math.pow(Math.sin((rLon1 - rLon2) / 2), 2)
			)
		)

	if (d === 0) {
		return [start, end]
	}

	for (let i = 0; i <= numPoints; i++) {
		const f = i / numPoints
		const a = Math.sin((1 - f) * d) / Math.sin(d)
		const b = Math.sin(f * d) / Math.sin(d)
		const x =
			a * Math.cos(rLat1) * Math.cos(rLon1) +
			b * Math.cos(rLat2) * Math.cos(rLon2)
		const y =
			a * Math.cos(rLat1) * Math.sin(rLon1) +
			b * Math.cos(rLat2) * Math.sin(rLon2)
		const z = a * Math.sin(rLat1) + b * Math.sin(rLat2)
		const lat = toDegrees(Math.atan2(z, Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2))))
		const lon = toDegrees(Math.atan2(y, x))
		points.push({ lat, lon })
	}

	return points
}

/**
 * Formats duration in minutes into Braun-style "14h 25m"
 */
export function formatFlightDuration(minutes: number): string {
	if (isNaN(minutes) || minutes <= 0) return '--'
	const hrs = Math.floor(minutes / 60)
	const mins = minutes % 60
	if (hrs === 0) return `${mins}m`
	return `${hrs}h ${mins.toString().padStart(2, '0')}m`
}

/**
 * Formats remaining flight time from a fractional progress
 */
export function formatTimeRemaining(
	totalMinutes: number,
	progressFraction: number
): string {
	const clamped = Math.max(0, Math.min(1, progressFraction))
	const remaining = Math.round(totalMinutes * (1 - clamped))
	return formatFlightDuration(remaining)
}
