<script lang="ts">
	import { flightsState } from '../../context/flights.svelte'
	import FlightList from './FlightList.svelte'
	import FlightInstrument from './FlightInstrument.svelte'
	import AddFlightModal from './AddFlightModal.svelte'
	import FlightLogbookModal from './FlightLogbookModal.svelte'
	import { ArrowLeftIcon, PlaneIcon, PlusIcon } from '../icons'
	import { isMac } from '../../lib/platform'

	interface Props {
		onBack: () => void
		sidebarVisible?: boolean
	}

	let { onBack }: Props = $props()

	let addModalOpen = $state(false)
	let logbookOpen = $state(false)

	let currentFlight = $derived(flightsState.currentFlight)
</script>

<div class="h-full flex flex-col bg-bg text-text select-none overflow-hidden">
	<!-- Top Bar -->
	<div
		class={`h-11 px-4 flex items-center justify-between border-b shrink-0 select-none bg-bg-secondary border-border z-20 ${
			isMac ? 'pl-20' : ''
		}`}
	>
		<!-- Left: Back Button & Title -->
		<div class="flex items-center gap-3">
			<button
				type="button"
				onclick={onBack}
				class="p-1 rounded-md text-text-muted hover:text-text hover:bg-bg-muted transition-colors cursor-pointer"
				title="Back to Notes (Esc)"
			>
				<ArrowLeftIcon class="w-4 h-4 stroke-[2]" />
			</button>

			<div class="flex items-center gap-2">
				<PlaneIcon class="w-4 h-4 text-accent" />
				<span class="font-bold tracking-tight text-xs uppercase font-mono text-text">
					FLIGHT INSTRUMENT
				</span>
				<span class="text-xs text-text-muted/60">/</span>
				<span class="text-xs font-mono text-text-muted">
					{flightsState.flights.length} {flightsState.flights.length === 1 ? 'FLIGHT' : 'FLIGHTS'}
				</span>
			</div>
		</div>

		<!-- Right: Quick Add Knob -->
		<div class="flex items-center gap-2">
			<button
				type="button"
				onclick={() => (logbookOpen = true)}
				class="px-2.5 py-1 rounded-md text-xs font-mono text-text-muted hover:text-text hover:bg-bg-muted transition-colors cursor-pointer border border-border"
			>
				PASSPORT
			</button>
			<button
				type="button"
				onclick={() => (addModalOpen = true)}
				class="px-3 py-1 rounded-md bg-accent text-white text-xs font-mono font-semibold flex items-center gap-1.5 hover:opacity-90 transition-opacity cursor-pointer shadow-2xs"
			>
				<PlusIcon class="w-3.5 h-3.5 stroke-[2.5]" />
				<span>ADD FLIGHT</span>
			</button>
		</div>
	</div>

	<!-- Split-Pane Body -->
	<div class="flex-1 flex overflow-hidden">
		<!-- Column 1: Flight List -->
		<div class="w-72 md:w-80 h-full shrink-0">
			<FlightList
				onOpenAddModal={() => (addModalOpen = true)}
				onOpenLogbook={() => (logbookOpen = true)}
			/>
		</div>

		<!-- Column 2: Master Instrument Dashboard -->
		<div class="flex-1 h-full overflow-hidden bg-bg relative">
			{#if currentFlight}
				<FlightInstrument flight={currentFlight} />
			{:else}
				<div class="h-full flex flex-col items-center justify-center gap-3 p-8 text-center text-text-muted font-mono">
					<PlaneIcon class="w-12 h-12 opacity-25 stroke-[1.5]" />
					<span class="text-sm">No flight selected</span>
					<button
						type="button"
						onclick={() => (addModalOpen = true)}
						class="mt-2 px-4 py-2 rounded-xl bg-accent text-white text-xs font-bold hover:opacity-90 cursor-pointer shadow-xs"
					>
						+ Add Your First Flight
					</button>
				</div>
			{/if}
		</div>
	</div>

	<!-- Modals -->
	<AddFlightModal bind:open={addModalOpen} onClose={() => (addModalOpen = false)} />
	<FlightLogbookModal bind:open={logbookOpen} onClose={() => (logbookOpen = false)} />
</div>
