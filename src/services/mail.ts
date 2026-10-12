import { invoke } from '@tauri-apps/api/core'
import type {
	MailSyncState,
	MailThread,
	MailMessage,
	SendMailPayload,
	ModifyThreadPayload
} from '../types/mail'

export async function getMailState(): Promise<MailSyncState> {
	return invoke('mail_get_state')
}

export async function startMailAuth(
	clientId?: string,
	clientSecret?: string
): Promise<MailSyncState> {
	return invoke('mail_start_auth', {
		clientId: clientId || null,
		clientSecret: clientSecret || null
	})
}

export async function syncMail(): Promise<MailSyncState> {
	return invoke('mail_sync')
}

export async function disconnectMail(): Promise<void> {
	return invoke('mail_disconnect')
}

export async function getMailThread(threadId: string): Promise<MailThread> {
	return invoke('mail_get_thread', { threadId })
}

export async function modifyMailThread(
	payload: ModifyThreadPayload
): Promise<MailThread> {
	return invoke('mail_modify_thread', { payload })
}

export async function trashMailThread(threadId: string): Promise<void> {
	return invoke('mail_trash_thread', { threadId })
}

export async function sendMail(payload: SendMailPayload): Promise<MailMessage> {
	return invoke('mail_send', { payload })
}
