import { useCallback, memo } from "react";
import { toast } from "sonner";
import { useGit } from "../../context/GitContext";
import { Button, IconButton, Tooltip } from "../ui";
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

  const hasGitFooterContent =
    showCommitButton || showSyncButton || renderGitStatus() !== null;

  // When there's no git content, show a floating settings button
  if (!hasGitFooterContent) {
    return (
      <div className="absolute bottom-3 right-3">
        <IconButton
          onClick={onOpenSettings}
          title={`Settings (${mod}${isMac ? "" : "+"}, to toggle)`}
          className="rounded-lg bg-bg-secondary border border-border hover:bg-bg-muted backdrop-blur-sm w-8 h-8"
        >
          <SettingsIcon className="w-4.5 h-4.5 stroke-[1.5]" />
        </IconButton>
      </div>
    );
  }

  return (
    <div className="shrink-0 border-t-2 border-border bg-[#CDC8BC] dark:bg-[#141519] font-mono text-xs transition-colors">
      {/* Footer bar with git status and action buttons */}
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-xs bg-ram-orange shadow-[0_0_4px_#FF5400] shrink-0" />
          {renderGitStatus() || (
            <span className="text-[10px] font-bold text-text-muted truncate">
              BUFFER: READY
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Sync button — pulls then pushes */}
          {showSyncButton && (
            <Tooltip content={syncTooltip}>
              <button
                onClick={handleSync}
                disabled={isSyncing}
                aria-label="Sync"
                className="w-7 h-7 rounded bg-[#E4E0D6] dark:bg-[#22242c] border border-border shadow-keycap chiclet-btn flex items-center justify-center text-text-muted hover:text-text hover:bg-white dark:hover:bg-[#2c2f3a]"
              >
                {isSyncing ? (
                  <SpinnerIcon className="w-3.5 h-3.5 stroke-[1.8] animate-spin" />
                ) : (
                  <span className="relative flex items-center">
                    <RefreshCwIcon
                      className={cn(
                        "w-3.5 h-3.5 stroke-[1.8]",
                        syncCount === 0 && "opacity-50",
                      )}
                    />
                    {syncCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-3.5 h-3.5 flex items-center justify-center rounded-full bg-ram-orange text-white text-[8px] font-bold leading-none px-0.5 shadow-xs">
                        {syncCount}
                      </span>
                    )}
                  </span>
                )}
              </button>
            </Tooltip>
          )}
          {showCommitButton && (
            <Tooltip content="Quick Commit">
              <button
                onClick={handleCommit}
                disabled={isCommitting}
                title="Quick commit"
                className="w-7 h-7 rounded bg-[#E4E0D6] dark:bg-[#22242c] border border-border shadow-keycap chiclet-btn flex items-center justify-center text-text-muted hover:text-text hover:bg-white dark:hover:bg-[#2c2f3a]"
              >
                {isCommitting ? (
                  <SpinnerIcon className="w-3.5 h-3.5 stroke-[1.8] animate-spin" />
                ) : (
                  <GitCommitIcon className="w-3.5 h-3.5 stroke-[1.8]" />
                )}
              </button>
            </Tooltip>
          )}
          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              title={`Settings (${mod}${isMac ? "" : "+"}, to toggle)`}
              className="w-7 h-7 rounded bg-[#E4E0D6] dark:bg-[#22242c] border border-border shadow-keycap chiclet-btn flex items-center justify-center text-text-muted hover:text-text hover:bg-white dark:hover:bg-[#2c2f3a]"
            >
              <SettingsIcon className="w-3.5 h-3.5 stroke-[1.8]" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
