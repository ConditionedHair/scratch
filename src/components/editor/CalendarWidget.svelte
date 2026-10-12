<script lang="ts">
  import { Popover } from "bits-ui";
  import { calendarState, parseEventDate } from "../../context/calendar.svelte";
  import {
    CalendarIcon,
    VideoIcon,
    ClockIcon,
    RefreshCwIcon,
    ChevronRightIcon,
  } from "../icons";
  import { mod } from "../../lib/platform";

  interface Props {
    onOpenCalendar?: () => void;
    onOpenSettings?: () => void;
  }

  let { onOpenCalendar, onOpenSettings }: Props = $props();

  let popoverOpen = $state(false);

  function formatTime(isoStr: string): string {
    try {
      const d = parseEventDate(isoStr);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  function handleOpenCalendar() {
    popoverOpen = false;
    onOpenCalendar?.();
  }

  function handleOpenSettings() {
    popoverOpen = false;
    onOpenSettings?.();
  }
</script>

<div class="flex items-center gap-2 shrink-0 select-none">
  <!-- Subtle Braun Hairline Divider between Tags and Calendar -->
  <div class="w-px h-3.5 bg-border/80 shrink-0"></div>

  {#if !calendarState.connected}
    <button
      type="button"
      onclick={handleOpenSettings}
      class="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium text-text-muted hover:text-text hover:bg-bg-emphasis/60 border border-transparent hover:border-border/60 transition-all cursor-pointer"
      title="Connect Google Calendar in Settings"
    >
      <CalendarIcon class="w-3.5 h-3.5 stroke-[1.8] opacity-70" />
      <span class="hidden md:inline">Connect Calendar</span>
    </button>
  {:else}
    <Popover.Root bind:open={popoverOpen}>
      <Popover.Trigger>
        {#snippet child({ props })}
          <button
            {...props}
            type="button"
            class="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border border-border/60 bg-bg hover:bg-bg-emphasis/70 text-text transition-all cursor-pointer shadow-2xs max-w-[210px] md:max-w-[260px] truncate group"
          >
            {#if calendarState.nextUpcomingEvent}
              {@const next = calendarState.nextUpcomingEvent}
              <!-- Status Indicator Dot -->
              <span
                class={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  next.isOngoing
                    ? "bg-amber-400 animate-pulse shadow-[0_0_6px_rgba(251,191,36,0.5)]"
                    : next.minutesUntil <= 15
                      ? "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"
                      : "bg-text-muted/60"
                }`}
              ></span>

              <!-- Event Title -->
              <span class="truncate max-w-[120px] font-medium text-text">
                {next.event.title}
              </span>

              <!-- Time / Countdown badge -->
              <span class="tabular-nums text-[10px] text-text-muted shrink-0">
                {next.isOngoing
                  ? "Now"
                  : next.minutesUntil < 60
                    ? `in ${next.minutesUntil}m`
                    : formatTime(next.event.startTime)}
              </span>

              <!-- Quick Meet Join Pill -->
              {#if next.event.meetLink}
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_static_element_interactions -->
                <span
                  onclick={(e) => {
                    e.stopPropagation();
                    if (next.event.meetLink) {
                      calendarState.openMeeting(next.event.meetLink);
                    }
                  }}
                  class="ml-0.5 px-1 py-0.2 rounded bg-accent/20 hover:bg-accent text-accent hover:text-slate-950 font-bold text-[9px] flex items-center gap-0.5 transition-colors cursor-pointer shrink-0"
                  title="Join Meeting"
                >
                  <VideoIcon class="w-2.5 h-2.5 stroke-[2]" />
                  <span>Join</span>
                </span>
              {/if}
            {:else}
              <CalendarIcon class="w-3.5 h-3.5 stroke-[1.8] text-text-muted/70 group-hover:text-text transition-colors" />
              <span class="text-text-muted font-normal">
                {calendarState.todayEvents.length > 0
                  ? `${calendarState.todayEvents.length} event${calendarState.todayEvents.length > 1 ? "s" : ""} today`
                  : "No events today"}
              </span>
            {/if}
          </button>
        {/snippet}
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          class="w-80 bg-bg border border-border rounded-xl shadow-2xl p-0 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-xs text-text select-none"
          sideOffset={6}
          align="end"
        >
          <!-- Popover Header -->
          <div class="px-3.5 py-2.5 bg-bg-secondary border-b border-border flex items-center justify-between">
            <div class="flex items-center gap-2">
              <CalendarIcon class="w-4 h-4 stroke-[2] text-accent" />
              <span class="font-bold tracking-tight text-xs uppercase text-text">
                Today's Schedule
              </span>
            </div>

            <div class="flex items-center gap-1.5">
              <button
                type="button"
                onclick={() => calendarState.refresh()}
                class="p-1 rounded hover:bg-bg-emphasis text-text-muted hover:text-text transition-colors cursor-pointer"
                title="Sync Google Calendar"
              >
                <RefreshCwIcon
                  class={`w-3.5 h-3.5 stroke-[1.8] ${calendarState.isSyncing ? "animate-spin text-accent" : ""}`}
                />
              </button>
            </div>
          </div>

          <!-- Schedule Event List -->
          <div class="max-h-64 overflow-y-auto divide-y divide-border/40">
            {#if calendarState.todayEvents.length === 0}
              <div class="py-8 px-4 text-center text-text-muted">
                <ClockIcon class="w-6 h-6 stroke-[1.5] mx-auto mb-2 opacity-40" />
                <p class="font-medium text-xs">No events scheduled for today</p>
                <p class="text-[11px] opacity-70 mt-0.5">Your schedule is completely clear</p>
              </div>
            {:else}
              {#each calendarState.todayEvents as ev (ev.id)}
                {@const start = parseEventDate(ev.startTime)}
                {@const end = parseEventDate(ev.endTime)}
                {@const isNow = !ev.allDay && new Date() >= start && new Date() <= end}
                <div class={`p-3 hover:bg-bg-emphasis/50 transition-colors flex items-start justify-between gap-3 ${isNow ? "bg-bg-emphasis/40" : ""}`}>
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-1.5">
                      {#if ev.color}
                        <span class="w-2 h-2 rounded-full shrink-0" style:background-color={ev.color}></span>
                      {:else}
                        <span class="w-2 h-2 rounded-full bg-accent shrink-0"></span>
                      {/if}
                      <span class="font-semibold text-text truncate text-xs">
                        {ev.title}
                      </span>
                      {#if isNow}
                        <span class="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-400 text-slate-950 uppercase">
                          Now
                        </span>
                      {/if}
                    </div>

                    <div class="mt-1 flex items-center gap-2 text-[11px] text-text-muted tabular-nums">
                      {#if ev.allDay}
                        <span>All day</span>
                      {:else}
                        <span>{formatTime(ev.startTime)} – {formatTime(ev.endTime)}</span>
                      {/if}

                      {#if ev.location}
                        <span class="truncate max-w-[100px] text-text-muted/80">• {ev.location}</span>
                      {/if}
                    </div>
                  </div>

                  {#if ev.meetLink}
                    <button
                      type="button"
                      onclick={() => ev.meetLink && calendarState.openMeeting(ev.meetLink)}
                      class="px-2 py-1 rounded bg-accent text-slate-950 hover:brightness-105 font-bold text-[10px] flex items-center gap-1 transition-all cursor-pointer shrink-0 shadow-2xs"
                    >
                      <VideoIcon class="w-3 h-3 stroke-[2.2]" />
                      <span>Join</span>
                    </button>
                  {/if}
                </div>
              {/each}
            {/if}
          </div>

          <!-- Bottom Footer Navigation -->
          <div class="p-2 bg-bg-secondary border-t border-border flex items-center justify-between">
            <button
              type="button"
              onclick={handleOpenCalendar}
              class="w-full py-1.5 px-3 rounded-lg bg-bg border border-border hover:bg-bg-emphasis text-text font-medium text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-2xs group"
            >
              <span>Open Full Calendar</span>
              <kbd class="font-mono text-[10px] px-1 py-0.2 rounded bg-bg-muted text-text-muted group-hover:text-text">
                {mod}Shift+C
              </kbd>
              <ChevronRightIcon class="w-3.5 h-3.5 stroke-[2] opacity-70 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  {/if}
</div>
