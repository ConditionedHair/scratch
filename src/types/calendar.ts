export interface CalendarEntry {
	id: string
	summary: string
	description?: string | null
	primary: boolean
	bgColor?: string | null
	fgColor?: string | null
	selected: boolean
}

export interface CalendarEvent {
	id: string
	calendarId: string
	title: string
	description?: string | null
	location?: string | null
	startTime: string
	endTime: string
	allDay: boolean
	meetLink?: string | null
	htmlLink?: string | null
	attendees: string[]
	status?: string | null
	color?: string | null
}

export interface CalendarSyncState {
	connected: boolean
	userEmail?: string | null
	userName?: string | null
	lastSynced?: number | null
	calendars: CalendarEntry[]
	events: CalendarEvent[]
}

export interface CreateEventPayload {
	calendarId: string
	title: string
	description?: string
	location?: string
	startTime: string
	endTime: string
	allDay: boolean
	attendees: string[]
	addMeet: boolean
}

export interface UpdateEventPayload {
	calendarId: string
	eventId: string
	title: string
	description?: string
	location?: string
	startTime: string
	endTime: string
	allDay: boolean
	attendees: string[]
}

export type CalendarViewMode = 'month' | 'week' | 'day'
