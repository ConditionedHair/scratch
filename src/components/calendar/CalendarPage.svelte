<script lang="ts">
	import { onMount } from 'svelte'
	import { invoke } from '@tauri-apps/api/core'
	import { getCurrentWindow } from '@tauri-apps/api/window'
	import { isMac } from '../../lib/platform'
	import {
		calendarState,
		formatEventDateKey,
		parseEventDate,
		getInclusiveEndDate
	} from '../../context/calendar.svelte'
	import type { CalendarEvent } from '../../types/calendar'
	import {
		ArrowLeftIcon,
		ChevronLeftIcon,
		ChevronRightIcon,
		PlusIcon,
		RefreshCwIcon,
		VideoIcon,
		ClockIcon,
		MapPinIcon,
		UsersIcon
	} from '../icons'
	import CalendarNavigation from './CalendarNavigation.svelte'
	import CalendarAgenda from './CalendarAgenda.svelte'
	import EventModal from './EventModal.svelte'

	interface Props {
		onBack: () => void
		sidebarVisible?: boolean
	}

	let { onBack, sidebarVisible = true }: Props = $props()

	let eventModalOpen = $state<boolean>(false)
	let selectedEvent = $state<CalendarEvent | null>(null)
	let modalDate = $state<Date>(new Date())

	// Month navigation helpers
	let currentYear = $derived(calendarState.selectedDate.getFullYear())
	let currentMonth = $derived(calendarState.selectedDate.getMonth())

	const MONTH_NAMES = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	]

	const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

	let headerTitle = $derived.by(() => {
		if (calendarState.viewMode === 'month') {
			return `${MONTH_NAMES[currentMonth].toUpperCase()} ${currentYear}`
		}
		if (calendarState.viewMode === 'day') {
			return calendarState.selectedDate
				.toLocaleDateString([], {
					weekday: 'short',
					month: 'short',
					day: 'numeric',
					year: 'numeric'
				})
				.toUpperCase()
		}
		// Week
		const weekDays = getWeekDays(calendarState.selectedDate)
		const first = weekDays[0]
		const last = weekDays[6]
		if (first.getMonth() === last.getMonth()) {
			return `${MONTH_NAMES[first.getMonth()].toUpperCase()} ${first.getDate()} – ${last.getDate()}, ${first.getFullYear()}`
		}
		return `${MONTH_NAMES[first.getMonth()].slice(0, 3).toUpperCase()} ${first.getDate()} – ${MONTH_NAMES[last.getMonth()].slice(0, 3).toUpperCase()} ${last.getDate()}, ${last.getFullYear()}`
	})

	function getWeekDays(date: Date): Date[] {
		const d = new Date(date)
		const day = d.getDay()
		// Monday as first day: day 0 is Sun -> diff -6, day 1 is Mon -> diff 0
		const diff = d.getDate() - (day === 0 ? 6 : day - 1)
		const monday = new Date(d.setDate(diff))
		const days: Date[] = []
		for (let i = 0; i < 7; i++) {
			const next = new Date(monday)
			next.setDate(monday.getDate() + i)
			days.push(next)
		}
		return days
	}

	function handlePrev() {
		const d = new Date(calendarState.selectedDate)
		if (calendarState.viewMode === 'month') {
			d.setMonth(d.getMonth() - 1)
		} else if (calendarState.viewMode === 'week') {
			d.setDate(d.getDate() - 7)
		} else {
			d.setDate(d.getDate() - 1)
		}
		calendarState.setSelectedDate(d)
	}

	function handleNext() {
		const d = new Date(calendarState.selectedDate)
		if (calendarState.viewMode === 'month') {
			d.setMonth(d.getMonth() + 1)
		} else if (calendarState.viewMode === 'week') {
			d.setDate(d.getDate() + 7)
		} else {
			d.setDate(d.getDate() + 1)
		}
		calendarState.setSelectedDate(d)
	}

	function handleToday() {
		calendarState.setSelectedDate(new Date())
	}

	function openCreateModal(date?: Date) {
		selectedEvent = null
		modalDate = date || calendarState.selectedDate
		eventModalOpen = true
	}

	function openEditModal(ev: CalendarEvent) {
		selectedEvent = ev
		eventModalOpen = true
	}

	function formatTime(isoStr: string): string {
		try {
			const d = parseEventDate(isoStr)
			return d.toLocaleTimeString([], {
				hour: '2-digit',
				minute: '2-digit'
			})
		} catch {
			return ''
		}
	}

	// Month grid calculation
	interface MonthCell {
		date: Date
		key: string
		isCurrentMonth: boolean
		isToday: boolean
		isSelected: boolean
		events: CalendarEvent[]
	}

	let monthCells = $derived.by(() => {
		const cells: MonthCell[] = []
		const firstDay = new Date(currentYear, currentMonth, 1)
		const lastDay = new Date(currentYear, currentMonth + 1, 0)

		// Monday-based start
		const startDayOfWeek =
			firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1
		const prevMonthLastDay = new Date(
			currentYear,
			currentMonth,
			0
		).getDate()

		// Previous month filler days
		for (let i = startDayOfWeek - 1; i >= 0; i--) {
			const d = new Date(
				currentYear,
				currentMonth - 1,
				prevMonthLastDay - i
			)
			const key = formatEventDateKey(d)
			cells.push({
				date: d,
				key,
				isCurrentMonth: false,
				isToday: formatEventDateKey(new Date()) === key,
				isSelected:
					formatEventDateKey(calendarState.selectedDate) === key,
				events: calendarState.eventsByDate.get(key) || []
			})
		}

		// Current month days
		for (let day = 1; day <= lastDay.getDate(); day++) {
			const d = new Date(currentYear, currentMonth, day)
			const key = formatEventDateKey(d)
			cells.push({
				date: d,
				key,
				isCurrentMonth: true,
				isToday: formatEventDateKey(new Date()) === key,
				isSelected:
					formatEventDateKey(calendarState.selectedDate) === key,
				events: calendarState.eventsByDate.get(key) || []
			})
		}

		// Next month filler days to complete 6 weeks (42 cells) or 5 weeks (35 cells)
		const targetLength = cells.length > 35 ? 42 : 35
		let nextDay = 1
		while (cells.length < targetLength) {
			const d = new Date(currentYear, currentMonth + 1, nextDay++)
			const key = formatEventDateKey(d)
			cells.push({
				date: d,
				key,
				isCurrentMonth: false,
				isToday: formatEventDateKey(new Date()) === key,
				isSelected:
					formatEventDateKey(calendarState.selectedDate) === key,
				events: calendarState.eventsByDate.get(key) || []
			})
		}

		return cells
	})

	interface WeekSegment {
		event: CalendarEvent
		startCol: number
		endCol: number
		span: number
		startsThisWeek: boolean
		endsThisWeek: boolean
		isMultiDay: boolean
		track: number
	}

	interface WeekRow {
		weekIndex: number
		days: MonthCell[]
		segments: WeekSegment[]
		moreCounts: number[]
	}

	function getContrastTextColor(hexColor?: string | null): string {
		if (!hexColor) return '#0f172a'
		const hex = hexColor.replace('#', '')
		if (hex.length === 6) {
			const r = parseInt(hex.substring(0, 2), 16)
			const g = parseInt(hex.substring(2, 4), 16)
			const b = parseInt(hex.substring(4, 6), 16)
			const yiq = (r * 299 + g * 587 + b * 114) / 1000
			return yiq >= 150 ? '#0f172a' : '#ffffff'
		}
		return '#ffffff'
	}

	const MAX_MONTH_TRACKS = 3

	let monthWeeks = $derived.by(() => {
		const cells = monthCells
		const weeks: WeekRow[] = []
		const weekCount = Math.ceil(cells.length / 7)
		const allEvents = calendarState.events

		for (let w = 0; w < weekCount; w++) {
			const weekDays = cells.slice(w * 7, (w + 1) * 7)
			if (weekDays.length === 0) continue
			const weekStartKey = weekDays[0].key
			const weekEndKey = weekDays[weekDays.length - 1].key

			const rawSegments: {
				event: CalendarEvent
				startCol: number
				endCol: number
				span: number
				startsThisWeek: boolean
				endsThisWeek: boolean
				isMultiDay: boolean
				startTimeStr: string
			}[] = []

			for (const ev of allEvents) {
				const startDt = parseEventDate(ev.startTime)
				const startKey = formatEventDateKey(startDt)
				const endKey = ev.allDay
					? getInclusiveEndDate(
							ev.startTime,
							ev.endTime || ev.startTime
						)
					: formatEventDateKey(parseEventDate(ev.endTime))

				if (endKey < weekStartKey || startKey > weekEndKey) {
					continue
				}

				const startCol =
					startKey <= weekStartKey
						? 0
						: weekDays.findIndex((d) => d.key === startKey)

				const endCol =
					endKey >= weekEndKey
						? 6
						: weekDays.findIndex((d) => d.key === endKey)

				if (startCol === -1 || endCol === -1) continue

				const span = endCol - startCol + 1
				const startsThisWeek = startKey >= weekStartKey
				const endsThisWeek = endKey <= weekEndKey
				const isMultiDay = endKey > startKey

				rawSegments.push({
					event: ev,
					startCol,
					endCol,
					span,
					startsThisWeek,
					endsThisWeek,
					isMultiDay,
					startTimeStr: ev.startTime
				})
			}

			rawSegments.sort((a, b) => {
				if (a.isMultiDay !== b.isMultiDay) {
					return a.isMultiDay ? -1 : 1
				}
				if (b.span !== a.span) {
					return b.span - a.span
				}
				if (a.startCol !== b.startCol) {
					return a.startCol - b.startCol
				}
				return a.startTimeStr.localeCompare(b.startTimeStr)
			})

			const tracks: boolean[][] = []
			const placed: WeekSegment[] = []
			const overflowByDay = new Array(7).fill(0)

			for (const seg of rawSegments) {
				let assignedTrack = -1
				for (let t = 0; t < tracks.length; t++) {
					let collision = false
					for (let c = seg.startCol; c <= seg.endCol; c++) {
						if (tracks[t][c]) {
							collision = true
							break
						}
					}
					if (!collision) {
						assignedTrack = t
						break
					}
				}

				if (assignedTrack === -1) {
					assignedTrack = tracks.length
					tracks.push(new Array(7).fill(false))
				}

				if (assignedTrack < MAX_MONTH_TRACKS) {
					for (let c = seg.startCol; c <= seg.endCol; c++) {
						tracks[assignedTrack][c] = true
					}
					placed.push({
						event: seg.event,
						startCol: seg.startCol,
						endCol: seg.endCol,
						span: seg.span,
						startsThisWeek: seg.startsThisWeek,
						endsThisWeek: seg.endsThisWeek,
						isMultiDay: seg.isMultiDay,
						track: assignedTrack
					})
				} else {
					for (let c = seg.startCol; c <= seg.endCol; c++) {
						overflowByDay[c]++
					}
				}
			}

			weeks.push({
				weekIndex: w,
				days: weekDays,
				segments: placed,
				moreCounts: overflowByDay
			})
		}

		return weeks
	})

	let selectedDayKey = $derived(
		formatEventDateKey(calendarState.selectedDate)
	)
	let selectedDayEvents = $derived(
		calendarState.eventsByDate.get(selectedDayKey) || []
	)

	// Keyboard navigation
	onMount(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				e.target instanceof HTMLInputElement ||
				e.target instanceof HTMLTextAreaElement
			) {
				return
			}
			if (e.key === 'Escape') {
				if (eventModalOpen) {
					eventModalOpen = false
				} else {
					onBack()
				}
			} else if (e.key === 't' && !e.metaKey && !e.ctrlKey) {
				handleToday()
			}
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	})

	function handlePointerDown(e: PointerEvent) {
		if (
			e.button === 0 &&
			!(e.target as HTMLElement)?.closest(
				'button, input, textarea, a, select, kbd'
			)
		) {
			getCurrentWindow().startDragging()
		}
	}

	async function handleHeaderDoubleClick(e: MouseEvent) {
		const target = e.target as HTMLElement | null
		if (target?.closest('button, input, textarea, a, select, kbd')) {
			return
		}

		try {
			await invoke('toggle_maximize_clean')
		} catch (err) {
			console.error('Failed to toggle clean window maximize:', err)
			try {
				const win = getCurrentWindow()
				await win.toggleMaximize()
			} catch (fallbackErr) {
				console.error('Fallback maximize error:', fallbackErr)
			}
		}
	}
</script>

<div class="h-full flex flex-col bg-bg text-text select-none overflow-hidden">
	<!-- Top Braun Control Header Bar (Standardized to h-11) -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<header
		class={`h-11 border-b border-border bg-bg-secondary flex items-center justify-between shrink-0 z-20 select-none ${
			isMac ? 'pl-20 pr-4' : 'px-4'
		}`}
		onpointerdown={handlePointerDown}
		ondblclick={handleHeaderDoubleClick}
	>
		<!-- Left Navigation -->
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={onBack}
				class="h-7 px-2.5 rounded-lg border border-border bg-bg hover:bg-bg-emphasis text-text font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
				title="Back to notes (Esc)"
			>
				<ArrowLeftIcon class="w-3.5 h-3.5 stroke-[2]" />
				<span>Notes</span>
			</button>

			<div class="w-px h-4 bg-border/80"></div>

			<!-- Month/Year & Paging -->
			<div class="flex items-center gap-1.5">
				<h1
					class="font-bold text-xs tracking-[0.14em] text-text uppercase min-w-[170px]"
				>
					{headerTitle}
				</h1>

				<div
					class="flex items-center border border-border rounded-lg bg-bg overflow-hidden shadow-2xs"
				>
					<button
						type="button"
						onclick={handlePrev}
						class="w-6 h-6 flex items-center justify-center hover:bg-bg-emphasis text-text-muted hover:text-text transition-colors cursor-pointer"
						title="Previous period"
					>
						<ChevronLeftIcon class="w-3.5 h-3.5 stroke-[2]" />
					</button>
					<div class="w-px h-3.5 bg-border"></div>
					<button
						type="button"
						onclick={handleNext}
						class="w-6 h-6 flex items-center justify-center hover:bg-bg-emphasis text-text-muted hover:text-text transition-colors cursor-pointer"
						title="Next period"
					>
						<ChevronRightIcon class="w-3.5 h-3.5 stroke-[2]" />
					</button>
				</div>

				<button
					type="button"
					onclick={handleToday}
					class="h-6 px-2 rounded-lg border border-border bg-bg hover:bg-bg-emphasis text-[11px] font-medium text-text-muted hover:text-text transition-colors cursor-pointer shadow-2xs"
					title="Jump to today (T)"
				>
					Today
				</button>
			</div>
		</div>

		<!-- Right Controls -->
		<div class="flex items-center gap-2.5">
			<!-- Sync Button -->
			<button
				type="button"
				onclick={() => calendarState.refresh()}
				disabled={calendarState.isSyncing}
				class="h-7 px-2.5 rounded-lg border border-border bg-bg hover:bg-bg-emphasis text-text-muted hover:text-text text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
				title="Sync with Google Calendar"
			>
				<RefreshCwIcon
					class={`w-3.5 h-3.5 stroke-[1.8] ${calendarState.isSyncing ? 'animate-spin text-accent' : ''}`}
				/>
				<span class="text-[11px] font-medium hidden sm:inline">
					{calendarState.isSyncing ? 'Syncing...' : 'Sync'}
				</span>
			</button>

			<!-- Signal Yellow / Orange Plus Button -->
			<button
				type="button"
				onclick={() => openCreateModal()}
				class="h-7 px-3 rounded-lg bg-accent text-slate-950 font-bold hover:brightness-105 active:scale-95 text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
				title="Create new event"
			>
				<PlusIcon class="w-3.5 h-3.5 stroke-[2.5]" />
				<span>New Event</span>
			</button>
		</div>
	</header>

	<!-- 3-Column Standardized Instrument Layout -->
	<div class="flex-1 min-h-0 flex overflow-hidden">
		<!-- Column 1: Calendar Navigation (Views & Calendars) -->
		<div
			data-sidebar
			class={`w-48 shrink-0 border-r border-border bg-bg-secondary flex flex-col overflow-hidden ${
				!sidebarVisible
					? '!w-0 opacity-0 pointer-events-none border-r-0'
					: 'opacity-100'
			}`}
		>
			<CalendarNavigation onOpenCreateModal={() => openCreateModal()} />
		</div>

		<!-- Column 2: Day Agenda / Events List -->
		<div
			data-calendar-agenda
			style:width={!sidebarVisible
				? '0px'
				: 'var(--sidebar-width, 16rem)'}
			class={`shrink-0 border-r border-border bg-bg flex flex-col overflow-hidden relative ${
				!sidebarVisible
					? '!w-0 opacity-0 pointer-events-none border-r-0'
					: 'opacity-100'
			}`}
		>
			<CalendarAgenda
				onOpenCreateModal={(date) => openCreateModal(date)}
				onOpenEditModal={(ev) => openEditModal(ev)}
			/>
		</div>

		<!-- Column 3: Main Calendar Canvas -->
		<main class="flex-1 min-w-0 flex flex-col overflow-hidden bg-bg">
			{#if calendarState.viewMode === 'month'}
				<!-- MONTH VIEW (Full Width Grid) -->
				<div class="flex-1 min-w-0 flex flex-col overflow-hidden">
					<!-- Weekday Labels -->
					<div
						class="grid grid-cols-7 border-b border-border bg-bg-secondary text-[11px] font-bold tracking-[0.08em] text-text-muted/80 text-center py-2 shrink-0"
					>
						{#each DAY_LABELS as label}
							<div>{label}</div>
						{/each}
					</div>

					<!-- Weeks container -->
					<div
						class="flex-1 min-h-0 flex flex-col divide-y divide-border/60 bg-border/20 overflow-hidden"
					>
						{#each monthWeeks as week (week.weekIndex)}
							<div
								class="flex-1 min-h-0 relative flex flex-col overflow-hidden bg-bg"
							>
								<!-- Day Cells Background Layer -->
								<div
									class="absolute inset-0 grid grid-cols-7 divide-x divide-border/60 pointer-events-auto"
								>
									{#each week.days as cell (cell.key)}
										<!-- svelte-ignore a11y_click_events_have_key_events -->
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<div
											onclick={() =>
												calendarState.setSelectedDate(
													cell.date
												)}
											ondblclick={() =>
												openCreateModal(cell.date)}
											class={`flex flex-col p-1.5 transition-colors cursor-pointer relative group ${
												cell.isSelected
													? 'ring-2 ring-accent ring-inset bg-bg-emphasis/30 z-10'
													: ''
											} ${!cell.isCurrentMonth ? 'opacity-40 bg-bg-secondary/40' : 'hover:bg-bg-emphasis/40'}`}
										>
											<!-- Day Header -->
											<div
												class="flex items-center justify-between mb-1"
											>
												<span
													class={`w-5 h-5 rounded-full flex items-center justify-center tabular-nums text-xs font-semibold ${
														cell.isToday
															? 'bg-accent text-slate-950 font-bold shadow-xs'
															: cell.isSelected
																? 'text-accent font-bold'
																: 'text-text'
													}`}
												>
													{cell.date.getDate()}
												</span>

												<!-- Quick Plus button on hover -->
												<button
													type="button"
													onclick={(e) => {
														e.stopPropagation()
														openCreateModal(
															cell.date
														)
													}}
													class="w-4 h-4 rounded hover:bg-bg-emphasis text-text-muted hover:text-text items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hidden sm:flex cursor-pointer"
													title="Add event on this day"
												>
													<PlusIcon
														class="w-3 h-3 stroke-[2]"
													/>
												</button>
											</div>
										</div>
									{/each}
								</div>

								<!-- Events Spanning Overlay Layer -->
								<div
									class="relative w-full h-full pointer-events-none grid grid-cols-7 gap-y-1 content-start overflow-hidden px-1 pt-7"
									style="grid-auto-rows: 20px;"
								>
									{#each week.segments as seg (seg.event.id + '-' + week.weekIndex)}
										<!-- svelte-ignore a11y_click_events_have_key_events -->
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<div
											onclick={(e) => {
												e.stopPropagation()
												openEditModal(seg.event)
											}}
											style:grid-column={`${seg.startCol + 1} / span ${seg.span}`}
											style:grid-row={`${seg.track + 1}`}
											style:background-color={seg.event
												.color || '#3b82f6'}
											style:color={getContrastTextColor(
												seg.event.color || '#3b82f6'
											)}
											class={`h-[19px] px-2 text-[10px] flex items-center gap-1 overflow-hidden pointer-events-auto cursor-pointer shadow-xs transition-all hover:brightness-110 active:scale-[0.99] select-none z-10 ${
												seg.startsThisWeek
													? 'rounded-l-md ml-0.5'
													: 'rounded-l-none'
											} ${
												seg.endsThisWeek
													? 'rounded-r-md mr-0.5'
													: 'rounded-r-none'
											}`}
											title={`${seg.event.title} (${seg.event.allDay ? 'All day' : formatTime(seg.event.startTime)})`}
										>
											{#if seg.event.meetLink}
												<VideoIcon
													class="w-2.5 h-2.5 stroke-[2] shrink-0"
												/>
											{/if}
											<span
												class="truncate font-semibold tracking-tight leading-none"
											>
												{seg.event.title}
											</span>
											{#if !seg.event.allDay && seg.startsThisWeek}
												<span
													class="text-[9px] opacity-80 shrink-0 font-mono tabular-nums ml-0.5"
												>
													{formatTime(
														seg.event.startTime
													)}
												</span>
											{/if}
										</div>
									{/each}

									<!-- Overflow count tags (+N more) -->
									{#each week.moreCounts as more, colIndex}
										{#if more > 0}
											<div
												style:grid-column={`${colIndex + 1} / span 1`}
												style:grid-row={`${MAX_MONTH_TRACKS + 1}`}
												class="text-[9px] font-semibold text-text-muted px-1.5 pt-0.5 truncate pointer-events-none"
											>
												+{more} more
											</div>
										{/if}
									{/each}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else if calendarState.viewMode === 'week'}
				<!-- WEEK VIEW (Hourly 7-column time grid) -->
				{@const weekDays = getWeekDays(calendarState.selectedDate)}
				<div class="flex-1 flex flex-col min-w-0 overflow-hidden">
					<!-- Week Header -->
					<div
						class="grid grid-cols-8 border-b border-border bg-bg-secondary shrink-0 text-center py-2 text-xs"
					>
						<div
							class="text-[10px] text-text-muted uppercase font-bold flex items-center justify-center"
						>
							GMT
						</div>
						{#each weekDays as d (d.toISOString())}
							{@const isToday =
								formatEventDateKey(new Date()) ===
								formatEventDateKey(d)}
							<div class="flex flex-col items-center">
								<span
									class="text-[10px] uppercase text-text-muted font-bold tracking-wider"
								>
									{DAY_LABELS[
										d.getDay() === 0 ? 6 : d.getDay() - 1
									]}
								</span>
								<span
									class={`w-6 h-6 rounded-full flex items-center justify-center tabular-nums font-bold mt-0.5 ${
										isToday
											? 'bg-accent text-slate-950'
											: 'text-text'
									}`}
								>
									{d.getDate()}
								</span>
							</div>
						{/each}
					</div>

					<!-- Scrollable Hourly Grid -->
					<div class="flex-1 overflow-y-auto">
						<div
							class="grid grid-cols-8 divide-x divide-border min-h-[1440px]"
						>
							<!-- Hour Labels Column -->
							<div
								class="space-y-[60px] pt-2 text-[10px] tabular-nums text-text-muted text-right pr-2"
							>
								{#each Array(24).fill(0) as _, h}
									<div class="h-0 -translate-y-2">
										{String(h).padStart(2, '0')}:00
									</div>
								{/each}
							</div>

							<!-- 7 Day Columns -->
							{#each weekDays as d (d.toISOString())}
								{@const dayKey = formatEventDateKey(d)}
								{@const dayEvents =
									calendarState.eventsByDate.get(dayKey) ||
									[]}
								<!-- svelte-ignore a11y_click_events_have_key_events -->
								<!-- svelte-ignore a11y_no_static_element_interactions -->
								<div
									class="relative divide-y divide-border/30 hover:bg-bg-emphasis/10 transition-colors"
									ondblclick={() => openCreateModal(d)}
								>
									{#each Array(24).fill(0) as _}
										<div
											class="h-[60px] border-b border-border/20"
										></div>
									{/each}

									<!-- Placed Events -->
									{#each dayEvents as ev (ev.id)}
										{@const start = parseEventDate(
											ev.startTime
										)}
										{@const end = parseEventDate(
											ev.endTime
										)}
										{@const startHour = ev.allDay
											? 0
											: start.getHours() +
												start.getMinutes() / 60}
										{@const durationHours = ev.allDay
											? 1
											: Math.max(
													0.5,
													(end.getTime() -
														start.getTime()) /
														(1000 * 60 * 60)
												)}
										<!-- svelte-ignore a11y_click_events_have_key_events -->
										<!-- svelte-ignore a11y_no_static_element_interactions -->
										<div
											onclick={(e) => {
												e.stopPropagation()
												openEditModal(ev)
											}}
											style:top={`${startHour * 60}px`}
											style:height={`${Math.max(28, durationHours * 60 - 2)}px`}
											style:background-color={ev.color
												? `${ev.color}25`
												: 'rgba(234,179,8,0.2)'}
											style:border-left-color={ev.color ||
												'var(--color-accent)'}
											class="absolute left-1 right-1 rounded p-1 text-[10px] border-l-2 overflow-hidden shadow-2xs hover:brightness-95 hover:z-20 cursor-pointer flex flex-col justify-between"
										>
											<div
												class="font-bold text-text truncate leading-tight"
											>
												{ev.title}
											</div>
											<div
												class="tabular-nums text-[9px] text-text-muted truncate"
											>
												{formatTime(ev.startTime)}
											</div>
										</div>
									{/each}
								</div>
							{/each}
						</div>
					</div>
				</div>
			{:else if calendarState.viewMode === 'day'}
				<!-- DAY VIEW (Detailed Single Day Chronological Timeline) -->
				<div class="flex-1 flex flex-col min-w-0 overflow-hidden">
					<!-- Day Banner -->
					<div
						class="p-4 border-b border-border bg-bg-secondary flex items-center justify-between shrink-0"
					>
						<div>
							<h2 class="font-bold text-sm text-text">
								{calendarState.selectedDate.toLocaleDateString(
									[],
									{
										weekday: 'long',
										month: 'long',
										day: 'numeric',
										year: 'numeric'
									}
								)}
							</h2>
							<p
								class="text-[11px] text-text-muted tabular-nums mt-0.5"
							>
								{selectedDayEvents.length} event{selectedDayEvents.length ===
								1
									? ''
									: 's'} scheduled today
							</p>
						</div>

						<button
							type="button"
							onclick={() =>
								openCreateModal(calendarState.selectedDate)}
							class="px-3 py-1.5 rounded-lg bg-accent text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:brightness-105 transition-all cursor-pointer shadow-sm"
						>
							<PlusIcon class="w-3.5 h-3.5 stroke-[2.5]" />
							<span>Add Event</span>
						</button>
					</div>

					<!-- Scrollable Hourly Day Grid -->
					<div class="flex-1 overflow-y-auto p-6">
						<div class="max-w-3xl mx-auto space-y-3">
							{#if selectedDayEvents.length === 0}
								<div class="py-24 text-center text-text-muted">
									<ClockIcon
										class="w-10 h-10 stroke-[1.5] mx-auto mb-3 opacity-30"
									/>
									<p class="font-semibold text-sm">
										No events scheduled for this day
									</p>
									<p class="text-xs opacity-70 mt-1">
										Click "Add Event" above to create an
										event directly in Google Calendar.
									</p>
								</div>
							{:else}
								{#each selectedDayEvents as ev (ev.id)}
									<!-- svelte-ignore a11y_click_events_have_key_events -->
									<!-- svelte-ignore a11y_no_static_element_interactions -->
									<div
										onclick={() => openEditModal(ev)}
										class="p-4 rounded-xl border border-border bg-bg hover:border-accent transition-all cursor-pointer shadow-2xs flex items-start justify-between gap-4 group"
									>
										<div class="min-w-0 flex-1">
											<div
												class="flex items-center gap-2"
											>
												<span
													class="w-3 h-3 rounded-full shrink-0 shadow-2xs"
													style:background-color={ev.color ||
														'#eab308'}
												></span>
												<h3
													class="font-bold text-sm text-text truncate group-hover:text-accent transition-colors"
												>
													{ev.title}
												</h3>
											</div>

											<div
												class="mt-2 flex flex-wrap items-center gap-4 text-xs tabular-nums text-text-muted"
											>
												<span
													class="flex items-center gap-1.5"
												>
													<ClockIcon
														class="w-3.5 h-3.5 stroke-[2] opacity-70"
													/>
													{#if ev.allDay}
														All day
													{:else}
														{formatTime(
															ev.startTime
														)} – {formatTime(
															ev.endTime
														)}
													{/if}
												</span>

												{#if ev.location}
													<span
														class="flex items-center gap-1.5 truncate max-w-xs"
													>
														<MapPinIcon
															class="w-3.5 h-3.5 stroke-[2] opacity-70"
														/>
														{ev.location}
													</span>
												{/if}
											</div>

											{#if ev.attendees.length > 0}
												<div
													class="mt-2 flex items-center gap-2 text-xs text-text-muted"
												>
													<UsersIcon
														class="w-3.5 h-3.5 stroke-[2] opacity-70"
													/>
													<span class="truncate">
														Guests: {ev.attendees.join(
															', '
														)}
													</span>
												</div>
											{/if}

											{#if ev.description}
												<p
													class="mt-3 text-xs text-text-muted/90 leading-relaxed border-t border-border/50 pt-2 font-sans"
												>
													{ev.description}
												</p>
											{/if}
										</div>

										{#if ev.meetLink}
											<button
												type="button"
												onclick={(e) => {
													e.stopPropagation()
													ev.meetLink &&
														calendarState.openMeeting(
															ev.meetLink
														)
												}}
												class="px-3 py-1.5 rounded-lg bg-accent text-slate-950 font-bold text-xs flex items-center gap-1.5 hover:brightness-105 transition-all cursor-pointer shadow-sm shrink-0"
											>
												<VideoIcon
													class="w-3.5 h-3.5 stroke-[2.2]"
												/>
												<span>Join Meeting</span>
											</button>
										{/if}
									</div>
								{/each}
							{/if}
						</div>
					</div>
				</div>
			{/if}
		</main>
	</div>
</div>

{#if eventModalOpen}
	<EventModal
		open={eventModalOpen}
		event={selectedEvent}
		defaultDate={modalDate}
		onclose={() => {
			eventModalOpen = false
		}}
	/>
{/if}
