import { invoke } from '@tauri-apps/api/core'
import type {
	CalendarSyncState,
	CalendarEvent,
	CreateEventPayload,
	UpdateEventPayload
} from '../types/calendar'

export async function getCalendarState(): Promise<CalendarSyncState> {
	return invoke('calendar_get_state')
}

export async function startCalendarAuth(
	clientId?: string,
	clientSecret?: string
): Promise<CalendarSyncState> {
	return invoke('calendar_start_auth', {
		clientId: clientId || null,
		clientSecret: clientSecret || null
	})
}

export async function syncCalendar(): Promise<CalendarSyncState> {
	return invoke('calendar_sync')
}

export async function disconnectCalendar(): Promise<void> {
	return invoke('calendar_disconnect')
}

export async function toggleCalendarVisibility(
	calendarId: string,
	selected: boolean
): Promise<CalendarSyncState> {
	return invoke('calendar_toggle_visibility', { calendarId, selected })
}

export async function createCalendarEvent(
	payload: CreateEventPayload
): Promise<CalendarEvent> {
	return invoke('calendar_create_event', { payload })
}

export async function updateCalendarEvent(
	payload: UpdateEventPayload
): Promise<CalendarEvent> {
	return invoke('calendar_update_event', { payload })
}

export async function deleteCalendarEvent(
	calendarId: string,
	eventId: string
): Promise<void> {
	return invoke('calendar_delete_event', { calendarId, eventId })
}

export async function openExternalUrl(url: string): Promise<void> {
	return invoke('open_url_safe', { url })
}
