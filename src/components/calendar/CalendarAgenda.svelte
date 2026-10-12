<script lang="ts">
  import {
    calendarState,
    formatEventDateKey,
    parseEventDate,
  } from "../../context/calendar.svelte";
  import type { CalendarEvent } from "../../types/calendar";
  import {
    CalendarIcon,
    PlusIcon,
    VideoIcon,
    ClockIcon,
    MapPinIcon,
    UsersIcon,
  } from "../icons";
  import { SidebarResizeHandle } from "../layout";

  interface Props {
    onOpenCreateModal: (date?: Date) => void;
    onOpenEditModal: (ev: CalendarEvent) => void;
  }

  let { onOpenCreateModal, onOpenEditModal }: Props = $props();

  let selectedDayKey = $derived(formatEventDateKey(calendarState.selectedDate));
  let selectedDayEvents = $derived(calendarState.eventsByDate.get(selectedDayKey) || []);

  function formatTime(isoStr: string): string {
    try {
      const d = parseEventDate(isoStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }
</script>

<div class="w-full h-full flex flex-col bg-bg border-r border-border select-none overflow-hidden transition-colors relative">
  <!-- Agenda Header Strip -->
  <div class="h-11 px-3.5 border-b border-border flex items-center justify-between shrink-0">
    <div class="min-w-0 flex items-center gap-2">
      <h2 class="font-bold text-xs text-text truncate">
        {calendarState.selectedDate.toLocaleDateString([], {
          weekday: "short",
          month: "short",
          day: "numeric",
        })}
      </h2>
      <span class="text-[10px] text-text-muted font-mono tabular-nums px-1.5 py-0.2 rounded bg-bg-muted shrink-0">
        {selectedDayEvents.length}
      </span>
    </div>

    <button
      type="button"
      onclick={() => onOpenCreateModal(calendarState.selectedDate)}
      class="h-6 px-2 rounded-lg bg-bg-secondary hover:bg-bg-emphasis border border-border text-[11px] font-semibold flex items-center gap-1 text-text transition-colors cursor-pointer shadow-2xs shrink-0"
      title="Add event on this day"
    >
      <PlusIcon class="w-3 h-3 stroke-[2]" />
      <span>Add</span>
    </button>
  </div>

  <!-- Timeline Schedule Cards List -->
  <div class="flex-1 overflow-y-auto p-2.5 space-y-2">
    {#if selectedDayEvents.length === 0}
      <div class="py-16 text-center text-text-muted px-4">
        <CalendarIcon class="w-7 h-7 stroke-[1.5] mx-auto mb-2 opacity-30" />
        <p class="font-medium text-xs">No events scheduled</p>
        <p class="text-[11px] opacity-70 mt-1">Double click any day cell or click Add above to schedule.</p>
      </div>
    {:else}
      {#each selectedDayEvents as ev (ev.id)}
        <!-- Event Card -->
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
          onclick={() => onOpenEditModal(ev)}
          class="p-3 rounded-xl border border-border bg-bg hover:border-accent/80 transition-all cursor-pointer shadow-2xs group"
        >
          <!-- Title Row -->
          <div class="flex items-start justify-between gap-2">
            <div class="flex items-center gap-2 min-w-0">
              <span
                class="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                style:background-color={ev.color || "#eab308"}
              ></span>
              <h3 class="font-bold text-xs text-text truncate group-hover:text-accent transition-colors">
                {ev.title}
              </h3>
            </div>

            {#if ev.meetLink}
              <button
                type="button"
                onclick={(e) => {
                  e.stopPropagation();
                  ev.meetLink && calendarState.openMeeting(ev.meetLink);
                }}
                class="px-2 py-0.5 rounded-md bg-accent text-slate-950 font-bold text-[10px] flex items-center gap-1 hover:brightness-105 transition-all cursor-pointer shadow-2xs shrink-0"
              >
                <VideoIcon class="w-3 h-3 stroke-[2.2]" />
                <span>Join</span>
              </button>
            {/if}
          </div>

          <!-- Time & Location -->
          <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted tabular-nums">
            <span class="flex items-center gap-1">
              <ClockIcon class="w-3 h-3 stroke-[2] opacity-70" />
              {#if ev.allDay}
                All day
              {:else}
                {formatTime(ev.startTime)} – {formatTime(ev.endTime)}
              {/if}
            </span>

            {#if ev.location}
              <span class="flex items-center gap-1 truncate max-w-[160px]">
                <MapPinIcon class="w-3 h-3 stroke-[2] opacity-70" />
                {ev.location}
              </span>
            {/if}
          </div>

          <!-- Attendees -->
          {#if ev.attendees.length > 0}
            <div class="mt-2 flex items-center gap-1.5 text-[10px] text-text-muted">
              <UsersIcon class="w-3 h-3 stroke-[2] opacity-70" />
              <span class="truncate">
                {ev.attendees.length} guest{ev.attendees.length > 1 ? "s" : ""}: {ev.attendees.slice(0, 2).join(", ")}{ev.attendees.length > 2 ? ` +${ev.attendees.length - 2}` : ""}
              </span>
            </div>
          {/if}

          <!-- Description Preview -->
          {#if ev.description}
            <p class="mt-2 text-[11px] text-text-muted/90 line-clamp-2 leading-relaxed border-t border-border/40 pt-2 font-sans">
              {ev.description}
            </p>
          {/if}
        </div>
      {/each}
    {/if}
  </div>

  <SidebarResizeHandle />
</div>
