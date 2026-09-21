import { useCallback, memo } from "react";
import { toast } from "sonner";
import { useGit } from "../../context/GitContext";
import { Button, Tooltip } from "../ui";
import {
  GitBranchIcon,
  GitBranchDeletedIcon,
  GitCommitIcon,
  RefreshCwIcon,
  SpinnerIcon,
  SettingsIcon,
} from "../icons";
import { cn } from "../../lib/utils";
import { mod, isMac } from "../../lib/platform";

interface FooterProps {
  onOpenSettings?: () => void;
}

export const Footer = memo(function Footer({ onOpenSettings }: FooterProps) {
  const {
    status,
    isLoading,
    isSyncing,
    isCommitting,
    gitAvailable,
    gitEnabled,
    sync,
    initRepo,
    commit,
    lastError,
    clearError,
  } = useGit();

  const handleCommit = useCallback(async () => {
    if (isCommitting) return;
    try {
      const success = await commit("Quick commit from Scratch");
      if (success) {
        toast.success("Changes committed");
      } else {
        toast.error("Failed to commit");
      }
    } catch {
      toast.error("Failed to commit");
    }
  }, [commit, isCommitting]);

  const handleSync = useCallback(async () => {
    if (isSyncing) return;
    const result = await sync();
    if (result.ok) {
      toast.success(result.message);
    } else {
      toast.error(result.error);
    }
  }, [sync, isSyncing]);

  const handleEnableGit = useCallback(async () => {
    const success = await initRepo();
    if (success) {
      toast.success("Git repository initialized");
    } else {
      toast.error("Failed to initialize Git");
    }
  }, [initRepo]);

  // Git status section
  const renderGitStatus = () => {
    if (!gitEnabled || !gitAvailable) {
      return null;
    }

    // Not a git repo - show init option
    if (status && !status.isRepo) {
      return (
        <Tooltip content="Initialize Git repository">
          <Button
            onClick={handleEnableGit}
            variant="ghost"
            className="text-xs h-auto p-0 hover:bg-transparent"
          >
            Enable Git
          </Button>
        </Tooltip>
      );
    }

    // Show spinner only when loading and no error to display
    if (isLoading && !lastError) {
      return <SpinnerIcon className="w-3 h-3 text-text-muted animate-spin" />;
    }

    const hasChanges = status ? status.changedCount > 0 : false;

    return (
      <div className="flex items-center gap-1.5">
        {/* Branch icon with name on hover */}
        {status?.currentBranch ? (
          <Tooltip content={"Branch: " + status.currentBranch}>
            <span className="text-text-muted flex items-center">
              <GitBranchIcon className="w-4.5 h-4.5 stroke-[1.5]" />
            </span>
          </Tooltip>
        ) : status ? (
          <Tooltip content="No branch (set up git in settings)">
            <span className="text-text-muted flex items-center">
              <GitBranchDeletedIcon className="w-4.5 h-4.5 stroke-[1.5] opacity-50" />
            </span>
          </Tooltip>
        ) : null}

        {/* Changes indicator — hidden when there's an error so we don't show a stale count alongside it */}
        {hasChanges && !lastError && (
          <Tooltip content="You have uncommitted changes">
            <span className="text-xs text-text-muted/70">Files changed</span>
          </Tooltip>
        )}

        {/* Error indicator */}
        {lastError && (
          <Tooltip content={lastError}>
            <Button
              onClick={clearError}
              variant="link"
              className="text-xs h-auto p-0 text-red-500 hover:text-red-600 hover:no-underline"
            >
              An error occurred
            </Button>
          </Tooltip>
        )}
      </div>
    );
  };

  // Determine what buttons to show
  const hasChanges = (status?.changedCount ?? 0) > 0;
  const showCommitButton =
    gitEnabled && gitAvailable && status?.isRepo && hasChanges;
  const behindCount = Math.max(status?.behindCount ?? 0, 0);
  const aheadCount = Math.max(status?.aheadCount ?? 0, 0);
  const syncCount = behindCount + aheadCount;
  const showSyncButton =
    gitEnabled && gitAvailable && status?.hasRemote && status?.hasUpstream;

  const syncTooltip = isSyncing
    ? "Syncing..."
    : behindCount > 0 && aheadCount > 0
      ? `${behindCount} to pull, ${aheadCount} to push`
      : behindCount > 0
        ? `${behindCount} commit${behindCount === 1 ? "" : "s"} to pull`
        : aheadCount > 0
          ? `${aheadCount} commit${aheadCount === 1 ? "" : "s"} to push`
          : "Synced with remote";

  return (
    <footer className="h-7 px-2.5 shrink-0 border-t border-border bg-[#D8D4CA] dark:bg-[#141518] font-mono text-[10px] text-text-muted flex items-center justify-between select-none transition-colors">
      {/* Left: Status / Git Telemetry */}
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            isSyncing || isCommitting
              ? "bg-ram-orange animate-pulse shadow-[0_0_6px_rgba(255,85,0,0.6)]"
              : hasChanges
                ? "bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.5)]"
                : "bg-emerald-500 shadow-[0_0_4px_rgba(16,185,129,0.5)]"
          )}
        />
        {renderGitStatus() || (
          <span className="text-[9px] font-bold text-text-muted/80 tracking-wider truncate">
            BUFFER: 0x00 • 0.8MS
          </span>
        )}
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center gap-1 shrink-0">
        {/* Sync button */}
        {showSyncButton && (
          <Tooltip content={syncTooltip}>
            <button
              onClick={handleSync}
              disabled={isSyncing}
              aria-label="Sync"
              className="w-5 h-5 rounded bg-bg-card hover:bg-bg-emphasis active:bg-bg-card border border-border flex items-center justify-center text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              {isSyncing ? (
                <SpinnerIcon className="w-3 h-3 stroke-[1.8] animate-spin" />
              ) : (
                <span className="relative flex items-center">
                  <RefreshCwIcon
                    className={cn(
                      "w-3 h-3 stroke-[1.8]",
                      syncCount === 0 && "opacity-60",
                    )}
                  />
                  {syncCount > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-3 h-3 flex items-center justify-center rounded-full bg-ram-orange text-white text-[7px] font-bold px-0.5">
                      {syncCount}
                    </span>
                  )}
                </span>
              )}
            </button>
          </Tooltip>
        )}

        {/* Quick Commit button */}
        {showCommitButton && (
          <Tooltip content="Quick Commit">
            <button
              onClick={handleCommit}
              disabled={isCommitting}
              title="Quick commit"
              className="w-5 h-5 rounded bg-bg-card hover:bg-bg-emphasis active:bg-bg-card border border-border flex items-center justify-center text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              {isCommitting ? (
                <SpinnerIcon className="w-3 h-3 stroke-[1.8] animate-spin" />
              ) : (
                <GitCommitIcon className="w-3 h-3 stroke-[1.8]" />
              )}
            </button>
          </Tooltip>
        )}

        {/* Settings button */}
        {onOpenSettings && (
          <Tooltip content={`Settings (${mod}${isMac ? "" : "+"},)`}>
            <button
              onClick={onOpenSettings}
              title={`Settings (${mod}${isMac ? "" : "+"}, to toggle)`}
              className="w-5 h-5 rounded bg-bg-card hover:bg-bg-emphasis active:bg-bg-card border border-border flex items-center justify-center text-text-muted hover:text-text transition-colors cursor-pointer"
            >
              <SettingsIcon className="w-3 h-3 stroke-[1.8]" />
            </button>
          </Tooltip>
        )}
      </div>
    </footer>
  );
});
