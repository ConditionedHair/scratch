import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { useNotes } from "../../context/NotesContext";
import { useTheme } from "../../context/ThemeContext";
import { useGit } from "../../context/GitContext";
import { isMac } from "../../lib/platform";
import {
  getIcloudStatus,
  isPathInIcloud,
  ensureIcloudDefaultFolder,
  type IcloudStatus,
} from "../../services/icloud";
import { Button, Input } from "../ui";
import {
  FolderIcon,
  ExternalLinkIcon,
  SpinnerIcon,
  CloudPlusIcon,
  CloudCheckIcon,
  ChevronRightIcon,
  XIcon,
} from "../icons";
import type { Settings } from "../../types/note";

// Format remote URL for display - extract user/repo from full URL
function formatRemoteUrl(url: string | null): string {
  if (!url) return "Connected";
  const sshMatch = url.match(/:([^/]+\/[^/]+?)(?:\.git)?$/);
  const httpsMatch = url.match(/\/([^/]+\/[^/]+?)(?:\.git)?$/);
  return sshMatch?.[1] || httpsMatch?.[1] || url;
}

// Convert git remote URL to a browsable web URL
function getRemoteWebUrl(url: string | null): string | null {
  if (!url) return null;
  const sshMatch = url.match(/^git@([^:]+):(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return `https://${sshMatch[1]}/${sshMatch[2]}`;
  }
  const httpsMatch = url.match(/^(https?:\/\/.+?)(?:\.git)?$/);
  if (httpsMatch) {
    return httpsMatch[1];
  }
  return null;
}

export function GeneralSettingsSection() {
  const { notesFolder, setNotesFolder } = useNotes();
  const { reloadSettings } = useTheme();
  const {
    status,
    gitAvailable,
    gitEnabled,
    isUpdatingGitEnabled,
    setGitEnabled,
    initRepo,
    isLoading,
    addRemote,
    setRemoteUrl: updateRemoteUrl,
    removeRemote,
    pushWithUpstream,
    isAddingRemote,
    isPushing,
    lastError,
    clearError,
  } = useGit();

  const [remoteUrl, setRemoteUrl] = useState("");
  const [showRemoteInput, setShowRemoteInput] = useState(false);
  const [isEditingRemote, setIsEditingRemote] = useState(false);
  const [noteTemplate, setNoteTemplate] = useState<string>("Untitled");
  const [previewNoteName, setPreviewNoteName] = useState<string>("Untitled");

  // Load template from settings on mount
  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const settings = await invoke<Settings>("get_settings");
        const template = settings.defaultNoteName || "Untitled";
        setNoteTemplate(template);

        const preview = await invoke<string>("preview_note_name", { template });
        setPreviewNoteName(preview);
      } catch (error) {
        console.error("Failed to load template:", error);
      }
    };
    loadTemplate();
  }, []);

  // Update preview when template changes (debounced)
  useEffect(() => {
    const updatePreview = async () => {
      try {
        const preview = await invoke<string>("preview_note_name", {
          template: noteTemplate,
        });
        setPreviewNoteName(preview);
      } catch {
        setPreviewNoteName("Invalid template");
      }
    };

    const timer = setTimeout(updatePreview, 300);
    return () => clearTimeout(timer);
  }, [noteTemplate]);

  const handleSaveTemplate = async () => {
    try {
      const settings = await invoke<Settings>("get_settings");
      await invoke("update_settings", {
        newSettings: {
          ...settings,
          defaultNoteName: noteTemplate || undefined,
        },
      });
      toast.success("Default template saved");
    } catch (error) {
      console.error("Failed to save default template:", error);
      toast.error("Failed to save default template");
    }
  };

  const handleChangeFolder = async () => {
    try {
      const selected = await invoke<string | null>("open_folder_dialog", {
        defaultPath: notesFolder || null,
      });

      if (selected) {
        await setNotesFolder(selected);
        await reloadSettings();
      }
    } catch (err) {
      console.error("Failed to select folder:", err);
      toast.error("Failed to select folder");
    }
  };

  const handleOpenFolder = async () => {
    if (!notesFolder) return;
    try {
      await invoke("open_in_file_manager", { path: notesFolder });
    } catch (err) {
      console.error("Failed to open folder:", err);
      toast.error("Failed to open folder");
    }
  };

  const handleOpenUrl = async (url: string) => {
    try {
      await invoke("open_url_safe", { url });
    } catch (err) {
      console.error("Failed to open URL:", err);
      toast.error(err instanceof Error ? err.message : "Failed to open URL");
    }
  };

  const handleAddRemote = async () => {
    if (isAddingRemote || !remoteUrl.trim()) return;
    const success = await addRemote(remoteUrl.trim());
    if (success) {
      setRemoteUrl("");
      setShowRemoteInput(false);
    }
  };

  const handleStartEditRemote = () => {
    setRemoteUrl(status?.remoteUrl || "");
    setIsEditingRemote(true);
    clearError();
  };

  const handleCancelEditRemote = () => {
    setIsEditingRemote(false);
    setRemoteUrl("");
    clearError();
  };

  const handleSaveRemoteUrl = async () => {
    if (isAddingRemote) return;
    const trimmed = remoteUrl.trim();
    if (!trimmed) return;
    if (trimmed === status?.remoteUrl) {
      setIsEditingRemote(false);
      return;
    }
    const success = await updateRemoteUrl(trimmed);
    if (success) {
      setRemoteUrl("");
      setIsEditingRemote(false);
    }
  };

  const handleRemoveRemote = async () => {
    if (isAddingRemote) return;
    const success = await removeRemote();
    if (success) {
      setRemoteUrl("");
      setIsEditingRemote(false);
    }
  };

  const handlePushWithUpstream = async () => {
    await pushWithUpstream();
  };

  const handleCancelRemote = () => {
    setShowRemoteInput(false);
    setRemoteUrl("");
    clearError();
  };

  const handleToggleGitEnabled = async (enabled: boolean) => {
    if (isUpdatingGitEnabled) return;
    const success = await setGitEnabled(enabled);
    if (!success) {
      toast.error("Failed to update version control setting");
      return;
    }
    if (!enabled) {
      setShowRemoteInput(false);
      setIsEditingRemote(false);
      setRemoteUrl("");
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-border/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-primary text-xs font-mono font-bold tracking-widest uppercase">
              MODULE 01
            </span>
            <span className="text-text-muted/60 font-mono text-xs">//</span>
            <h2 className="text-base font-bold tracking-wide uppercase font-mono">
              DIRECTORY CONFIGURATION
            </h2>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Physical filesystem mount, subfolder indexing, and remote tape backup.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto font-mono text-[10px]">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            MOUNT STATUS: ACTIVE
          </span>
          <span className="px-2 py-0.5 rounded bg-bg-muted text-text-muted border border-border">
            READ / WRITE
          </span>
        </div>
      </div>

      {/* Main Storage Path Instrument Card */}
      <div className="rounded-xl border border-border bg-bg-secondary/40 p-4 sm:p-5 relative overflow-hidden shadow-screen-inset">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <FolderIcon className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-text">
              PRIMARY TAPE STORAGE
            </span>
          </div>
          <span className="text-[10px] font-mono text-text-muted">BANK-01</span>
        </div>

        <div className="mt-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-lg bg-bg border border-border font-mono">
            <div className="min-w-0 flex-1">
              <span className="text-[10px] uppercase tracking-wider text-text-muted/70 block mb-0.5">
                MOUNTED PATH
              </span>
              <p
                className="text-xs text-text truncate select-all font-mono"
                title={notesFolder || undefined}
              >
                {notesFolder ? notesFolder : "No folder chosen"}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                onClick={handleChangeFolder}
                variant="outline"
                size="sm"
                className="font-mono text-xs uppercase tracking-wider chiclet-btn"
              >
                Change Path
              </Button>
              {notesFolder && (
                <Button
                  onClick={handleOpenFolder}
                  variant="ghost"
                  size="sm"
                  className="font-mono text-xs uppercase tracking-wider"
                >
                  Reveal
                </Button>
              )}
            </div>
          </div>

          {/* iCloud Container Sync if on Mac */}
          {isMac && <IcloudCard />}
        </div>
      </div>

      {/* Subfolder & Indexing Hardware Rack */}
      <div className="rounded-xl border border-border bg-bg-secondary/40 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <span className="text-xs font-mono font-bold tracking-wider uppercase text-text block">
              SUBFOLDER HIERARCHY
            </span>
            <span className="text-[11px] text-text-muted">
              Recursively traverse nested folders inside mounted storage bank.
            </span>
          </div>
          <FoldersToggle />
        </div>

        {/* Default Note Template */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-mono font-bold tracking-wider uppercase text-text">
              DEFAULT TAPE DESIGNATION
            </label>
            <span className="text-[10px] font-mono text-text-muted">
              TEMPLATE ENGINE
            </span>
          </div>
          <p className="text-[11px] text-text-muted mb-3">
            Format applied when initializing new blank markdown tapes.
          </p>

          <div className="space-y-2.5">
            <div className="flex gap-2">
              <Input
                type="text"
                value={noteTemplate}
                onChange={(e) => setNoteTemplate(e.target.value)}
                onBlur={handleSaveTemplate}
                placeholder="Untitled"
                className="font-mono text-xs flex-1 bg-bg border-border"
              />
              <Button
                onClick={handleSaveTemplate}
                variant="outline"
                size="sm"
                className="font-mono text-xs uppercase tracking-wider chiclet-btn"
              >
                Save
              </Button>
            </div>

            <div className="p-2.5 rounded-lg bg-bg border border-border flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase tracking-wider text-text-muted">
                OUTPUT PREVIEW:
              </span>
              <span className="text-xs font-mono font-bold text-primary">
                {previewNoteName}.md
              </span>
            </div>

            <details className="text-xs group">
              <summary className="cursor-pointer text-text-muted hover:text-text select-none flex items-center gap-1 font-mono text-[11px] uppercase tracking-wider">
                <ChevronRightIcon className="w-3.5 h-3.5 stroke-2 transition-transform group-open:rotate-90" />
                <span>Available Template Variables</span>
              </summary>
              <div className="mt-2 p-3 rounded-lg bg-bg border border-border font-mono text-[11px] space-y-1.5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-text-muted">
                  <div><code>{"{timestamp}"}</code> <span className="text-text-muted/60">→ UNIX epoch</span></div>
                  <div><code>{"{date}"}</code> <span className="text-text-muted/60">→ 2026-09-07</span></div>
                  <div><code>{"{year}"}</code> <span className="text-text-muted/60">→ 2026</span></div>
                  <div><code>{"{month}"}</code> <span className="text-text-muted/60">→ 09</span></div>
                  <div><code>{"{day}"}</code> <span className="text-text-muted/60">→ 07</span></div>
                  <div><code>{"{counter}"}</code> <span className="text-text-muted/60">→ 1, 2, 3...</span></div>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* Ignored Folders */}
        <div className="pt-3 border-t border-border/60">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-mono font-bold tracking-wider uppercase text-text">
              FILTER EXCLUSIONS
            </label>
            <span className="text-[10px] font-mono text-text-muted">
              IGNORE PATTERNS
            </span>
          </div>
          <p className="text-[11px] text-text-muted mb-3">
            Directories excluded from discovery and full-text vector index.
          </p>
          <IgnoredFoldersEditor />
        </div>
      </div>

      {/* Subsystem 01-B: Git Version Control & Sync */}
      <div className="rounded-xl border border-border bg-bg-secondary/40 p-4 sm:p-5 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-primary text-[10px] font-mono font-bold tracking-widest uppercase">
                SUBSYSTEM 01-B
              </span>
              <span className="text-text-muted/60 font-mono text-[10px]">//</span>
              <span className="text-xs font-mono font-bold tracking-wider uppercase text-text">
                VERSION CONTROL & REVISION BUS (GIT)
              </span>
            </div>
            <span className="text-[11px] text-text-muted block mt-0.5">
              Automated tape commit snapshots and remote synchronization.
            </span>
          </div>
          <div className="flex items-center gap-2">
            {gitAvailable ? (
              <div className="flex gap-1 p-0.5 rounded-lg border border-border bg-bg shrink-0 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => handleToggleGitEnabled(false)}
                  disabled={isUpdatingGitEnabled}
                  className={`px-3 py-1 rounded font-bold transition-colors cursor-pointer ${
                    !gitEnabled
                      ? "bg-neutral-600 text-white shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  OFF
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleGitEnabled(true)}
                  disabled={isUpdatingGitEnabled}
                  className={`px-3 py-1 rounded font-bold transition-colors cursor-pointer ${
                    gitEnabled
                      ? "bg-primary text-white shadow-sm"
                      : "text-text-muted hover:text-text"
                  }`}
                >
                  ON
                </button>
              </div>
            ) : (
              <span className="text-[10px] font-mono text-amber-500 uppercase">
                CLI NOT FOUND
              </span>
            )}
          </div>
        </div>

        {!gitAvailable ? (
          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-500 font-mono">
            Git executable was not detected on system PATH. Install git via Homebrew or Xcode command line tools to enable revision control.
          </div>
        ) : !gitEnabled ? (
          <div className="p-3 rounded-lg bg-bg border border-border text-xs text-text-muted font-mono">
            Git revision bus is currently offline. Enable above to track document revisions and push to GitHub/GitLab.
          </div>
        ) : (
          <div className="space-y-4">
            {isLoading ? (
              <div className="flex items-center gap-2 text-xs font-mono text-text-muted py-2">
                <SpinnerIcon className="w-3.5 h-3.5 animate-spin" />
                READING REPO TELEMETRY...
              </div>
            ) : !status?.isRepo ? (
              <div className="p-4 rounded-lg bg-bg border border-border space-y-3">
                <div className="text-xs font-mono text-text-muted">
                  No Git repository initialized in this tape folder.
                </div>
                <Button
                  onClick={initRepo}
                  variant="primary"
                  size="sm"
                  className="font-mono text-xs uppercase tracking-wider chiclet-btn"
                >
                  Initialize Repository
                </Button>
              </div>
            ) : (
              <div className="space-y-3 font-mono">
                {/* Repository Status Dashboard */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-bg border border-border">
                    <span className="text-[9px] uppercase tracking-wider text-text-muted block">
                      ACTIVE BRANCH
                    </span>
                    <span className="text-xs font-bold text-text mt-0.5 block truncate">
                      {status.currentBranch || "HEAD (detached)"}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-bg border border-border">
                    <span className="text-[9px] uppercase tracking-wider text-text-muted block">
                      MODIFIED TAPES
                    </span>
                    <span className="text-xs font-bold text-text mt-0.5 block">
                      {status.changedCount} {status.changedCount === 1 ? "FILE" : "FILES"}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-bg border border-border">
                    <span className="text-[9px] uppercase tracking-wider text-text-muted block">
                      SYNC BUFFER
                    </span>
                    <span className="text-xs font-bold text-text mt-0.5 block">
                      ↑ {status.aheadCount} / ↓ {status.behindCount}
                    </span>
                  </div>
                </div>

                {/* Remote Host Configuration */}
                <div className="p-3.5 rounded-lg bg-bg border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-text-muted font-bold">
                      REMOTE TAPE MIRROR
                    </span>
                    {status.remoteUrl ? (
                      <span className="text-[10px] text-green-500 font-bold">
                        CONNECTED
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-500 font-bold">
                        UNLINKED
                      </span>
                    )}
                  </div>

                  {isEditingRemote || showRemoteInput ? (
                    <div className="space-y-2">
                      <Input
                        type="text"
                        value={remoteUrl}
                        onChange={(e) => setRemoteUrl(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            if (isEditingRemote) handleSaveRemoteUrl();
                            else handleAddRemote();
                          }
                          if (e.key === "Escape") {
                            if (isEditingRemote) handleCancelEditRemote();
                            else handleCancelRemote();
                          }
                        }}
                        placeholder="https://github.com/user/my-notes.git"
                        className="font-mono text-xs bg-bg-secondary"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={isEditingRemote ? handleSaveRemoteUrl : handleAddRemote}
                          disabled={isAddingRemote || !remoteUrl.trim()}
                          size="sm"
                          className="font-mono text-xs uppercase chiclet-btn"
                        >
                          {isAddingRemote ? (
                            <>
                              <SpinnerIcon className="w-3 h-3 mr-1.5 animate-spin" />
                              Saving...
                            </>
                          ) : (
                            "Save Remote"
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={isEditingRemote ? handleCancelEditRemote : handleCancelRemote}
                          className="font-mono text-xs uppercase"
                        >
                          Cancel
                        </Button>
                        {isEditingRemote && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveRemote}
                            className="ml-auto font-mono text-xs uppercase text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : status.remoteUrl ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {getRemoteWebUrl(status.remoteUrl) ? (
                          <button
                            type="button"
                            onClick={() => handleOpenUrl(getRemoteWebUrl(status.remoteUrl)!)}
                            className="flex items-center gap-1.5 text-xs text-primary hover:underline cursor-pointer font-bold"
                          >
                            <span>{formatRemoteUrl(status.remoteUrl)}</span>
                            <ExternalLinkIcon className="w-3 h-3 shrink-0" />
                          </button>
                        ) : (
                          <span className="text-xs text-text truncate block">
                            {formatRemoteUrl(status.remoteUrl)}
                          </span>
                        )}
                      </div>
                      <Button
                        onClick={handleStartEditRemote}
                        variant="outline"
                        size="sm"
                        className="font-mono text-xs uppercase chiclet-btn shrink-0"
                      >
                        Edit
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowRemoteInput(true)}
                      variant="outline"
                      size="sm"
                      className="font-mono text-xs uppercase chiclet-btn"
                    >
                      <CloudPlusIcon className="w-3.5 h-3.5 mr-1.5" />
                      Add Remote Host
                    </Button>
                  )}

                  {/* Upstream Push Action */}
                  {!status.hasUpstream && status.currentBranch && status.remoteUrl && (
                    <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-2">
                      <span className="text-[10px] text-amber-500 uppercase">
                        UPSTREAM TRACKING REQUIRED
                      </span>
                      <Button
                        onClick={handlePushWithUpstream}
                        disabled={isPushing}
                        variant="primary"
                        size="sm"
                        className="font-mono text-xs uppercase chiclet-btn"
                      >
                        {isPushing ? (
                          <>
                            <SpinnerIcon className="w-3 h-3 mr-1.5 animate-spin" />
                            Pushing...
                          </>
                        ) : (
                          `Push & Track '${status.currentBranch}'`
                        )}
                      </Button>
                    </div>
                  )}
                </div>

                {/* Error Banner */}
                {lastError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-500 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-bold">GIT ENGINE ERROR</p>
                      <p className="mt-0.5">{lastError}</p>
                    </div>
                    <button
                      type="button"
                      onClick={clearError}
                      className="text-xs uppercase hover:underline cursor-pointer font-bold shrink-0"
                    >
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IcloudCard() {
  const { notesFolder, setNotesFolder } = useNotes();
  const { reloadSettings } = useTheme();
  const [status, setStatus] = useState<IcloudStatus | null>(null);
  const [isSynced, setIsSynced] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    getIcloudStatus()
      .then(setStatus)
      .catch(() =>
        setStatus({ available: false, containerPath: null, defaultFolderPath: null }),
      );
  }, []);

  useEffect(() => {
    if (!notesFolder) {
      setIsSynced(false);
      return;
    }
    isPathInIcloud(notesFolder)
      .then(setIsSynced)
      .catch(() => setIsSynced(false));
  }, [notesFolder]);

  const handleUseIcloud = async () => {
    if (isSwitching) return;
    setIsSwitching(true);
    try {
      const folder = await ensureIcloudDefaultFolder();
      await setNotesFolder(folder);
      await reloadSettings();
      toast.success("Storage moved to iCloud Drive container");
    } catch (err) {
      console.error("Failed to switch to iCloud Drive:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to switch to iCloud Drive",
      );
    } finally {
      setIsSwitching(false);
    }
  };

  if (isSynced) {
    return (
      <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-between font-mono">
        <div className="flex items-center gap-2 text-xs text-green-600 dark:text-green-400 font-bold">
          <CloudCheckIcon className="w-4 h-4 stroke-2" />
          <span>APPLE ICLOUD SYNC CONTAINER ACTIVE</span>
        </div>
        <span className="text-[10px] text-green-600/70 dark:text-green-400/70">
          AUTOMATIC DAEMON
        </span>
      </div>
    );
  }

  if (!status?.available) return null;

  return (
    <div className="p-3 rounded-lg bg-bg border border-border flex items-center justify-between font-mono">
      <div>
        <span className="text-xs text-text-muted block">
          LOCAL ONLY STORAGE
        </span>
        <span className="text-[10px] text-text-muted/60">
          Sync across macOS devices via iCloud Drive container.
        </span>
      </div>
      <Button
        onClick={handleUseIcloud}
        disabled={isSwitching}
        variant="outline"
        size="sm"
        className="font-mono text-xs uppercase chiclet-btn"
      >
        <CloudPlusIcon className="w-3.5 h-3.5 mr-1.5" />
        {isSwitching ? "Migrating..." : "Use iCloud"}
      </Button>
    </div>
  );
}

function FoldersToggle() {
  const [foldersEnabled, setFoldersEnabled] = useState<boolean | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    invoke<Settings>("get_settings")
      .then((s) => {
        setFoldersEnabled(s.foldersEnabled === true);
      })
      .catch((error) => {
        console.error("Failed to load folder setting:", error);
        setFoldersEnabled(false);
      });
  }, []);

  const handleToggle = async (enabled: boolean) => {
    if (isUpdating) return;
    setIsUpdating(true);
    try {
      const settings = await invoke<Settings>("get_settings");
      await invoke("update_settings", {
        newSettings: { ...settings, foldersEnabled: enabled },
      });
      setFoldersEnabled(enabled);
    } catch {
      toast.error("Failed to update folder setting");
    } finally {
      setIsUpdating(false);
    }
  };

  if (foldersEnabled === null) {
    return (
      <div className="flex gap-1 p-0.5 rounded-lg border border-border bg-bg shrink-0 font-mono text-xs">
        <button type="button" disabled className="px-3 py-1 text-text-muted/40">
          OFF
        </button>
        <button type="button" disabled className="px-3 py-1 text-text-muted/40">
          ON
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-1 p-0.5 rounded-lg border border-border bg-bg shrink-0 font-mono text-xs">
      <button
        type="button"
        onClick={() => handleToggle(false)}
        disabled={isUpdating}
        className={`px-3 py-1 rounded font-bold transition-colors cursor-pointer ${
          !foldersEnabled
            ? "bg-neutral-600 text-white shadow-sm"
            : "text-text-muted hover:text-text"
        }`}
      >
        OFF
      </button>
      <button
        type="button"
        onClick={() => handleToggle(true)}
        disabled={isUpdating}
        className={`px-3 py-1 rounded font-bold transition-colors cursor-pointer ${
          foldersEnabled
            ? "bg-primary text-white shadow-sm"
            : "text-text-muted hover:text-text"
        }`}
      >
        ON
      </button>
    </div>
  );
}

function IgnoredFoldersEditor() {
  const [patterns, setPatterns] = useState<string[] | null>(null);
  const [defaults, setDefaults] = useState<string[]>([]);
  const [newPattern, setNewPattern] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const { notesFolder, refreshNotes } = useNotes();

  useEffect(() => {
    setPatterns(null);
    Promise.all([
      invoke<Settings>("get_settings"),
      invoke<string[]>("get_default_ignored_patterns"),
    ])
      .then(([settings, defaultPatterns]) => {
        setDefaults(defaultPatterns);
        setPatterns(settings.ignoredPatterns ?? defaultPatterns);
      })
      .catch((error) => {
        console.error("Failed to load ignored patterns:", error);
        setPatterns([]);
      });
  }, [notesFolder]);

  const save = async (updated: string[] | null) => {
    setIsSaving(true);
    try {
      const settings = await invoke<Settings>("get_settings");
      await invoke("update_settings", {
        newSettings: {
          ...settings,
          ignoredPatterns: updated ?? undefined,
        },
      });
      setPatterns(updated ?? defaults);
      refreshNotes();
      try {
        await invoke("rebuild_search_index");
      } catch {
        toast.error("Search index rebuild failed — results may be stale");
      }
    } catch {
      toast.error("Failed to save ignored folders");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdd = () => {
    const trimmed = newPattern.trim();
    if (!trimmed || !patterns) return;
    if (/[/\\]/.test(trimmed)) {
      toast.error("Ignore patterns must be single directory names (no paths)");
      return;
    }
    if (patterns.includes(trimmed)) {
      toast.error("Already in the list");
      return;
    }
    setNewPattern("");
    save([...patterns, trimmed]);
  };

  const handleRemove = (pattern: string) => {
    if (!patterns) return;
    save(patterns.filter((p) => p !== pattern));
  };

  const handleReset = () => {
    save(null);
  };

  const isDefault =
    patterns !== null &&
    patterns.length === defaults.length &&
    patterns.every((p, i) => p === defaults[i]);

  if (patterns === null) {
    return <div className="text-xs font-mono text-text-muted py-2">LOADING EXCLUSIONS...</div>;
  }

  return (
    <div className="space-y-3 font-mono">
      <div className="flex flex-wrap gap-1.5">
        {patterns.map((pattern) => (
          <span
            key={pattern}
            className="inline-flex items-center gap-1.5 pl-2.5 pr-1 py-1 rounded bg-bg border border-border text-[11px] text-text"
          >
            <span>{pattern}</span>
            <button
              type="button"
              aria-label={`Remove ${pattern}`}
              onClick={() => handleRemove(pattern)}
              disabled={isSaving}
              className="p-0.5 rounded hover:bg-bg-hover text-text-muted hover:text-text cursor-pointer"
            >
              <XIcon className="w-3 h-3 stroke-2" />
            </button>
          </span>
        ))}
        {patterns.length === 0 && (
          <span className="text-xs text-text-muted">
            No folders excluded — all markdown tapes indexed.
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Input
          type="text"
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd();
            }
          }}
          placeholder="Folder name (e.g. archive, temp)..."
          className="flex-1 font-mono text-xs bg-bg border-border"
          disabled={isSaving}
        />
        <Button
          onClick={handleAdd}
          variant="outline"
          size="sm"
          className="font-mono text-xs uppercase chiclet-btn"
          disabled={isSaving || !newPattern.trim()}
        >
          Add
        </Button>
      </div>

      {!isDefault && (
        <button
          type="button"
          onClick={handleReset}
          disabled={isSaving}
          className="text-xs text-text-muted hover:text-primary transition-colors cursor-pointer font-bold uppercase tracking-wider"
        >
          [ RESET TO FACTORY DEFAULTS ]
        </button>
      )}
    </div>
  );
}
