export interface AirportLocation {
	iata: string
	name: string
	city: string
	country: string
	lat: number
	lon: number
}

// Curated dictionary of major global and regional airports for offline radar projection
export const AIRPORTS: Record<string, AirportLocation> = {
	// Australia / Oceania
	SYD: { iata: 'SYD', name: 'Kingsford Smith', city: 'Sydney', country: 'Australia', lat: -33.9461, lon: 151.1772 },
	MEL: { iata: 'MEL', name: 'Tullamarine', city: 'Melbourne', country: 'Australia', lat: -37.6733, lon: 144.8433 },
	BNE: { iata: 'BNE', name: 'Brisbane', city: 'Brisbane', country: 'Australia', lat: -27.3842, lon: 153.1175 },
	PER: { iata: 'PER', name: 'Perth', city: 'Perth', country: 'Australia', lat: -31.9403, lon: 115.9669 },
	ADL: { iata: 'ADL', name: 'Adelaide', city: 'Adelaide', country: 'Australia', lat: -34.9450, lon: 138.5306 },
	AKL: { iata: 'AKL', name: 'Auckland', city: 'Auckland', country: 'New Zealand', lat: -37.0082, lon: 174.7850 },
	CHC: { iata: 'CHC', name: 'Christchurch', city: 'Christchurch', country: 'New Zealand', lat: -43.4894, lon: 172.5322 },

	// Asia
	SIN: { iata: 'SIN', name: 'Changi', city: 'Singapore', country: 'Singapore', lat: 1.3644, lon: 103.9915 },
	HND: { iata: 'HND', name: 'Haneda', city: 'Tokyo', country: 'Japan', lat: 35.5494, lon: 139.7798 },
	NRT: { iata: 'NRT', name: 'Narita', city: 'Tokyo', country: 'Japan', lat: 35.7720, lon: 140.3929 },
	HKG: { iata: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'Hong Kong', lat: 22.3080, lon: 113.9185 },
	ICN: { iata: 'ICN', name: 'Incheon', city: 'Seoul', country: 'South Korea', lat: 37.4602, lon: 126.4407 },
	BKK: { iata: 'BKK', name: 'Suvarnabhumi', city: 'Bangkok', country: 'Thailand', lat: 13.6900, lon: 100.7501 },
	KUL: { iata: 'KUL', name: 'Kuala Lumpur International', city: 'Kuala Lumpur', country: 'Malaysia', lat: 2.7456, lon: 101.7099 },
	TPE: { iata: 'TPE', name: 'Taoyuan', city: 'Taipei', country: 'Taiwan', lat: 25.0797, lon: 121.2342 },
	PEK: { iata: 'PEK', name: 'Capital', city: 'Beijing', country: 'China', lat: 40.0799, lon: 116.6031 },
	PKX: { iata: 'PKX', name: 'Daxing', city: 'Beijing', country: 'China', lat: 39.5098, lon: 116.4105 },
	PVG: { iata: 'PVG', name: 'Pudong', city: 'Shanghai', country: 'China', lat: 31.1443, lon: 121.8083 },
	DEL: { iata: 'DEL', name: 'Indira Gandhi', city: 'Delhi', country: 'India', lat: 28.5562, lon: 77.1000 },
	BOM: { iata: 'BOM', name: 'Chhatrapati Shivaji', city: 'Mumbai', country: 'India', lat: 19.0896, lon: 72.8656 },

	// Middle East
	DXB: { iata: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'United Arab Emirates', lat: 25.2532, lon: 55.3657 },
	AUH: { iata: 'AUH', name: 'Zayed International', city: 'Abu Dhabi', country: 'United Arab Emirates', lat: 24.4330, lon: 54.6511 },
	DOH: { iata: 'DOH', name: 'Hamad International', city: 'Doha', country: 'Qatar', lat: 25.2731, lon: 51.6081 },
	IST: { iata: 'IST', name: 'Istanbul', city: 'Istanbul', country: 'Turkey', lat: 41.2753, lon: 28.7519 },

	// Europe
	LHR: { iata: 'LHR', name: 'Heathrow', city: 'London', country: 'United Kingdom', lat: 51.4700, lon: -0.4543 },
	LGW: { iata: 'LGW', name: 'Gatwick', city: 'London', country: 'United Kingdom', lat: 51.1537, lon: -0.1821 },
	CDG: { iata: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', lat: 49.0097, lon: 2.5479 },
	FRA: { iata: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany', lat: 50.0379, lon: 8.5622 },
	MUC: { iata: 'MUC', name: 'Munich', city: 'Munich', country: 'Germany', lat: 48.3537, lon: 11.7860 },
	AMS: { iata: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'Netherlands', lat: 52.3105, lon: 4.7683 },
	MAD: { iata: 'MAD', name: 'Barajas', city: 'Madrid', country: 'Spain', lat: 40.4839, lon: -3.5680 },
	BCN: { iata: 'BCN', name: 'El Prat', city: 'Barcelona', country: 'Spain', lat: 41.2974, lon: 2.0833 },
	FCO: { iata: 'FCO', name: 'Fiumicino', city: 'Rome', country: 'Italy', lat: 41.8003, lon: 12.2389 },
	ZRH: { iata: 'ZRH', name: 'Zurich', city: 'Zurich', country: 'Switzerland', lat: 47.4582, lon: 8.5555 },
	VIE: { iata: 'VIE', name: 'Vienna', city: 'Vienna', country: 'Austria', lat: 48.1103, lon: 16.5697 },
	CPH: { iata: 'CPH', name: 'Copenhagen', city: 'Copenhagen', country: 'Denmark', lat: 55.6180, lon: 12.6508 },
	ARN: { iata: 'ARN', name: 'Arlanda', city: 'Stockholm', country: 'Sweden', lat: 59.6498, lon: 17.9238 },
	OSL: { iata: 'OSL', name: 'Gardermoen', city: 'Oslo', country: 'Norway', lat: 60.1975, lon: 11.1004 },
	HEL: { iata: 'HEL', name: 'Helsinki-Vantaa', city: 'Helsinki', country: 'Finland', lat: 60.3172, lon: 24.9633 },
	DUB: { iata: 'DUB', name: 'Dublin', city: 'Dublin', country: 'Ireland', lat: 53.4264, lon: -6.2499 },

	// North America
	JFK: { iata: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'United States', lat: 40.6413, lon: -73.7781 },
	EWR: { iata: 'EWR', name: 'Newark Liberty', city: 'New York / Newark', country: 'United States', lat: 40.6895, lon: -74.1745 },
	LGA: { iata: 'LGA', name: 'LaGuardia', city: 'New York', country: 'United States', lat: 40.7769, lon: -73.8740 },
	LAX: { iata: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'United States', lat: 33.9416, lon: -118.4085 },
	SFO: { iata: 'SFO', name: 'San Francisco International', city: 'San Francisco', country: 'United States', lat: 37.6213, lon: -122.3790 },
	ORD: { iata: 'ORD', name: "O'Hare", city: 'Chicago', country: 'United States', lat: 41.9742, lon: -87.9073 },
	DFW: { iata: 'DFW', name: 'Dallas/Fort Worth', city: 'Dallas', country: 'United States', lat: 32.8998, lon: -97.0403 },
	ATL: { iata: 'ATL', name: 'Hartsfield-Jackson', city: 'Atlanta', country: 'United States', lat: 33.6407, lon: -84.4277 },
	MIA: { iata: 'MIA', name: 'Miami International', city: 'Miami', country: 'United States', lat: 25.7959, lon: -80.2870 },
	SEA: { iata: 'SEA', name: 'Seattle-Tacoma', city: 'Seattle', country: 'United States', lat: 47.4502, lon: -122.3088 },
	BOS: { iata: 'BOS', name: 'Logan', city: 'Boston', country: 'United States', lat: 42.3656, lon: -71.0096 },
	DEN: { iata: 'DEN', name: 'Denver International', city: 'Denver', country: 'United States', lat: 39.8561, lon: -104.6737 },
	YVR: { iata: 'YVR', name: 'Vancouver International', city: 'Vancouver', country: 'Canada', lat: 49.1967, lon: -123.1815 },
	YYZ: { iata: 'YYZ', name: 'Pearson', city: 'Toronto', country: 'Canada', lat: 43.6777, lon: -79.6248 },
	MEX: { iata: 'MEX', name: 'Benito Juárez', city: 'Mexico City', country: 'Mexico', lat: 19.4361, lon: -99.0719 },

	// South America
	GRU: { iata: 'GRU', name: 'Guarulhos', city: 'São Paulo', country: 'Brazil', lat: -23.4356, lon: -46.4731 },
	GIG: { iata: 'GIG', name: 'Galeão', city: 'Rio de Janeiro', country: 'Brazil', lat: -22.8099, lon: -43.2506 },
	EZE: { iata: 'EZE', name: 'Ministro Pistarini', city: 'Buenos Aires', country: 'Argentina', lat: -34.8222, lon: -58.5358 },
	SCL: { iata: 'SCL', name: 'Arturo Merino Benítez', city: 'Santiago', country: 'Chile', lat: -33.3930, lon: -70.7858 },
	BOG: { iata: 'BOG', name: 'El Dorado', city: 'Bogotá', country: 'Colombia', lat: 4.7016, lon: -74.1469 },

	// Africa
	JNB: { iata: 'JNB', name: 'O. R. Tambo', city: 'Johannesburg', country: 'South Africa', lat: -26.1367, lon: 28.2411 },
	CPT: { iata: 'CPT', name: 'Cape Town International', city: 'Cape Town', country: 'South Africa', lat: -33.9715, lon: 18.6021 },
	CAI: { iata: 'CAI', name: 'Cairo International', city: 'Cairo', country: 'Egypt', lat: 30.1219, lon: 31.4056 },
	NBO: { iata: 'NBO', name: 'Jomo Kenyatta', city: 'Nairobi', country: 'Kenya', lat: -1.3192, lon: 36.9275 }
}

export function getAirportByIata(iata: string): AirportLocation | undefined {
	return AIRPORTS[iata.toUpperCase().trim()]
}
