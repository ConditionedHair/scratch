import { useCallback, memo } from "react";
import { useTheme } from "../../context/ThemeContext";
import { useNotes } from "../../context/NotesContext";
import { useGit } from "../../context/GitContext";
import { isMac, isWindows, mod } from "../../lib/platform";
import { SettingsIcon, PanelLeftIcon } from "../icons";

interface ChassisHeaderProps {
  onOpenSettings?: () => void;
  onOpenCommandPalette?: () => void;
  onToggleSidebar?: () => void;
  sidebarVisible?: boolean;
  focusMode?: boolean;
  onToggleFocusMode?: () => void;
  sourceMode?: boolean;
  onToggleSourceMode?: () => void;
}

export const ChassisHeader = memo(function ChassisHeader({
  onOpenSettings,
  onOpenCommandPalette,
  onToggleSidebar,
  sidebarVisible,
  focusMode,
  onToggleFocusMode,
  sourceMode,
  onToggleSourceMode,
}: ChassisHeaderProps) {
  const { interfaceZoom, setInterfaceZoom } = useTheme();
  const { notes } = useNotes();
  const { status, isSyncing } = useGit();

  const handleCycleZoom = useCallback(() => {
    setInterfaceZoom((prev) => {
      if (prev >= 1.25) return 0.9;
      if (prev >= 1.0) return 1.15;
      return 1.0;
    });
  }, [setInterfaceZoom]);

  const zoomDisplay = `${Math.round(interfaceZoom * 14)}PT`;

  return (
    <header
      className="h-12 border-b border-border bg-[#DDD9CF] dark:bg-[#16171b] px-4 flex items-center justify-between gap-4 z-20 shrink-0 select-none transition-colors"
      data-tauri-drag-region
    >
      {/* Left group: Silkscreen branding & toggle sidebar */}
      <div className={`titlebar-no-drag flex items-center gap-3 md:gap-4 ${isMac && !isWindows ? "pl-16 sm:pl-18" : "pl-1"}`}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={`Toggle Sidebar (${mod}${isMac ? "" : "+"}\\)`}
            className={`w-7 h-7 rounded-md border flex items-center justify-center transition-colors cursor-pointer ${
              sidebarVisible
                ? "bg-bg-card border-ram-orange/50 text-ram-orange shadow-xs"
                : "bg-bg-card border-border text-text-muted hover:text-text hover:bg-bg-emphasis"
            }`}
          >
            <PanelLeftIcon className="w-3.5 h-3.5 stroke-[1.8]" />
          </button>
        )}

        {/* Brand Silkscreen Typography */}
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-ram-orange shadow-[0_0_8px_#FF5500] shrink-0" />
          <span className="font-display text-xs font-bold tracking-wider uppercase text-text">
            TP-01 FIELD MARKER
          </span>
          <span className="px-1.5 py-0.5 text-[9px] font-mono bg-bg-card text-text-muted rounded border border-border font-semibold">
            REV. 2026
          </span>
        </div>

        <div className="hidden xl:flex items-center gap-2.5 pl-3 border-l border-border font-mono text-[10px] text-text-muted">
          <span>BANK: <strong className="text-text font-medium">A-09</strong></span>
          <span className="text-border">•</span>
          <span>TAPES: <strong className="text-text font-medium">{notes.length}</strong></span>
          <span className="text-border">•</span>
          <span>RAM: <strong className="text-text font-medium">42.8 KB</strong></span>
          <span className="text-border">•</span>
          <span>UTF-8</span>
        </div>
      </div>

      {/* Middle: Scale Selector & Mode Selector */}
      <div className="titlebar-no-drag flex items-center gap-3">
        {/* Scale Selector Pill */}
        <div
          onClick={handleCycleZoom}
          className="hidden sm:flex items-center gap-2 font-mono text-[10px] text-text-muted bg-bg-secondary px-2.5 py-1 rounded-md border border-border cursor-pointer hover:border-text-muted/50 transition-colors"
          title="Click to cycle text scale"
        >
          <span className="text-[9px] tracking-wider font-semibold text-text-muted">SCALE</span>
          <span className="text-text font-bold">{zoomDisplay}</span>
        </div>

        {/* Mode Buttons Segment */}
        <div className="flex items-center bg-bg-secondary p-0.5 rounded-lg border border-border font-mono text-[11px]">
          <button
            onClick={() => {
              if (sourceMode && onToggleSourceMode) onToggleSourceMode();
              if (focusMode && onToggleFocusMode) onToggleFocusMode();
            }}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              !sourceMode && !focusMode
                ? "bg-ram-orange text-white font-bold shadow-xs"
                : "font-medium text-text-muted hover:text-text hover:bg-bg-card/40"
            }`}
          >
            WRITE
          </button>
          <button
            onClick={() => {
              if (focusMode && onToggleFocusMode) onToggleFocusMode();
              if (onToggleSourceMode) onToggleSourceMode();
            }}
            title={`Toggle Markdown Source (${mod}${isMac ? "" : "+"}${isMac ? "Shift+" : "Shift+"}M)`}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              sourceMode
                ? "bg-ram-orange text-white font-bold shadow-xs"
                : "font-medium text-text-muted hover:text-text hover:bg-bg-card/40"
            }`}
          >
            SRC
          </button>
          <button
            onClick={() => {
              if (sourceMode && onToggleSourceMode) onToggleSourceMode();
              if (onToggleFocusMode) onToggleFocusMode();
            }}
            title={`Toggle Focus Mode (${mod}${isMac ? "" : "+"}Shift+Enter)`}
            className={`px-3 py-1 rounded transition-all cursor-pointer ${
              focusMode
                ? "bg-ram-orange text-white font-bold shadow-xs"
                : "font-medium text-text-muted hover:text-text hover:bg-bg-card/40"
            }`}
          >
            FOCUS
          </button>
        </div>
      </div>

      {/* Right: Live Sync Pill, Command Palette & Settings */}
      <div className="titlebar-no-drag flex items-center gap-2.5 sm:gap-3">
        {/* Live Sync Pill */}
        <div className="hidden sm:flex items-center gap-2 bg-bg-secondary px-2.5 py-1 rounded-md border border-border font-mono text-[10px]">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              isSyncing
                ? "bg-ram-cyan shadow-[0_0_6px_#00E5FF] animate-pulse"
                : status?.isRepo
                ? "bg-ram-green shadow-[0_0_6px_#10B981]"
                : "bg-ram-amber shadow-[0_0_6px_#F5A623]"
            }`}
          />
          <span className="text-ram-green font-semibold tracking-wider">
            {isSyncing ? "SYNCING" : status?.isRepo ? "SYNC OK" : "BUFFER OK"}
          </span>
          <span className="text-border">|</span>
          <span className="text-text-muted">PWR 94%</span>
        </div>

        {/* AI Command Palette Dispatch Button */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            title={`Command Palette (${mod}${isMac ? "" : "+"}P)`}
            className="px-2.5 sm:px-3 h-7 bg-ram-orange hover:brightness-110 text-white font-mono text-[11px] font-bold rounded-md flex items-center gap-1.5 shadow-[0_0_8px_rgba(255,85,0,0.35)] cursor-pointer transition-all shrink-0"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />
            <span>{mod}P DISPATCH</span>
          </button>
        )}

        {/* Discrete Settings Button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title={`Device Settings (${mod}${isMac ? "" : "+"},)`}
            className="w-7 h-7 rounded-md bg-bg-secondary border border-border hover:border-border-subtle hover:bg-bg-emphasis text-text-muted hover:text-text flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <SettingsIcon className="w-3.5 h-3.5 stroke-[1.8]" />
          </button>
        )}
      </div>
    </header>
  );
});
