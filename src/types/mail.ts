export interface MailLabel {
	id: string
	name: string
	labelType: 'system' | 'user'
	unreadCount: number
	totalCount: number
	bgColor?: string | null
	textColor?: string | null
}

export interface MailAttachment {
	id: string
	filename: string
	mimeType: string
	size: number
}

export interface MailMessage {
	id: string
	threadId: string
	from: string
	fromName?: string | null
	to: string[]
	cc: string[]
	bcc: string[]
	date: string
	timestamp: number
	subject: string
	snippet: string
	bodyHtml?: string | null
	bodyText?: string | null
	bodyMarkdown: string
	attachments: MailAttachment[]
	labelIds: string[]
	unread: boolean
	starred: boolean
	messageIdHeader?: string | null
}

export interface MailThread {
	id: string
	snippet: string
	historyId?: string | null
	subject: string
	from: string
	fromName?: string | null
	to: string[]
	date: string
	timestamp: number
	messageCount: number
	unread: boolean
	starred: boolean
	labelIds: string[]
	messages?: MailMessage[] | null
}

export interface MailSyncState {
	connected: boolean
	userEmail?: string | null
	userName?: string | null
	lastSynced?: number | null
	unreadCount: number
	labels: MailLabel[]
	threads: MailThread[]
}

export interface SendMailPayload {
	to: string[]
	cc?: string[]
	bcc?: string[]
	subject: string
	bodyText: string
	bodyHtml?: string
	inReplyTo?: string
	references?: string
	threadId?: string
}

export interface ModifyThreadPayload {
	threadId: string
	addLabelIds: string[]
	removeLabelIds: string[]
}
