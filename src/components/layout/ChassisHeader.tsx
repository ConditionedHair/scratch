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
      className="relative px-4 py-2 border-b-2 border-border bg-[#DDD9CF] dark:bg-[#1a1c22] flex flex-wrap items-center justify-between gap-3 z-30 shrink-0 select-none shadow-sm transition-colors"
      data-tauri-drag-region
    >
      {/* Left group: Silkscreen branding & toggle sidebar */}
      <div className={`titlebar-no-drag flex items-center gap-3 md:gap-5 ${isMac && !isWindows ? "pl-16 sm:pl-18" : "pl-3"}`}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            title={`Toggle Sidebar (${mod}${isMac ? "" : "+"}\\)`}
            className={`w-7 h-7 rounded border shadow-keycap chiclet-btn flex items-center justify-center transition-colors ${
              sidebarVisible
                ? "bg-[#ECE8E0] dark:bg-[#23252d] border-primary/50 text-primary"
                : "bg-[#ECE8E0] dark:bg-[#23252d] border-border text-text-muted hover:text-text"
            }`}
          >
            <PanelLeftIcon className="w-4 h-4 stroke-[1.5]" />
          </button>
        )}

        {/* Brand Silkscreen Typography */}
        <div className="flex items-center gap-2.5">
          <div className="w-3.5 h-3.5 rounded-full bg-ram-orange shadow-[0_0_8px_#FF5400] ring-2 ring-ram-orange/40 flex items-center justify-center shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-white opacity-90 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold tracking-widest uppercase text-text">
                TP-01 FIELD MARKER
              </span>
              <span className="hidden sm:inline-block px-1.5 py-0.2 text-[9px] font-mono bg-bg-muted text-text-muted rounded border border-border font-semibold">
                REV. 2026
              </span>
            </div>
            <p className="hidden md:block text-[8.5px] font-mono tracking-tight text-text-muted/80 uppercase">
              TACTILE NOTE PROCESSOR // MEM BANK A-09
            </p>
          </div>
        </div>
      </div>

      {/* Middle: Analog Potentiometer & Mode Selector */}
      <div className="titlebar-no-drag flex items-center gap-4 sm:gap-6">
        {/* Dial 1: Text Scale / Zoom */}
        <div
          onClick={handleCycleZoom}
          className="flex items-center gap-2 cursor-pointer group"
          title="Click to cycle text scale"
        >
          <span className="text-[9px] font-mono font-bold text-text-muted group-hover:text-text tracking-wider uppercase transition-colors">
            SCALE
          </span>
          <div className="relative w-7 h-7 rounded-full bg-[#EFECE6] dark:bg-[#23252d] border border-border shadow-knob flex items-center justify-center transition-all duration-150 group-hover:scale-105 group-active:scale-95">
            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-[#D6D0C2] to-[#F5F3ED] dark:from-[#1b1d23] dark:to-[#2b2e38] border border-border/60 flex items-center justify-center">
              <div
                className="w-0.75 h-2.5 bg-ram-orange rounded-full shadow-[0_0_4px_#FF5400] transition-transform duration-300 ease-out"
                style={{
                  transform: `rotate(${Math.round((interfaceZoom - 1.0) * 120 + 45)}deg)`,
                }}
              />
            </div>
          </div>
          <span className="font-mono text-[10px] text-text font-bold">
            {zoomDisplay}
          </span>
        </div>

        {/* Mode Selector Switch */}
        <div className="flex items-center gap-0.5 bg-bg-secondary dark:bg-[#121317] p-1 rounded-md border border-border shadow-inner">
          <button
            onClick={() => {
              if (sourceMode && onToggleSourceMode) onToggleSourceMode();
              if (focusMode && onToggleFocusMode) onToggleFocusMode();
            }}
            className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-xs transition-all duration-150 active:scale-95 cursor-pointer ${
              !sourceMode && !focusMode
                ? "bg-ram-orange text-white shadow-xs font-extrabold"
                : "text-text-muted hover:text-text hover:bg-bg-card/40"
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
            className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-xs transition-all duration-150 active:scale-95 cursor-pointer ${
              sourceMode
                ? "bg-ram-orange text-white shadow-xs font-extrabold"
                : "text-text-muted hover:text-text hover:bg-bg-card/40"
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
            className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-xs transition-all duration-150 active:scale-95 cursor-pointer ${
              focusMode
                ? "bg-ram-orange text-white shadow-xs font-extrabold"
                : "text-text-muted hover:text-text hover:bg-bg-card/40"
            }`}
          >
            FOCUS
          </button>
        </div>
      </div>

      {/* Right Telemetry: Live status LEDs, Command Palette & Settings */}
      <div className="titlebar-no-drag flex items-center gap-2.5 sm:gap-3 pr-2">
        {/* Status Telemetry Badge */}
        <div className="hidden sm:flex items-center gap-2 bg-[#FAF8F5] dark:bg-[#0d0e11] px-2.5 py-1 rounded-md border border-border shadow-inner font-mono text-[9px]">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isSyncing
                  ? "bg-ram-cyan shadow-[0_0_6px_#00E5FF] animate-pulse"
                  : status?.isRepo
                  ? "bg-ram-green shadow-[0_0_6px_#10B981]"
                  : "bg-ram-amber shadow-[0_0_6px_#F5A623]"
              }`}
            />
            <span className="text-text font-bold">
              {isSyncing ? "SYNCING" : status?.isRepo ? "SYNC OK" : "BUFFER OK"}
            </span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1 text-text-muted">
            <span>{notes.length} TAPES</span>
          </div>
        </div>

        {/* AI Command Palette Dispatch Button */}
        {onOpenCommandPalette && (
          <button
            onClick={onOpenCommandPalette}
            title={`Command Palette (${mod}${isMac ? "" : "+"}P)`}
            className="px-2.5 py-1 bg-ram-orange hover:brightness-110 text-white font-mono text-[10px] font-bold rounded shadow-keycap chiclet-btn flex items-center gap-1.5 shadow-[0_0_8px_rgba(255,84,0,0.35)]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            <span>{mod}P DISPATCH</span>
          </button>
        )}

        {/* Settings button */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            title={`Device Settings (${mod}${isMac ? "" : "+"},)`}
            className="w-7 h-7 rounded bg-[#ECE8E0] dark:bg-[#23252d] border border-border shadow-keycap chiclet-btn flex items-center justify-center text-text-muted hover:text-text hover:bg-white dark:hover:bg-[#2c2f39]"
          >
            <SettingsIcon className="w-4 h-4 stroke-[1.6]" />
          </button>
        )}
      </div>
    </header>
  );
});
