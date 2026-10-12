import { toast } from 'svelte-sonner'
import * as mailService from '../services/mail'
import type {
	MailLabel,
	MailThread,
	MailMessage,
	SendMailPayload
} from '../types/mail'

export class MailState {
	connected = $state<boolean>(false)
	userEmail = $state<string | null>(null)
	userName = $state<string | null>(null)
	lastSynced = $state<number | null>(null)
	unreadCount = $state<number>(0)
	labels = $state<MailLabel[]>([])
	threads = $state<MailThread[]>([])

	activeLabelId = $state<string>('INBOX')
	selectedThreadId = $state<string | null>(null)
	currentThread = $state<MailThread | null>(null)
	searchQuery = $state<string>('')

	isSyncing = $state<boolean>(false)
	isAuthenticating = $state<boolean>(false)
	isLoadingThread = $state<boolean>(false)
	isSending = $state<boolean>(false)
	error = $state<string | null>(null)

	private pollTimer: number | null = null

	constructor() {
		if (typeof window !== 'undefined') {
			void this.init()
		}
	}

	async init() {
		try {
			const state = await mailService.getMailState()
			this.connected = state.connected
			this.userEmail = state.userEmail || null
			this.userName = state.userName || null
			this.lastSynced = state.lastSynced || null
			this.unreadCount = state.unreadCount || 0
			this.labels = state.labels || []
			this.threads = state.threads || []

			if (this.threads.length > 0 && !this.selectedThreadId) {
				// Automatically select first thread if in INBOX
				const first = this.filteredThreads[0]
				if (first) {
					void this.selectThread(first.id)
				}
			}

			if (this.connected) {
				void this.refresh()
			}
		} catch (err) {
			console.error('[Mail] Init error:', err)
		}

		this.setupListeners()
	}

	private setupListeners() {
		// Window focus refresh
		const handleFocus = () => {
			if (this.connected && !this.isSyncing) {
				void this.refresh()
			}
		}
		window.addEventListener('focus', handleFocus)

		// 2-minute auto-polling
		if (this.pollTimer !== null) {
			clearInterval(this.pollTimer)
		}
		this.pollTimer = window.setInterval(
			() => {
				if (this.connected && !this.isSyncing) {
					void this.refresh()
				}
			},
			2 * 60 * 1000
		)
	}

	get filteredThreads(): MailThread[] {
		const q = this.searchQuery.trim().toLowerCase()
		const active = this.activeLabelId

		return this.threads.filter((t) => {
			// 1. Label filter
			if (active === 'INBOX') {
				if (
					!t.labelIds.includes('INBOX') ||
					t.labelIds.includes('TRASH') ||
					t.labelIds.includes('SPAM')
				) {
					return false
				}
			} else if (active === 'STARRED') {
				if (!t.starred) return false
			} else if (active === 'SENT') {
				if (!t.labelIds.includes('SENT')) return false
			} else if (active === 'DRAFT') {
				if (!t.labelIds.includes('DRAFT')) return false
			} else if (active === 'TRASH') {
				if (!t.labelIds.includes('TRASH')) return false
			} else if (active === 'ARCHIVE') {
				if (
					t.labelIds.includes('INBOX') ||
					t.labelIds.includes('TRASH') ||
					t.labelIds.includes('SPAM')
				) {
					return false
				}
			} else if (active !== 'ALL') {
				// Custom label
				if (!t.labelIds.includes(active)) return false
			}

			// 2. Query filter
			if (q) {
				const matchSubj = t.subject.toLowerCase().includes(q)
				const matchFrom = t.from.toLowerCase().includes(q)
				const matchFromName =
					t.fromName?.toLowerCase().includes(q) ?? false
				const matchSnip = t.snippet.toLowerCase().includes(q)
				if (!matchSubj && !matchFrom && !matchFromName && !matchSnip) {
					return false
				}
			}

			return true
		})
	}

	async refresh() {
		if (!this.connected) return
		this.isSyncing = true
		try {
			const updated = await mailService.syncMail()
			this.connected = updated.connected
			this.userEmail = updated.userEmail || null
			this.userName = updated.userName || null
			this.lastSynced = updated.lastSynced || null
			this.unreadCount = updated.unreadCount || 0
			this.labels = updated.labels || []
			this.threads = updated.threads || []

			// Update current thread if currently selected
			if (this.selectedThreadId) {
				const found = this.threads.find(
					(t) => t.id === this.selectedThreadId
				)
				if (found && found.messages) {
					this.currentThread = found
				}
			}
		} catch (err) {
			console.warn('[Mail] Sync error:', err)
		} finally {
			this.isSyncing = false
		}
	}

	async selectThread(threadId: string) {
		this.selectedThreadId = threadId
		this.isLoadingThread = true

		try {
			const thread = await mailService.getMailThread(threadId)
			this.currentThread = thread

			// Update thread in thread list
			const idx = this.threads.findIndex((t) => t.id === threadId)
			if (idx !== -1) {
				this.threads[idx] = thread
			}

			// Auto mark as read if unread
			if (thread.unread) {
				void this.markAsRead(threadId)
			}
		} catch (err) {
			console.error('[Mail] Load thread error:', err)
			toast.error('Failed to load message thread')
		} finally {
			this.isLoadingThread = false
		}
	}

	setActiveLabel(labelId: string) {
		this.activeLabelId = labelId
		this.selectedThreadId = null
		this.currentThread = null

		const list = this.filteredThreads
		if (list.length > 0) {
			void this.selectThread(list[0].id)
		}
	}

	setSearchQuery(q: string) {
		this.searchQuery = q
	}

	async startAuth(
		clientId?: string,
		clientSecret?: string
	): Promise<boolean> {
		this.isAuthenticating = true
		this.error = null
		try {
			const state = await mailService.startMailAuth(
				clientId,
				clientSecret
			)
			this.connected = state.connected
			this.userEmail = state.userEmail || null
			this.userName = state.userName || null
			this.lastSynced = state.lastSynced || null
			this.unreadCount = state.unreadCount || 0
			this.labels = state.labels || []
			this.threads = state.threads || []

			toast.success(
				`Connected to Gmail (${state.userEmail || 'Google Account'})`
			)
			if (this.threads.length > 0) {
				void this.selectThread(this.threads[0].id)
			}
			return true
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err)
			this.error = msg
			toast.error(`Gmail connection error: ${msg}`)
			return false
		} finally {
			this.isAuthenticating = false
		}
	}

	async disconnect() {
		try {
			await mailService.disconnectMail()
			this.connected = false
			this.userEmail = null
			this.userName = null
			this.lastSynced = null
			this.unreadCount = 0
			this.labels = []
			this.threads = []
			this.selectedThreadId = null
			this.currentThread = null
			toast.success('Disconnected from Gmail')
		} catch (err) {
			console.error('[Mail] Disconnect error:', err)
			toast.error('Failed to disconnect Gmail')
		}
	}

	async archiveThread(threadId: string) {
		const thread = this.threads.find((t) => t.id === threadId)
		if (!thread) return

		try {
			const updated = await mailService.modifyMailThread({
				threadId,
				addLabelIds: [],
				removeLabelIds: ['INBOX']
			})

			const idx = this.threads.findIndex((t) => t.id === threadId)
			if (idx !== -1) {
				this.threads[idx] = updated
			}
			if (this.selectedThreadId === threadId) {
				this.currentThread = updated
			}

			toast.success('Archived thread')
			this.advanceSelectionAfterAction(threadId)
		} catch (err) {
			console.error('[Mail] Archive error:', err)
			toast.error('Failed to archive thread')
		}
	}

	async trashThread(threadId: string) {
		try {
			await mailService.trashMailThread(threadId)

			const idx = this.threads.findIndex((t) => t.id === threadId)
			if (idx !== -1) {
				this.threads[idx].labelIds = this.threads[idx].labelIds.filter(
					(l) => l !== 'INBOX'
				)
				if (!this.threads[idx].labelIds.includes('TRASH')) {
					this.threads[idx].labelIds.push('TRASH')
				}
			}

			toast.success('Moved to Trash')
			this.advanceSelectionAfterAction(threadId)
		} catch (err) {
			console.error('[Mail] Trash error:', err)
			toast.error('Failed to trash thread')
		}
	}

	async toggleStar(threadId: string) {
		const thread = this.threads.find((t) => t.id === threadId)
		if (!thread) return

		const newStarred = !thread.starred
		try {
			const updated = await mailService.modifyMailThread({
				threadId,
				addLabelIds: newStarred ? ['STARRED'] : [],
				removeLabelIds: newStarred ? [] : ['STARRED']
			})

			const idx = this.threads.findIndex((t) => t.id === threadId)
			if (idx !== -1) {
				this.threads[idx] = updated
			}
			if (this.selectedThreadId === threadId) {
				this.currentThread = updated
			}
		} catch (err) {
			console.error('[Mail] Toggle star error:', err)
		}
	}

	async toggleImportant(threadId: string) {
		const thread = this.threads.find((t) => t.id === threadId)
		if (!thread) return

		const isImportant = thread.labelIds.includes('IMPORTANT')
		try {
			const updated = await mailService.modifyMailThread({
				threadId,
				addLabelIds: !isImportant ? ['IMPORTANT'] : [],
				removeLabelIds: isImportant ? ['IMPORTANT'] : []
			})

			const idx = this.threads.findIndex((t) => t.id === threadId)
			if (idx !== -1) {
				this.threads[idx] = updated
			}
			if (this.selectedThreadId === threadId) {
				this.currentThread = updated
			}
		} catch (err) {
			console.error('[Mail] Toggle important error:', err)
			toast.error('Failed to update importance')
		}
	}

	async markAsRead(threadId: string) {
		try {
			const updated = await mailService.modifyMailThread({
				threadId,
				addLabelIds: [],
				removeLabelIds: ['UNREAD']
			})

			const idx = this.threads.findIndex((t) => t.id === threadId)
			if (idx !== -1) {
				this.threads[idx] = updated
			}
			if (this.selectedThreadId === threadId) {
				this.currentThread = updated
			}
			if (this.unreadCount > 0) {
				this.unreadCount -= 1
			}
		} catch (err) {
			console.error('[Mail] Mark read error:', err)
		}
	}

	async markAsUnread(threadId: string) {
		try {
			const updated = await mailService.modifyMailThread({
				threadId,
				addLabelIds: ['UNREAD'],
				removeLabelIds: []
			})

			const idx = this.threads.findIndex((t) => t.id === threadId)
			if (idx !== -1) {
				this.threads[idx] = updated
			}
			if (this.selectedThreadId === threadId) {
				this.currentThread = updated
			}
			this.unreadCount += 1
			toast.success('Marked as unread')
			this.advanceSelectionAfterAction(threadId)
		} catch (err) {
			console.error('[Mail] Mark unread error:', err)
		}
	}

	private advanceSelectionAfterAction(currentThreadId: string) {
		const list = this.filteredThreads
		const currentIdx = list.findIndex((t) => t.id === currentThreadId)
		if (currentIdx !== -1 && list.length > 1) {
			const nextIdx =
				currentIdx < list.length - 1 ? currentIdx + 1 : currentIdx - 1
			void this.selectThread(list[nextIdx].id)
		} else {
			this.selectedThreadId = null
			this.currentThread = null
		}
	}

	async sendReply(
		threadId: string,
		replyBody: string
	): Promise<MailMessage | null> {
		if (!this.currentThread) return null
		this.isSending = true

		try {
			const lastMsg =
				this.currentThread.messages?.[
					this.currentThread.messages.length - 1
				]
			const to = lastMsg ? [lastMsg.from] : this.currentThread.to
			const subject = this.currentThread.subject.startsWith('Re:')
				? this.currentThread.subject
				: `Re: ${this.currentThread.subject}`

			const sentMsg = await mailService.sendMail({
				to,
				subject,
				bodyText: replyBody,
				inReplyTo: lastMsg?.messageIdHeader || undefined,
				references: lastMsg?.messageIdHeader || undefined,
				threadId
			})

			// Refetch full thread
			await this.selectThread(threadId)
			toast.success('Reply dispatched')
			return sentMsg
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err)
			toast.error(`Failed to send reply: ${msg}`)
			return null
		} finally {
			this.isSending = false
		}
	}

	async sendNewMail(payload: SendMailPayload): Promise<MailMessage | null> {
		this.isSending = true
		try {
			const sent = await mailService.sendMail(payload)
			toast.success('Email sent')
			void this.refresh()
			return sent
		} catch (err: unknown) {
			const msg = err instanceof Error ? err.message : String(err)
			toast.error(`Failed to send email: ${msg}`)
			return null
		} finally {
			this.isSending = false
		}
	}
}

export const mailState = new MailState()
