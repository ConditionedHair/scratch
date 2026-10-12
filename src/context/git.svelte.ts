import { listen } from "@tauri-apps/api/event";
import * as gitService from "../services/git";
import type { GitStatus } from "../services/git";
import * as notesService from "../services/notes";
import { notesState } from "./notes.svelte";

export class GitState {
  status = $state<GitStatus | null>(null);
  isLoading = $state<boolean>(false);
  isCommitting = $state<boolean>(false);
  isPushing = $state<boolean>(false);
  isPulling = $state<boolean>(false);
  isSyncing = $state<boolean>(false);
  isAddingRemote = $state<boolean>(false);
  gitAvailable = $state<boolean>(false);
  gitEnabled = $state<boolean>(false);
  isUpdatingGitEnabled = $state<boolean>(false);
  lastError = $state<string | null>(null);

  private pollTimer: number | null = null;
  private unlistenFileChange?: () => void;
  private refreshRequestId = 0;
  private refreshInFlight = false;
  private hasLoaded = false;

  constructor() {
    if (typeof window !== "undefined") {
      this.init();
    }
  }

  private async init() {
    this.gitAvailable = await gitService.isGitAvailable();
    await this.detectGitEnabled();
    this.setupListeners();
    this.startPolling();
  }

  private async detectGitEnabled() {
    if (!notesState.notesFolder) {
      this.gitEnabled = false;
      this.isUpdatingGitEnabled = false;
      return;
    }

    try {
      const settings = await notesService.getSettings();
      if (settings.gitEnabled === true || settings.gitEnabled === false) {
        this.gitEnabled = settings.gitEnabled;
        if (this.gitEnabled && this.gitAvailable) {
          await this.refreshStatus();
        }
        return;
      }

      const gitStatus = await gitService.getGitStatus();
      this.gitEnabled = gitStatus.isRepo === true;
      if (this.gitEnabled && this.gitAvailable) {
        await this.refreshStatus();
      }
    } catch {
      this.gitEnabled = false;
    }
  }

  private setupListeners() {
    let debounceTimer: number | undefined;

    listen("file-change", () => {
      if (!this.gitEnabled) return;

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = window.setTimeout(() => {
        this.refreshStatus();
      }, 1000);
    }).then((unlisten) => {
      this.unlistenFileChange = unlisten;
    });
  }

  private startPolling() {
    const poll = async () => {
      if (
        notesState.notesFolder &&
        this.gitAvailable &&
        this.gitEnabled &&
        this.status?.hasRemote &&
        !this.isSyncing
      ) {
        await gitService.gitFetch().catch(() => {});
        await this.refreshStatus();
      }
      this.pollTimer = window.setTimeout(poll, 60_000);
    };

    this.pollTimer = window.setTimeout(poll, 60_000);
  }

  destroy() {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.unlistenFileChange) this.unlistenFileChange();
  }

  setGitEnabled = async (enabled: boolean): Promise<boolean> => {
    this.isUpdatingGitEnabled = true;
    try {
      const settings = await notesService.getSettings();
      await notesService.updateSettings({ ...settings, gitEnabled: enabled });
      this.gitEnabled = enabled;

      if (enabled) {
        await this.refreshStatus();
      } else {
        this.status = null;
        this.lastError = null;
      }
      return true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : "Failed to update git setting";
      return false;
    } finally {
      this.isUpdatingGitEnabled = false;
    }
  };

  refreshStatus = async (): Promise<GitStatus | null> => {
    if (!this.gitAvailable || !this.gitEnabled) return null;
    if (this.refreshInFlight) return this.status;

    this.refreshInFlight = true;
    const reqId = ++this.refreshRequestId;

    if (!this.hasLoaded) {
      this.isLoading = true;
    }

    try {
      const res = await gitService.getGitStatus();
      if (reqId !== this.refreshRequestId) return this.status;

      this.hasLoaded = true;
      this.status = res;
      if (res.error) {
        this.lastError = res.error;
      }
      return res;
    } catch (err) {
      if (reqId !== this.refreshRequestId) return this.status;
      const errorMsg = err instanceof Error ? err.message : "Failed to get git status";
      this.lastError = errorMsg;
      return null;
    } finally {
      if (reqId === this.refreshRequestId) {
        this.isLoading = false;
        this.refreshInFlight = false;
      }
    }
  };

  initRepo = async () => {
    this.isLoading = true;
    try {
      await gitService.initGitRepo();
      await this.setGitEnabled(true);
      await this.refreshStatus();
      return true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : "Failed to initialize repository";
      return false;
    } finally {
      this.isLoading = false;
    }
  };

  commit = async (message: string) => {
    this.isCommitting = true;
    try {
      const res = await gitService.gitCommit(message);
      if (res.error) {
        this.lastError = res.error;
        return false;
      }
      await this.refreshStatus();
      return true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : "Failed to commit";
      return false;
    } finally {
      this.isCommitting = false;
    }
  };

  push = async () => {
    this.isPushing = true;
    try {
      const res = await gitService.gitPush();
      if (res.error) {
        this.lastError = res.error;
        return false;
      }
      await this.refreshStatus();
      return true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : "Failed to push";
      return false;
    } finally {
      this.isPushing = false;
    }
  };

  pull = async () => {
    this.isPulling = true;
    try {
      const res = await gitService.gitPull();
      if (res.error) {
        this.lastError = res.error;
        return false;
      }
      await this.refreshStatus();
      await notesState.refreshNotes();
      return true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : "Failed to pull";
      return false;
    } finally {
      this.isPulling = false;
    }
  };

  sync = async () => {
    this.isSyncing = true;
    this.lastError = null;

    try {
      let didPull = false;
      const pullResult = await gitService.gitPull();
      if (pullResult.error) {
        this.lastError = pullResult.error;
        await this.refreshStatus();
        return { ok: false, error: pullResult.error };
      }
      didPull = true;
      await notesState.refreshNotes();

      const freshStatus = await this.refreshStatus();
      if (!freshStatus) {
        return { ok: false, error: "Failed to read git status after pull" };
      }

      let didPush = false;
      if (freshStatus.aheadCount > 0 && freshStatus.hasUpstream) {
        const pushResult = await gitService.gitPush();
        if (pushResult.error) {
          this.lastError = pushResult.error;
          await this.refreshStatus();
          if (didPull) return { ok: false, error: `Pulled changes, but push failed: ${pushResult.error}` };
          return { ok: false, error: pushResult.error };
        }
        didPush = true;
      }

      await this.refreshStatus();

      if (didPull && didPush) return { ok: true, message: "Synced — pulled and pushed" };
      if (didPull) return { ok: true, message: "Pulled latest changes" };
      if (didPush) return { ok: true, message: "Pushed to remote" };
      return { ok: true, message: "Already up to date" };
    } catch (err) {
      const error = err instanceof Error ? err.message : "Failed to sync";
      this.lastError = error;
      return { ok: false, error };
    } finally {
      this.isSyncing = false;
    }
  };

  addRemote = async (url: string) => {
    this.isAddingRemote = true;
    try {
      const res = await gitService.addRemote(url);
      if (res.error) {
        this.lastError = res.error;
        return false;
      }
      await this.refreshStatus();
      return true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : "Failed to add remote";
      return false;
    } finally {
      this.isAddingRemote = false;
    }
  };

  setRemoteUrl = async (url: string) => {
    this.isAddingRemote = true;
    try {
      const res = await gitService.setRemoteUrl(url);
      if (res.error) {
        this.lastError = res.error;
        return false;
      }
      await this.refreshStatus();
      return true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : "Failed to update remote";
      return false;
    } finally {
      this.isAddingRemote = false;
    }
  };

  removeRemote = async () => {
    this.isAddingRemote = true;
    try {
      const res = await gitService.removeRemote();
      if (res.error) {
        this.lastError = res.error;
        return false;
      }
      await this.refreshStatus();
      return true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : "Failed to remove remote";
      return false;
    } finally {
      this.isAddingRemote = false;
    }
  };

  pushWithUpstream = async () => {
    this.isPushing = true;
    try {
      const res = await gitService.pushWithUpstream();
      if (res.error) {
        this.lastError = res.error;
        return false;
      }
      await this.refreshStatus();
      return true;
    } catch (err) {
      this.lastError = err instanceof Error ? err.message : "Failed to push";
      return false;
    } finally {
      this.isPushing = false;
    }
  };

  clearError = () => {
    this.lastError = null;
  };
}

export const gitState = new GitState();
