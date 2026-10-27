export type WorkspaceView = 'notes' | 'calendar' | 'mail'
export type AppView = WorkspaceView | 'settings'
export type WorkspaceDirection = -1 | 0 | 1

export interface WorkspaceMotionParams {
	active: boolean
	direction: WorkspaceDirection
	enabled: boolean
}
