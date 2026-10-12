<script lang="ts">
	import { toast } from 'svelte-sonner'
	import { mailState } from '../../context/mail.svelte'
	import { getMailAttachmentData } from '../../services/mail'
	import type { MailAttachment, MailMessage } from '../../types/mail'
	import {
		ArchiveIcon,
		TrashIcon,
		StarIcon,
		ImportanceIcon,
		ReplyIcon,
		SendIcon,
		SpinnerIcon,
		DownloadIcon,
		ImageIcon,
		XIcon
	} from '../icons'
	import { getTagColor } from '../../lib/tags'
	import { getCategoryTags, isImportantLabel } from '../../lib/mailTags'
	import * as notesService from '../../services/notes'

	let replyText = $state<string>('')
	let replyTextarea = $state<HTMLTextAreaElement | null>(null)
	let previewAttachment = $state<{
		filename: string
		mimeType: string
		data: string
		size: number
	} | null>(null)
	let loadingAttachmentId = $state<string | null>(null)
	let tagColors = $state<Record<string, string> | undefined>(undefined)

	$effect(() => {
		notesService
			.getSettings()
			.then((s) => {
				tagColors = s.tagColors
			})
			.catch((err) => {
				console.error('Failed to load settings in MailThreadReader:', err)
			})
	})

	let thread = $derived(mailState.currentThread)
	let messages = $derived(thread?.messages || [])
	let isImportant = $derived(isImportantLabel(thread?.labelIds))
	let categories = $derived(getCategoryTags(thread?.labelIds))

	function handleArchive() {
		if (thread) void mailState.archiveThread(thread.id)
	}

	function handleTrash() {
		if (thread) void mailState.trashThread(thread.id)
	}

	function handleToggleStar() {
		if (thread) void mailState.toggleStar(thread.id)
	}

	function handleToggleImportant() {
		if (thread) void mailState.toggleImportant(thread.id)
	}

	function handleMarkUnread() {
		if (thread) void mailState.markAsUnread(thread.id)
	}

	async function handleSendReply() {
		if (!thread || !replyText.trim() || mailState.isSending) return
		const sent = await mailState.sendReply(thread.id, replyText.trim())
		if (sent) {
			replyText = ''
		}
	}

	function handleReplyKeyDown(e: KeyboardEvent) {
		if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
			e.preventDefault()
			void handleSendReply()
		}
	}

	export function focusReply() {
		if (replyTextarea) {
			replyTextarea.focus()
		}
	}

	function getEmailHtml(msg: MailMessage): string {
		if (msg.bodyHtml && msg.bodyHtml.trim()) {
			return msg.bodyHtml
		}
		const text = msg.bodyText || msg.snippet || ''
		const escaped = text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/\n/g, '<br/>')
		return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 13px;
    line-height: 1.6;
    color: #1f2937;
    margin: 16px;
    word-break: break-word;
  }
</style>
</head>
<body>
${escaped}
</body>
</html>`
	}

	function handleIframeLoad(iframe: HTMLIFrameElement) {
		try {
			const doc = iframe.contentDocument || iframe.contentWindow?.document
			if (!doc) return

			// Make links open in external browser or new tab
			const anchors = doc.querySelectorAll('a')
			anchors.forEach((a) => {
				a.setAttribute('target', '_blank')
				a.setAttribute('rel', 'noopener noreferrer')
			})

			const updateHeight = () => {
				if (!doc.body) return
				const height = Math.max(
					doc.body.scrollHeight,
					doc.documentElement?.scrollHeight || 0,
					150
				)
				iframe.style.height = `${height + 24}px`
			}

			updateHeight()

			// Listen for image loads inside iframe to adjust height
			const images = doc.querySelectorAll('img')
			images.forEach((img) => {
				if (!img.complete) {
					img.addEventListener('load', updateHeight)
					img.addEventListener('error', updateHeight)
				}
			})

			// ResizeObserver for dynamic content
			if (typeof ResizeObserver !== 'undefined' && doc.body) {
				const ro = new ResizeObserver(() => updateHeight())
				ro.observe(doc.body)
			}
		} catch (err) {
			console.error('Error auto-resizing iframe:', err)
		}
	}

	function triggerDownload(
		filename: string,
		mimeType: string,
		base64Data: string
	) {
		try {
			const byteCharacters = atob(base64Data)
			const byteNumbers = new Array(byteCharacters.length)
			for (let i = 0; i < byteCharacters.length; i++) {
				byteNumbers[i] = byteCharacters.charCodeAt(i)
			}
			const byteArray = new Uint8Array(byteNumbers)
			const blob = new Blob([byteArray], { type: mimeType })
			const url = URL.createObjectURL(blob)
			const a = document.createElement('a')
			a.href = url
			a.download = filename
			document.body.appendChild(a)
			a.click()
			document.body.removeChild(a)
			URL.revokeObjectURL(url)
		} catch (err) {
			console.error('Download error:', err)
			toast.error('Failed to download attachment')
		}
	}

	async function handleAttachmentClick(msgId: string, att: MailAttachment) {
		loadingAttachmentId = att.id
		try {
			const res = await getMailAttachmentData(msgId, att.id)
			if (
				att.mimeType.startsWith('image/') ||
				att.mimeType === 'application/pdf'
			) {
				previewAttachment = {
					filename: att.filename,
					mimeType: att.mimeType,
					data: res.data,
					size: res.size || att.size
				}
			} else {
				triggerDownload(att.filename, att.mimeType, res.data)
			}
		} catch (err) {
			console.error('Failed to load attachment:', err)
			toast.error('Failed to load attachment')
		} finally {
			loadingAttachmentId = null
		}
	}

	async function handleAttachmentDownload(
		msgId: string,
		att: MailAttachment,
		e: MouseEvent
	) {
		e.stopPropagation()
		loadingAttachmentId = att.id
		try {
			const res = await getMailAttachmentData(msgId, att.id)
			triggerDownload(att.filename, att.mimeType, res.data)
		} catch (err) {
			console.error('Failed to download attachment:', err)
			toast.error('Failed to download attachment')
		} finally {
			loadingAttachmentId = null
		}
	}
</script>

<div class="h-full flex flex-col bg-bg text-text select-text overflow-hidden">
	{#if mailState.isLoadingThread}
		<div
			class="flex-1 flex flex-col items-center justify-center text-text-muted text-xs gap-2"
		>
			<SpinnerIcon
				class="w-5 h-5 animate-spin stroke-[1.5] text-accent"
			/>
			<span>Loading thread...</span>
		</div>
	{:else if !thread}
		<div
			class="flex-1 flex flex-col items-center justify-center text-text-muted text-xs p-8 text-center"
		>
			<div
				class="w-12 h-12 rounded-2xl bg-bg-secondary border border-border flex items-center justify-center mb-3 text-text-muted/50"
			>
				<ReplyIcon class="w-6 h-6 stroke-[1.5]" />
			</div>
			<p class="font-medium text-sm text-text mb-1">
				No conversation selected
			</p>
			<p class="text-text-muted/70 max-w-xs text-xs">
				Select an email thread from the list or press <kbd
					class="px-1.5 py-0.5 rounded bg-bg-muted font-mono text-[10px]"
					>C</kbd
				> to compose a new message.
			</p>
		</div>
	{:else}
		<!-- Thread Top Action Bar -->
		<div
			class="h-11 px-4 border-b border-border flex items-center justify-between shrink-0 bg-bg-secondary/40 select-none"
		>
			<!-- Left Quick Actions -->
			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={handleArchive}
					class="p-1.5 rounded-md hover:bg-bg-muted text-text-muted hover:text-text transition-colors cursor-pointer"
					title="Archive (E)"
				>
					<ArchiveIcon class="w-3.5 h-3.5 stroke-[1.8]" />
				</button>

				<button
					type="button"
					onclick={handleTrash}
					class="p-1.5 rounded-md hover:bg-bg-muted text-text-muted hover:text-red-500 transition-colors cursor-pointer"
					title="Move to Trash (#)"
				>
					<TrashIcon class="w-3.5 h-3.5 stroke-[1.8]" />
				</button>

				<button
					type="button"
					onclick={handleMarkUnread}
					class="px-2 py-1 rounded-md hover:bg-bg-muted text-[11px] font-medium text-text-muted hover:text-text transition-colors cursor-pointer"
					title="Mark Unread (U)"
				>
					Mark Unread
				</button>

				<button
					type="button"
					onclick={handleToggleStar}
					class={`p-1.5 rounded-md hover:bg-bg-muted transition-colors cursor-pointer ${
						thread.starred
							? 'text-amber-400'
							: 'text-text-muted hover:text-text'
					}`}
					title={thread.starred ? 'Unstar' : 'Star'}
				>
					<StarIcon class="w-3.5 h-3.5" filled={thread.starred} />
				</button>

				<button
					type="button"
					onclick={handleToggleImportant}
					class={`p-1.5 rounded-md hover:bg-bg-muted transition-colors cursor-pointer ${
						isImportant
							? 'text-amber-500'
							: 'text-text-muted hover:text-text'
					}`}
					title={isImportant ? 'Mark not important' : 'Mark important'}
				>
					<ImportanceIcon class="w-3.5 h-3.5" filled={isImportant} />
				</button>
			</div>
		</div>

		<!-- Thread Content Area -->
		<div class="flex-1 overflow-y-auto p-6 space-y-6">
			<!-- Subject Header -->
			<div class="border-b border-border pb-4">
				<div class="flex items-start gap-2.5 mb-2">
					{#if isImportant}
						<span
							title="Important"
							class="text-amber-500 mt-1 shrink-0"
						>
							<ImportanceIcon class="w-4.5 h-4.5" filled={true} />
						</span>
					{/if}
					<h1 class="text-xl font-bold text-text tracking-tight">
						{thread.subject || '(no subject)'}
					</h1>
				</div>

				<!-- Badges / Category Tags -->
				<div class="flex flex-wrap items-center gap-1.5">
					{#each categories as category (category)}
						{@const color = getTagColor(category, tagColors)}
						<span
							class="text-[10px] font-mono px-2 py-0.5 rounded-full border truncate font-medium select-none"
							style:background-color="{color}18"
							style:border-color="{color}30"
							style:color
						>
							#{category}
						</span>
					{/each}

					{#each thread.labelIds as labelId (labelId)}
						{@const isCategory = labelId.startsWith('CATEGORY_')}
						{@const isSys = [
							'INBOX',
							'SENT',
							'STARRED',
							'UNREAD',
							'IMPORTANT'
						].includes(labelId)}
						{#if !isCategory && !isSys}
							<span
								class="text-[10px] font-mono px-2 py-0.5 rounded-md bg-accent/15 text-accent font-semibold border border-accent/20"
							>
								{labelId}
							</span>
						{/if}
					{/each}
				</div>
			</div>

			<!-- Messages Chain -->
			<div class="space-y-6">
				{#each messages as msg (msg.id)}
					<div
						class="rounded-xl border border-border bg-bg-secondary/20 p-5 shadow-2xs"
					>
						<!-- Message Header Row -->
						<div
							class="flex items-start justify-between gap-4 mb-4"
						>
							<div class="flex items-center gap-3 min-w-0">
								<!-- Avatar circle with initials -->
								<div
									class="w-8 h-8 rounded-full bg-bg-emphasis border border-border flex items-center justify-center font-bold text-xs text-text shrink-0"
								>
									{(msg.fromName || msg.from || '?')
										.charAt(0)
										.toUpperCase()}
								</div>

								<div class="min-w-0">
									<div class="flex items-center gap-2">
										<span
											class="text-xs font-semibold text-text truncate"
										>
											{msg.fromName || msg.from}
										</span>
										<span
											class="text-[11px] font-mono text-text-muted/70 truncate"
										>
											&lt;{msg.from}&gt;
										</span>
									</div>
									<div
										class="text-[11px] text-text-muted/60 truncate"
									>
										to {msg.to.join(', ')}
									</div>
								</div>
							</div>

							<div
								class="text-[11px] font-mono text-text-muted/70 shrink-0"
							>
								{msg.date}
							</div>
						</div>

						<!-- Message Body (Always standard iframe) -->
						<div
							class="w-full rounded-lg overflow-hidden border border-border bg-white"
						>
							<iframe
								title={`Email Body ${msg.id}`}
								sandbox="allow-same-origin allow-popups"
								srcdoc={getEmailHtml(msg)}
								onload={(e) =>
									handleIframeLoad(
										e.currentTarget as HTMLIFrameElement
									)}
								class="w-full min-h-[160px] border-none block"
							></iframe>
						</div>

						<!-- Attachments (if any) -->
						{#if msg.attachments && msg.attachments.length > 0}
							<div
								class="mt-4 pt-3 border-t border-border flex flex-wrap gap-2"
							>
								{#each msg.attachments as att (att.id)}
									<button
										type="button"
										onclick={() =>
											handleAttachmentClick(
												msg.id,
												att
											)}
										class="group px-3 py-2 rounded-lg border border-border bg-bg hover:bg-bg-muted hover:border-accent/40 text-[11px] flex items-center gap-2.5 transition-colors cursor-pointer text-left shadow-2xs"
										title={`Click to ${att.mimeType.startsWith('image/') || att.mimeType === 'application/pdf' ? 'preview' : 'download'} ${att.filename}`}
									>
										<div
											class="p-1 rounded bg-bg-muted group-hover:bg-accent/15 text-text-muted group-hover:text-accent transition-colors"
										>
											{#if att.mimeType.startsWith('image/')}
												<ImageIcon
													class="w-3.5 h-3.5 stroke-[1.8]"
												/>
											{:else}
												<DownloadIcon
													class="w-3.5 h-3.5 stroke-[1.8]"
												/>
											{/if}
										</div>

										<div class="flex flex-col min-w-0">
											<span
												class="font-medium text-text truncate max-w-44"
											>
												{att.filename}
											</span>
											<span
												class="font-mono text-text-muted text-[10px]"
											>
												{Math.round(
													att.size / 1024
												)} KB
											</span>
										</div>

										{#if loadingAttachmentId === att.id}
											<SpinnerIcon
												class="w-3.5 h-3.5 animate-spin text-accent ml-1"
											/>
										{:else}
											<span
												role="button"
												tabindex="0"
												onclick={(e) =>
													handleAttachmentDownload(
														msg.id,
														att,
														e
													)}
												onkeydown={(e) => {
													if (e.key === 'Enter')
														handleAttachmentDownload(
															msg.id,
															att,
															e as unknown as MouseEvent
														)
												}}
												class="p-1 rounded hover:bg-bg-emphasis text-text-muted hover:text-text transition-colors ml-1 cursor-pointer"
												title="Download directly"
											>
												<DownloadIcon
													class="w-3 h-3 stroke-[2]"
												/>
											</span>
										{/if}
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>

			<!-- Inline Reply Card -->
			<div
				class="rounded-xl border border-border bg-bg-secondary/40 p-4 shadow-sm"
			>
				<div
					class="flex items-center justify-between text-xs font-semibold text-text mb-2"
				>
					<div class="flex items-center gap-1.5">
						<ReplyIcon
							class="w-3.5 h-3.5 stroke-[1.8] text-accent"
						/>
						<span>Reply to {thread.fromName || thread.from}</span>
					</div>
					<span class="text-[10px] font-mono text-text-muted/60"
						>⌘+Enter to dispatch</span
					>
				</div>

				<textarea
					bind:this={replyTextarea}
					bind:value={replyText}
					onkeydown={handleReplyKeyDown}
					placeholder="Write a reply..."
					rows="4"
					class="w-full p-3 rounded-lg bg-bg border border-border text-xs text-text placeholder-text-muted/60 focus:outline-none focus:border-accent transition-colors resize-y font-sans leading-relaxed"
				></textarea>

				<div class="flex items-center justify-between mt-3">
					<span class="text-[10px] text-text-muted/70">
						Plain text / Markdown supported
					</span>

					<div class="flex items-center gap-2">
						{#if replyText.trim()}
							<button
								type="button"
								onclick={() => (replyText = '')}
								class="px-3 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-text transition-colors cursor-pointer"
							>
								Clear
							</button>
						{/if}

						<button
							type="button"
							onclick={handleSendReply}
							disabled={!replyText.trim() || mailState.isSending}
							class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-accent text-slate-950 hover:brightness-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
						>
							{#if mailState.isSending}
								<SpinnerIcon
									class="w-3.5 h-3.5 animate-spin stroke-[2]"
								/>
								<span>Sending...</span>
							{:else}
								<SendIcon class="w-3.5 h-3.5 stroke-[2]" />
								<span>Send Reply</span>
							{/if}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- In-app Attachment Preview Modal -->
	{#if previewAttachment}
		<!-- svelte-ignore a11y_click_events_have_key_events -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<!-- svelte-ignore a11y_interactive_supports_focus -->
		<div
			class="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6"
			role="dialog"
			aria-modal="true"
			tabindex="-1"
			onclick={() => (previewAttachment = null)}
		>
			<div
				class="bg-bg border border-border rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
				onclick={(e) => e.stopPropagation()}
			>
				<!-- Modal Header -->
				<div
					class="h-12 px-4 border-b border-border flex items-center justify-between shrink-0 bg-bg-secondary select-none"
				>
					<div class="flex items-center gap-2 min-w-0">
						<span class="font-bold text-xs text-text truncate">
							{previewAttachment.filename}
						</span>
						<span
							class="text-[10px] font-mono text-text-muted shrink-0"
						>
							({Math.round(previewAttachment.size / 1024)} KB)
						</span>
					</div>

					<div class="flex items-center gap-2">
						<button
							type="button"
							onclick={() =>
								previewAttachment &&
								triggerDownload(
									previewAttachment.filename,
									previewAttachment.mimeType,
									previewAttachment.data
								)}
							class="h-7 px-2.5 rounded-lg border border-border bg-bg hover:bg-bg-emphasis text-xs font-medium text-text flex items-center gap-1.5 transition-colors cursor-pointer"
							title="Download file"
						>
							<DownloadIcon class="w-3.5 h-3.5 stroke-[2]" />
							<span>Download</span>
						</button>

						<button
							type="button"
							onclick={() => (previewAttachment = null)}
							class="p-1.5 rounded-lg hover:bg-bg-emphasis text-text-muted hover:text-text transition-colors cursor-pointer"
							title="Close"
						>
							<XIcon class="w-4 h-4 stroke-[2]" />
						</button>
					</div>
				</div>

				<!-- Modal Preview Content -->
				<div
					class="flex-1 overflow-auto p-4 flex items-center justify-center bg-black/20 min-h-[300px]"
				>
					{#if previewAttachment.mimeType.startsWith('image/')}
						<img
							src={`data:${previewAttachment.mimeType};base64,${previewAttachment.data}`}
							alt={previewAttachment.filename}
							class="max-h-[75vh] max-w-full rounded-lg object-contain shadow-lg"
						/>
					{:else if previewAttachment.mimeType === 'application/pdf'}
						<iframe
							title={previewAttachment.filename}
							src={`data:application/pdf;base64,${previewAttachment.data}`}
							class="w-full h-[75vh] rounded-lg border border-border bg-white"
						></iframe>
					{/if}
				</div>
			</div>
		</div>
	{/if}
</div>
