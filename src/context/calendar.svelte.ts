import { toast } from "svelte-sonner";
import * as calendarService from "../services/calendar";
import type {
  CalendarEntry,
  CalendarEvent,
  CalendarViewMode,
  CreateEventPayload,
  UpdateEventPayload,
} from "../types/calendar";

export function formatEventDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseEventDate(dateStr: string): Date {
  if (dateStr.includes("T")) {
    return new Date(dateStr);
  }
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
  }
  return new Date(dateStr);
}

export class CalendarState {
  connected = $state<boolean>(false);
  userEmail = $state<string | null>(null);
  userName = $state<string | null>(null);
  lastSynced = $state<number | null>(null);
  calendars = $state<CalendarEntry[]>([]);
  events = $state<CalendarEvent[]>([]);
  isSyncing = $state<boolean>(false);
  isAuthenticating = $state<boolean>(false);
  error = $state<string | null>(null);
  viewMode = $state<CalendarViewMode>("month");
  selectedDate = $state<Date>(new Date());

  private pollTimer: number | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      void this.init();
    }
  }

  async init() {
    try {
      const state = await calendarService.getCalendarState();
      this.connected = state.connected;
      this.userEmail = state.userEmail || null;
      this.userName = state.userName || null;
      this.lastSynced = state.lastSynced || null;
      this.calendars = state.calendars || [];
      this.events = state.events || [];

      if (this.connected) {
        // Trigger background refresh in case cached
        void this.refresh();
      }
    } catch (err) {
      console.error("[Calendar] Init error:", err);
    }

    this.setupListeners();
  }

  private setupListeners() {
    // Window focus refresh
    const handleFocus = () => {
      if (this.connected && !this.isSyncing) {
        void this.refresh();
      }
    };
    window.addEventListener("focus", handleFocus);

    // 5-minute auto-sync timer
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
    }
    this.pollTimer = window.setInterval(() => {
      if (this.connected && !this.isSyncing) {
        void this.refresh();
      }
    }, 5 * 60 * 1000);
  }

  async refresh() {
    if (!this.connected) return;
    this.isSyncing = true;
    try {
      const updated = await calendarService.syncCalendar();
      this.connected = updated.connected;
      this.userEmail = updated.userEmail || null;
      this.userName = updated.userName || null;
      this.lastSynced = updated.lastSynced || null;
      this.calendars = updated.calendars || [];
      this.events = updated.events || [];
      this.error = null;
    } catch (err) {
      console.error("[Calendar] Sync error:", err);
      this.error = err instanceof Error ? err.message : String(err);
    } finally {
      this.isSyncing = false;
    }
  }

  async startAuth(clientId?: string, clientSecret?: string) {
    this.isAuthenticating = true;
    this.error = null;
    try {
      const result = await calendarService.startCalendarAuth(clientId, clientSecret);
      this.connected = result.connected;
      this.userEmail = result.userEmail || null;
      this.userName = result.userName || null;
      this.lastSynced = result.lastSynced || null;
      this.calendars = result.calendars || [];
      this.events = result.events || [];
      toast.success(
        `Connected to Google Calendar${this.userEmail ? ` (${this.userEmail})` : ""}`
      );
    } catch (err) {
      console.error("[Calendar] Auth error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      this.error = msg;
      toast.error(`Google Calendar connection failed: ${msg}`);
      throw err;
    } finally {
      this.isAuthenticating = false;
    }
  }

  async disconnect() {
    try {
      await calendarService.disconnectCalendar();
      this.connected = false;
      this.userEmail = null;
      this.userName = null;
      this.lastSynced = null;
      this.calendars = [];
      this.events = [];
      toast.success("Disconnected Google Calendar");
    } catch (err) {
      console.error("[Calendar] Disconnect error:", err);
      toast.error("Failed to disconnect calendar");
    }
  }

  async toggleVisibility(calendarId: string, selected: boolean) {
    try {
      const res = await calendarService.toggleCalendarVisibility(calendarId, selected);
      this.calendars = res.calendars || [];
      void this.refresh();
    } catch (err) {
      console.error("[Calendar] Toggle visibility error:", err);
      toast.error("Failed to update calendar visibility");
    }
  }

  async createEvent(payload: CreateEventPayload) {
    try {
      const created = await calendarService.createCalendarEvent(payload);
      toast.success(`Event created: "${created.title}"`);
      await this.refresh();
      return created;
    } catch (err) {
      console.error("[Calendar] Create event error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to create event: ${msg}`);
      throw err;
    }
  }

  async updateEvent(payload: UpdateEventPayload) {
    try {
      const updated = await calendarService.updateCalendarEvent(payload);
      toast.success(`Event updated: "${updated.title}"`);
      await this.refresh();
      return updated;
    } catch (err) {
      console.error("[Calendar] Update event error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      toast.error(`Failed to update event: ${msg}`);
      throw err;
    }
  }

  async deleteEvent(calendarId: string, eventId: string) {
    try {
      await calendarService.deleteCalendarEvent(calendarId, eventId);
      this.events = this.events.filter((e) => e.id !== eventId);
      toast.success("Event deleted");
      void this.refresh();
    } catch (err) {
      console.error("[Calendar] Delete event error:", err);
      toast.error("Failed to delete event");
      throw err;
    }
  }

  async openMeeting(url: string) {
    try {
      await calendarService.openExternalUrl(url);
    } catch (err) {
      console.error("[Calendar] Open URL error:", err);
      window.open(url, "_blank");
    }
  }

  setViewMode(mode: CalendarViewMode) {
    this.viewMode = mode;
  }

  setSelectedDate(date: Date) {
    this.selectedDate = new Date(date);
  }

  // Derived: events today
  todayEvents = $derived.by(() => {
    const todayKey = formatEventDateKey(new Date());
    return this.events.filter((e) => {
      const eventStart = parseEventDate(e.startTime);
      const eventKey = formatEventDateKey(eventStart);
      return eventKey === todayKey;
    });
  });

  // Derived: next upcoming event today (or currently ongoing)
  nextUpcomingEvent = $derived.by(() => {
    const now = new Date();
    const todayEvents = this.todayEvents;
    if (todayEvents.length === 0) return null;

    let closest: { event: CalendarEvent; minutesUntil: number; isOngoing: boolean } | null = null;

    for (const ev of todayEvents) {
      if (ev.allDay) continue;
      const start = parseEventDate(ev.startTime);
      const end = parseEventDate(ev.endTime);

      const diffMs = start.getTime() - now.getTime();
      const minutesUntil = Math.round(diffMs / 60000);

      // Check if event is currently underway
      if (now >= start && now <= end) {
        return { event: ev, minutesUntil: 0, isOngoing: true };
      }

      // Check if event is upcoming today
      if (minutesUntil >= 0) {
        if (!closest || minutesUntil < closest.minutesUntil) {
          closest = { event: ev, minutesUntil, isOngoing: false };
        }
      }
    }

    return closest;
  });

  // Group events by YYYY-MM-DD (including multi-day spans)
  eventsByDate = $derived.by(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of this.events) {
      const startDt = parseEventDate(ev.startTime);
      const endDt = parseEventDate(ev.endTime);

      const startKey = formatEventDateKey(startDt);
      const endKey = formatEventDateKey(endDt);

      if (ev.allDay && endKey > startKey) {
        // All-day event: Google end date is exclusive (e.g. start: Oct 4, end: Oct 5 is Oct 4)
        const curr = new Date(startDt);
        while (formatEventDateKey(curr) < endKey) {
          const k = formatEventDateKey(curr);
          const list = map.get(k) || [];
          list.push(ev);
          map.set(k, list);
          curr.setDate(curr.getDate() + 1);
        }
      } else if (!ev.allDay && endKey > startKey) {
        // Multi-day timed event
        const curr = new Date(startDt);
        while (formatEventDateKey(curr) <= endKey) {
          const k = formatEventDateKey(curr);
          const list = map.get(k) || [];
          list.push(ev);
          map.set(k, list);
          curr.setDate(curr.getDate() + 1);
        }
      } else {
        const list = map.get(startKey) || [];
        list.push(ev);
        map.set(startKey, list);
      }
    }
    return map;
  });
}

export const calendarState = new CalendarState();
