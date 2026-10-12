<script lang="ts">
	import {
		calendarState,
		formatEventDateKey,
		getInclusiveEndDate,
		getExclusiveEndDate
	} from '../../context/calendar.svelte'
	import type { CalendarEvent } from '../../types/calendar'
	import {
		CalendarIcon,
		VideoIcon,
		ClockIcon,
		MapPinIcon,
		UsersIcon,
		TrashIcon,
		XIcon,
		SpinnerIcon
	} from '../icons'

	interface Props {
		open: boolean
		event?: CalendarEvent | null
		defaultDate?: Date
		onclose: () => void
	}

	let {
		open,
		event = null,
		defaultDate = new Date(),
		onclose
	}: Props = $props()

	let isEditing = $derived(!!event)

	let calendarId = $state<string>('')
	let title = $state<string>('')
	let description = $state<string>('')
	let location = $state<string>('')
	let allDay = $state<boolean>(false)
	let startDate = $state<string>('')
	let startTime = $state<string>('09:00')
	let endDate = $state<string>('')
	let endTime = $state<string>('10:00')
	let addMeet = $state<boolean>(false)
	let attendeeInput = $state<string>('')
	let attendees = $state<string[]>([])
	let isSubmitting = $state<boolean>(false)
	let isDeleting = $state<boolean>(false)

	$effect(() => {
		if (open) {
			if (event) {
				calendarId = event.calendarId
				title = event.title
				description = event.description || ''
				location = event.location || ''
				allDay = event.allDay
				attendees = [...(event.attendees || [])]
				addMeet = !!event.meetLink

				if (event.allDay) {
					startDate = event.startTime
					endDate = getInclusiveEndDate(
						event.startTime,
						event.endTime || event.startTime
					)
					startTime = '09:00'
					endTime = '10:00'
				} else {
					const s = new Date(event.startTime)
					const e = new Date(event.endTime)
					startDate = formatEventDateKey(s)
					startTime = `${String(s.getHours()).padStart(2, '0')}:${String(s.getMinutes()).padStart(2, '0')}`
					endDate = formatEventDateKey(e)
					endTime = `${String(e.getHours()).padStart(2, '0')}:${String(e.getMinutes()).padStart(2, '0')}`
				}
			} else {
				const primary =
					calendarState.calendars.find((c) => c.primary) ||
					calendarState.calendars[0]
				calendarId = primary ? primary.id : ''
				title = ''
				description = ''
				location = ''
				allDay = false
				attendees = []
				addMeet = true

				const base = defaultDate || new Date()
				startDate = formatEventDateKey(base)
				endDate = formatEventDateKey(base)
				startTime = '09:00'
				endTime = '10:00'
			}
		}
	})

	function addAttendee() {
		const email = attendeeInput.trim()
		if (email && email.includes('@') && !attendees.includes(email)) {
			attendees = [...attendees, email]
			attendeeInput = ''
		}
	}

	function removeAttendee(email: string) {
		attendees = attendees.filter((a) => a !== email)
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault()
		if (!title.trim() || !calendarId) return

		isSubmitting = true

		try {
			let startIso: string
			let endIso: string

			if (allDay) {
				startIso = startDate
				endIso = getExclusiveEndDate(endDate || startDate)
			} else {
				const [sH, sM] = startTime.split(':').map(Number)
				const [eH, eM] = endTime.split(':').map(Number)

				const [sY, sMth, sD] = startDate.split('-').map(Number)
				const startObj = new Date(sY, sMth - 1, sD, sH, sM, 0, 0)

				const [eY, eMth, eD] = (endDate || startDate)
					.split('-')
					.map(Number)
				const endObj = new Date(eY, eMth - 1, eD, eH, eM, 0, 0)

				startIso = startObj.toISOString()
				endIso = endObj.toISOString()
			}

			if (isEditing && event) {
				await calendarState.updateEvent({
					calendarId,
					eventId: event.id,
					title: title.trim(),
					description: description.trim() || undefined,
					location: location.trim() || undefined,
					startTime: startIso,
					endTime: endIso,
					allDay,
					attendees
				})
			} else {
				await calendarState.createEvent({
					calendarId,
					title: title.trim(),
					description: description.trim() || undefined,
					location: location.trim() || undefined,
					startTime: startIso,
					endTime: endIso,
					allDay,
					attendees,
					addMeet
				})
			}

			onclose()
		} catch (err) {
			console.error(err)
		} finally {
			isSubmitting = false
		}
	}

	async function handleDelete() {
		if (!event) return
		if (!confirm(`Delete event "${event.title}" from Google Calendar?`))
			return

		isDeleting = true
		try {
			await calendarState.deleteEvent(event.calendarId, event.id)
			onclose()
		} catch (err) {
			console.error(err)
		} finally {
			isDeleting = false
		}
	}
</script>

{#if open}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 bg-text/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150"
		onclick={onclose}
	>
		<!-- Modal Card -->
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div
			class="bg-bg border border-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden select-none animate-in zoom-in-95 duration-150"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			aria-modal="true"
			tabindex="-1"
		>
			<!-- Header -->
			<div
				class="px-5 py-4 bg-bg-secondary border-b border-border flex items-center justify-between"
			>
				<div class="flex items-center gap-2.5">
					<CalendarIcon class="w-4.5 h-4.5 stroke-[2] text-accent" />
					<h2 class="font-bold text-sm text-text">
						{isEditing
							? 'Edit Calendar Event'
							: 'Create Calendar Event'}
					</h2>
				</div>

				<button
					type="button"
					onclick={onclose}
					class="p-1 rounded-lg hover:bg-bg-emphasis text-text-muted hover:text-text transition-colors cursor-pointer"
				>
					<XIcon class="w-4 h-4 stroke-[2]" />
				</button>
			</div>

			<!-- Form Content -->
			<form onsubmit={handleSubmit} class="p-5 space-y-4 text-xs">
				<!-- Title Input -->
				<div>
					<label
						for="event-title"
						class="block font-semibold text-text-muted mb-1 text-[11px] uppercase tracking-wider"
					>
						Event Title
					</label>
					<input
						id="event-title"
						type="text"
						bind:value={title}
						placeholder="e.g. Design Sync, Architecture Review"
						required
						class="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border focus:border-accent focus:outline-none text-text text-sm transition-colors"
					/>
				</div>

				<!-- Calendar Picker -->
				<div>
					<label
						for="event-calendar"
						class="block font-semibold text-text-muted mb-1 text-[11px] uppercase tracking-wider"
					>
						Calendar
					</label>
					<select
						id="event-calendar"
						bind:value={calendarId}
						required
						class="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border focus:border-accent focus:outline-none text-text text-xs transition-colors cursor-pointer"
					>
						{#each calendarState.calendars as cal (cal.id)}
							<option value={cal.id}>
								{cal.summary}
								{cal.primary ? '(Primary)' : ''}
							</option>
						{/each}
					</select>
				</div>

				<!-- Date & Time Row -->
				<div
					class="p-3.5 rounded-xl bg-bg-secondary/60 border border-border space-y-3"
				>
					<div class="flex items-center justify-between">
						<span
							class="font-semibold text-text text-xs flex items-center gap-1.5"
						>
							<ClockIcon
								class="w-3.5 h-3.5 stroke-[2] opacity-70"
							/>
							Schedule
						</span>

						<label
							class="flex items-center gap-2 cursor-pointer font-medium text-text-muted hover:text-text"
						>
							<input
								type="checkbox"
								bind:checked={allDay}
								class="rounded border-border accent-accent cursor-pointer"
							/>
							<span>All day</span>
						</label>
					</div>

					<div class="grid grid-cols-2 gap-3">
						<!-- Start -->
						<div>
							<span
								class="block text-[10px] text-text-muted uppercase font-bold mb-1"
								>Start</span
							>
							<input
								type="date"
								bind:value={startDate}
								required
								class="w-full px-2.5 py-1.5 rounded-lg bg-bg border border-border text-text font-mono text-xs focus:border-accent focus:outline-none"
							/>
							{#if !allDay}
								<input
									type="time"
									bind:value={startTime}
									required
									class="w-full mt-1.5 px-2.5 py-1.5 rounded-lg bg-bg border border-border text-text font-mono text-xs focus:border-accent focus:outline-none"
								/>
							{/if}
						</div>

						<!-- End -->
						<div>
							<span
								class="block text-[10px] text-text-muted uppercase font-bold mb-1"
								>End</span
							>
							<input
								type="date"
								bind:value={endDate}
								required
								class="w-full px-2.5 py-1.5 rounded-lg bg-bg border border-border text-text font-mono text-xs focus:border-accent focus:outline-none"
							/>
							{#if !allDay}
								<input
									type="time"
									bind:value={endTime}
									required
									class="w-full mt-1.5 px-2.5 py-1.5 rounded-lg bg-bg border border-border text-text font-mono text-xs focus:border-accent focus:outline-none"
								/>
							{/if}
						</div>
					</div>
				</div>

				<!-- Google Meet Video Conference Toggle -->
				{#if !isEditing}
					<div
						class="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-bg-secondary border border-border"
					>
						<div class="flex items-center gap-2.5">
							<VideoIcon class="w-4 h-4 stroke-[2] text-accent" />
							<div>
								<span
									class="font-semibold text-text block text-xs"
									>Google Meet Video Call</span
								>
								<span class="text-[11px] text-text-muted block"
									>Add a video conference link automatically</span
								>
							</div>
						</div>

						<input
							type="checkbox"
							bind:checked={addMeet}
							class="w-4 h-4 rounded border-border accent-accent cursor-pointer"
						/>
					</div>
				{/if}

				<!-- Location -->
				<div>
					<label
						for="event-location"
						class="block font-semibold text-text-muted mb-1 text-[11px] uppercase tracking-wider flex items-center gap-1.5"
					>
						<MapPinIcon class="w-3.5 h-3.5 stroke-[2] opacity-70" />
						Location
					</label>
					<input
						id="event-location"
						type="text"
						bind:value={location}
						placeholder="Room 402, or address..."
						class="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border focus:border-accent focus:outline-none text-text text-xs transition-colors"
					/>
				</div>

				<!-- Attendees -->
				<div>
					<label
						for="event-attendees"
						class="block font-semibold text-text-muted mb-1 text-[11px] uppercase tracking-wider flex items-center gap-1.5"
					>
						<UsersIcon class="w-3.5 h-3.5 stroke-[2] opacity-70" />
						Attendees / Guests
					</label>

					<div class="flex gap-2">
						<input
							id="event-attendees"
							type="email"
							bind:value={attendeeInput}
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									e.preventDefault()
									addAttendee()
								}
							}}
							placeholder="colleague@example.com"
							class="flex-1 px-3 py-2 rounded-xl bg-bg-secondary border border-border focus:border-accent focus:outline-none text-text text-xs transition-colors"
						/>
						<button
							type="button"
							onclick={addAttendee}
							class="px-3 py-2 rounded-xl bg-bg-secondary hover:bg-bg-emphasis border border-border font-medium text-text cursor-pointer transition-colors"
						>
							Add
						</button>
					</div>

					{#if attendees.length > 0}
						<div
							class="flex flex-wrap gap-1.5 mt-2 max-h-24 overflow-y-auto"
						>
							{#each attendees as att (att)}
								<span
									class="px-2 py-0.5 rounded-full bg-bg-secondary border border-border text-[11px] font-mono flex items-center gap-1.5 text-text"
								>
									<span>{att}</span>
									<button
										type="button"
										onclick={() => removeAttendee(att)}
										class="opacity-60 hover:opacity-100 cursor-pointer"
									>
										<XIcon class="w-3 h-3 stroke-[2]" />
									</button>
								</span>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Description / Notes -->
				<div>
					<label
						for="event-description"
						class="block font-semibold text-text-muted mb-1 text-[11px] uppercase tracking-wider"
					>
						Description
					</label>
					<textarea
						id="event-description"
						bind:value={description}
						rows={3}
						placeholder="Meeting agenda, details, context..."
						class="w-full px-3 py-2 rounded-xl bg-bg-secondary border border-border focus:border-accent focus:outline-none text-text text-xs resize-none transition-colors"
					></textarea>
				</div>

				<!-- Footer Actions -->
				<div
					class="pt-3 border-t border-border flex items-center justify-between"
				>
					{#if isEditing}
						<button
							type="button"
							onclick={handleDelete}
							disabled={isDeleting || isSubmitting}
							class="px-3 py-2 rounded-xl text-red-500 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
						>
							<TrashIcon class="w-3.5 h-3.5 stroke-[2]" />
							<span>Delete</span>
						</button>
					{:else}
						<div></div>
					{/if}

					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={onclose}
							class="px-4 py-2 rounded-xl bg-bg-secondary hover:bg-bg-emphasis border border-border font-medium text-text text-xs transition-colors cursor-pointer"
						>
							Cancel
						</button>

						<button
							type="submit"
							disabled={isSubmitting ||
								isDeleting ||
								!title.trim()}
							class="px-4 py-2 rounded-xl bg-accent text-slate-950 hover:brightness-105 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-sm disabled:opacity-50"
						>
							{#if isSubmitting}
								<SpinnerIcon
									class="w-3.5 h-3.5 stroke-[2.2] animate-spin"
								/>
							{/if}
							<span
								>{isEditing
									? 'Save Changes'
									: 'Create Event'}</span
							>
						</button>
					</div>
				</div>
			</form>
		</div>
	</div>
{/if}
