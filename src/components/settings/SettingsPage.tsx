import { useState, useEffect, useRef } from "react";
import {
  ArrowLeftIcon,
  FolderIcon,
  SwatchIcon,
  KeyboardIcon,
  InfoIcon,
  IntegrationsIcon,
} from "../icons";
import { GeneralSettingsSection } from "./GeneralSettingsSection";
import { AppearanceSettingsSection } from "./EditorSettingsSection";
import { ShortcutsSettingsSection } from "./ShortcutsSettingsSection";
import { AboutSettingsSection } from "./AboutSettingsSection";
import { ToolsSettingsSection } from "./ToolsSettingsSection";
import { mod, isMac, isWindows } from "../../lib/platform";
import { useGit } from "../../context/GitContext";

interface SettingsPageProps {
  onBack: () => void;
}

type SettingsTab = "general" | "tools" | "editor" | "shortcuts" | "about";

const tabs: {
  id: SettingsTab;
  num: string;
  label: string;
  icon: typeof FolderIcon;
  shortcut: string;
}[] = [
  { id: "general", num: "01", label: "FOLDER", icon: FolderIcon, shortcut: "1" },
  { id: "tools", num: "02", label: "INTEGRATIONS", icon: IntegrationsIcon, shortcut: "2" },
  { id: "editor", num: "03", label: "APPEARANCE", icon: SwatchIcon, shortcut: "3" },
  { id: "shortcuts", num: "04", label: "SHORTCUTS", icon: KeyboardIcon, shortcut: "4" },
  { id: "about", num: "05", label: "ABOUT", icon: InfoIcon, shortcut: "5" },
];

export function SettingsPage({ onBack }: SettingsPageProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { status, isSyncing } = useGit();

  // Reset scroll position when tab changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeTab]);

  // Keyboard shortcuts (Cmd/Ctrl + 1-5, ESC to exit)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onBack();
        return;
      }
      if (e.metaKey || e.ctrlKey) {
        if (e.key === "1") {
          e.preventDefault();
          setActiveTab("general");
        } else if (e.key === "2") {
          e.preventDefault();
          setActiveTab("tools");
        } else if (e.key === "3") {
          e.preventDefault();
          setActiveTab("editor");
        } else if (e.key === "4") {
          e.preventDefault();
          setActiveTab("shortcuts");
        } else if (e.key === "5") {
          e.preventDefault();
          setActiveTab("about");
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onBack]);

  return (
    <div className="h-full w-full flex flex-col bg-bg text-text select-none overflow-hidden bg-chassis-grain">
      {/* Top Instrument Control Header */}
      <header
        className="w-full px-4 py-2.5 border-b border-border bg-[#DDD9CF] dark:bg-[#1a1c22] flex items-center justify-between gap-3 shrink-0 z-30 shadow-xs"
        data-tauri-drag-region
      >
        {/* Hardware Corner Screws */}
        <div className="absolute top-2.5 left-2 screw-head pointer-events-none opacity-80" />
        <div className="absolute top-2.5 right-2 screw-head pointer-events-none opacity-80" />

        {/* Left: Brand / Status Diode */}
        <div className={`titlebar-no-drag flex items-center gap-3 ${isMac && !isWindows ? "pl-16 sm:pl-18" : "pl-2"}`}>
          <div className="w-3.5 h-3.5 rounded-full bg-primary shadow-[0_0_8px_var(--color-primary)] ring-2 ring-primary/40 flex items-center justify-center shrink-0">
            <div className="w-1.5 h-1.5 rounded-full bg-white opacity-90 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold tracking-widest text-text uppercase">
                TP-01 FIELD MARKER
              </span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-bg-card text-text-muted border border-border font-semibold">
                REV. 2026
              </span>
            </div>
            <p className="text-[9px] font-mono text-text-muted/80 tracking-wider uppercase">
              SYSTEM CONFIG &amp; INTEGRATION BUS // MEMORY BANK A-09
            </p>
          </div>
        </div>

        {/* Center: Audio / Clock / Context chips */}
        <div className="hidden lg:flex items-center gap-5">
          <div className="flex items-center gap-2 bg-bg-card px-2.5 py-1 rounded border border-border">
            <div className="w-10 h-3.5 speaker-vent opacity-60" />
            <span className="text-[9px] font-mono text-text-muted tracking-widest">BUS//IO</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-text-muted">
            <span className="text-[10px] tracking-widest">CLOCK</span>
            <div className="w-5 h-5 rounded-full shadow-knob relative flex items-center justify-center border border-border">
              <div className="w-0.5 h-1.5 bg-primary rounded-full -translate-y-1" />
            </div>
            <span className="text-[11px] font-bold text-text">2.4GHz</span>
          </div>

          <div className="flex items-center bg-bg-card p-0.5 rounded border border-border font-mono text-[10px]">
            <span className="px-2 py-0.5 text-text-muted">WRITE</span>
            <span className="px-2 py-0.5 text-text-muted">SPLIT</span>
            <span className="px-2.5 py-0.5 font-bold bg-primary text-primary-foreground rounded shadow-xs">
              CONFIG
            </span>
          </div>
        </div>

        {/* Right: Telemetry & Exit Button */}
        <div className="titlebar-no-drag flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2.5 bg-bg-card px-2.5 py-1 rounded border border-border text-[10px] font-mono">
            <span className="flex items-center gap-1.5 text-emerald-500 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
              <span>{isSyncing ? "SYNCING" : status?.hasRemote ? "SYNC OK" : "LOCAL"}</span>
            </span>
            <span className="text-border">|</span>
            <span className="text-text-muted">PWR: 98%</span>
          </div>

          <button
            onClick={onBack}
            className="chiclet-btn flex items-center gap-1.5 bg-bg-card hover:bg-bg-emphasis active:bg-bg-card text-text px-3 py-1.5 rounded-lg border border-border shadow-keycap text-xs font-mono font-bold tracking-wider cursor-pointer"
            type="button"
            title={`Exit Settings (${mod}${isMac ? "" : "+"}, or Esc)`}
          >
            <ArrowLeftIcon className="w-3.5 h-3.5 stroke-[2]" />
            <span>EXIT [ESC]</span>
          </button>
        </div>
      </header>

      {/* Master Chassis Interior */}
      <div className="flex-1 w-full flex p-3 gap-3 min-h-0 relative overflow-hidden">
        {/* Module Navigation Dock */}
        <aside
          className="w-56 sm:w-64 flex flex-col justify-between bg-bg-card rounded-xl border border-border p-3 shadow-screen-inset shrink-0 select-none"
          data-purpose="settings-module-dock"
        >
          <div className="space-y-3">
            {/* Dock Label */}
            <div className="flex items-center justify-between px-2 pt-0.5 pb-2 border-b border-border/80 font-mono">
              <span className="text-[10px] tracking-widest text-text-muted font-bold uppercase">
                SYSTEM BUS ROUTING
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            </div>

            {/* Navigation Modules Rack */}
            <nav className="space-y-1.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg font-mono text-xs transition-all cursor-pointer ${
                      isActive
                        ? "bg-bg-emphasis text-text border-l-4 border-l-primary border-y border-r border-border shadow-xs font-bold"
                        : "text-text-muted hover:text-text hover:bg-bg-muted/70 border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`text-[11px] font-bold ${
                          isActive ? "text-primary" : "text-text-muted/60"
                        }`}
                      >
                        {tab.num}
                      </span>
                      <Icon
                        className={`w-4 h-4 ${
                          isActive ? "text-primary" : "text-text-muted"
                        } stroke-[1.8]`}
                      />
                      <span className="tracking-wider text-[11px] uppercase">
                        {tab.label}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded border font-mono ${
                        isActive
                          ? "text-primary bg-primary/10 border-primary/30 font-bold"
                          : "text-text-muted/60 bg-bg border-border/60"
                      }`}
                    >
                      {mod}{tab.shortcut}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Sub-telemetry dock footer */}
          <div className="p-2.5 rounded-lg bg-bg border border-border/80 space-y-1 text-[9px] font-mono text-text-muted">
            <div className="flex justify-between">
              <span>BUS ADDR</span>
              <span className="text-text font-bold">0x7F::880</span>
            </div>
            <div className="flex justify-between">
              <span>BUFFER ALLOC</span>
              <span className="text-text font-bold">42.8 KB</span>
            </div>
            <div className="flex justify-between">
              <span>FIRMWARE</span>
              <span className="text-text-muted font-bold">v2.60-TE</span>
            </div>
          </div>
        </aside>

        {/* Content Rack Panel */}
        <section
          className="flex-1 bg-bg-card rounded-xl border border-border p-5 lg:p-7 overflow-y-auto shadow-screen-inset flex flex-col justify-between"
          data-purpose="settings-rack-panel"
        >
          <div ref={scrollContainerRef} className="max-w-4xl space-y-6">
            {activeTab === "general" && <GeneralSettingsSection />}
            {activeTab === "tools" && <ToolsSettingsSection />}
            {activeTab === "editor" && <AppearanceSettingsSection />}
            {activeTab === "shortcuts" && <ShortcutsSettingsSection />}
            {activeTab === "about" && <AboutSettingsSection />}
          </div>

          {/* Panel Telemetry Footer */}
          <div className="pt-6 mt-6 flex items-center justify-between text-[10px] font-mono text-text-muted/70 border-t border-border/60">
            <span>TELEMETRY PROTOCOL: ISO-9001 // TE-SYS-DIAG</span>
            <span>SYSTEM CHASSIS: NOMINAL</span>
          </div>
        </section>
      </div>
    </div>
  );
}
