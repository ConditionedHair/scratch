import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { showUpdateToast } from "../../App";
import { Button } from "../ui";
import { RefreshCwIcon, SpinnerIcon, GithubIcon } from "../icons";

export function AboutSettingsSection() {
  const [appVersion, setAppVersion] = useState<string>("");
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [selfTesting, setSelfTesting] = useState(false);

  useEffect(() => {
    getVersion()
      .then(setAppVersion)
      .catch(() => {});
  }, []);

  const handleCheckForUpdates = async () => {
    setCheckingUpdate(true);
    const result = await showUpdateToast();
    setCheckingUpdate(false);
    if (result === "no-update") {
      toast.success("You're on the latest firmware version!");
    } else if (result === "error") {
      toast.error("Could not check for firmware updates. Try again later.");
    }
  };

  const handleRunSelfTest = () => {
    setSelfTesting(true);
    setTimeout(() => {
      setSelfTesting(false);
      toast.success("Hardware self-test passed: All subsystems nominal [OK]");
    }, 1200);
  };

  const handleOpenUrl = async (url: string) => {
    try {
      await invoke("open_url_safe", { url });
    } catch (err) {
      console.error("Failed to open URL:", err);
      toast.error(err instanceof Error ? err.message : "Failed to open URL");
    }
  };

  return (
    <div className="space-y-6 pb-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/80 pb-3 gap-2 font-mono">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-text font-sans tracking-wide uppercase">
              DEVICE ARCHITECTURE &amp; TELEMETRY
            </h2>
            <span className="text-[10px] px-1.5 py-0.5 bg-primary/15 text-primary border border-primary/30 rounded font-mono font-bold">
              [ FIRMWARE // REV {appVersion || "2026.1"} ]
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1">
            Hardware build specs, memory allocation matrix, open source licenses, and tactile diagnostic bus
          </p>
        </div>
        <div className="flex items-center space-x-1.5 text-[10px] text-emerald-500 font-mono font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
          <span>BUS: NOMINAL</span>
        </div>
      </div>

      {/* MODULE A: Hardware Specification & Build Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
              MODULE A
            </span>
            <span className="text-text-muted/40">//</span>
            <span className="text-xs font-semibold text-text uppercase tracking-wide">
              HARDWARE SPECIFICATION &amp; BUILD MATRIX
            </span>
          </div>
          <span className="text-[10px] text-text-muted">SYS_ARCH_X86_ARM</span>
        </div>

        <div className="rounded-xl bg-bg border border-border p-4 space-y-3.5 shadow-screen-inset">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-bg-card border border-border flex justify-between items-center shadow-xs">
              <span className="text-text-muted text-[11px]">DEVICE ID</span>
              <span className="text-text font-bold text-[11px]">TP-01-FIELD-MARKER</span>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-card border border-border flex justify-between items-center shadow-xs">
              <span className="text-text-muted text-[11px]">FIRMWARE VERSION</span>
              <span className="text-primary font-bold text-[11px]">v{appVersion || "1.0.0"}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-card border border-border flex justify-between items-center shadow-xs">
              <span className="text-text-muted text-[11px]">ARCHITECTURE</span>
              <span className="text-text text-[11px]">TAURI-NATIVE // RUST V2</span>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-card border border-border flex justify-between items-center shadow-xs">
              <span className="text-text-muted text-[11px]">CORE ENGINE</span>
              <span className="text-text text-[11px]">PROSEMIRROR / TIPTAP 3</span>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-card border border-border flex justify-between items-center shadow-xs">
              <span className="text-text-muted text-[11px]">LOCAL INFERENCE</span>
              <span className="text-emerald-500 font-semibold text-[11px]">OLLAMA / CLAUDE / CODEX</span>
            </div>
            <div className="p-2.5 rounded-lg bg-bg-card border border-border flex justify-between items-center shadow-xs">
              <span className="text-text-muted text-[11px]">DISPLAY PIPELINE</span>
              <span className="text-text text-[11px]">GPU ACCELERATED OLED BUFFER</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1 font-mono">
            <Button
              onClick={handleCheckForUpdates}
              disabled={checkingUpdate}
              variant="default"
              size="sm"
              className="gap-1.5 text-xs font-bold"
            >
              {checkingUpdate ? (
                <>
                  <SpinnerIcon className="w-3.5 h-3.5 stroke-[1.5] animate-spin" />
                  Checking Firmware...
                </>
              ) : (
                <>
                  <RefreshCwIcon className="w-3.5 h-3.5 stroke-[1.5]" />
                  [ CHECK FIRMWARE UPDATES ]
                </>
              )}
            </Button>
            <Button
              onClick={() => handleOpenUrl("https://www.ericli.io/scratch")}
              variant="outline"
              size="sm"
              className="text-xs"
            >
              [ FIELD DOCUMENTATION ]
            </Button>
          </div>
        </div>
      </div>

      {/* MODULE B: System Integrity & Hardware Bus Test */}
      <div className="space-y-3">
        <div className="flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
              MODULE B
            </span>
            <span className="text-text-muted/40">//</span>
            <span className="text-xs font-semibold text-text uppercase tracking-wide">
              SYSTEM INTEGRITY &amp; HARDWARE BUS TEST
            </span>
          </div>
          <span className="text-[10px] text-text-muted">CYCLE: REALTIME</span>
        </div>

        <div className="rounded-xl bg-bg border border-border p-4 space-y-3 shadow-screen-inset">
          <div className="space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-bg-card border border-border">
              <div className="flex items-center space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                <span className="text-text-muted">NVRAM Tape Buffer</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-text font-bold">42.8 KB utilized</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/40 text-[10px] font-bold">
                  OK
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-bg-card border border-border">
              <div className="flex items-center space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                <span className="text-text-muted">Local Daemon Bridge</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-text font-bold">ONLINE</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/40 text-[10px] font-bold">
                  OK
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg bg-bg-card border border-border">
              <div className="flex items-center space-x-2.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                <span className="text-text-muted">Tactile Keycap Latency</span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-text font-bold">0.8ms Polling Rate</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/40 text-[10px] font-bold">
                  OPTIMAL
                </span>
              </div>
            </div>
          </div>

          <div className="pt-1 flex items-center justify-between font-mono">
            <button
              onClick={handleRunSelfTest}
              disabled={selfTesting}
              type="button"
              className="chiclet-btn flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-bg-card hover:bg-bg-emphasis text-text border border-border shadow-keycap active:shadow-keycap-pressed transition-all cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]" />
              <span>{selfTesting ? "TESTING SUBSYSTEMS..." : "[ RUN HARDWARE SELF-TEST ]"}</span>
            </button>
            <span className="text-[10px] text-text-muted">
              CALIBRATED // FIELD SPEC
            </span>
          </div>
        </div>
      </div>

      {/* MODULE C: Tribute & Design Philosophy */}
      <div className="space-y-3">
        <div className="flex items-center justify-between font-mono">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] uppercase tracking-widest text-text-muted font-bold">
              MODULE C
            </span>
            <span className="text-text-muted/40">//</span>
            <span className="text-xs font-semibold text-text uppercase tracking-wide">
              TRIBUTE &amp; DESIGN PHILOSOPHY
            </span>
          </div>
          <span className="text-[10px] text-text-muted">ARCHIVE SPEC</span>
        </div>

        <div className="rounded-xl bg-bg border border-border p-4 space-y-3 shadow-screen-inset">
          <div className="border-l-2 border-primary pl-3 space-y-1">
            <h4 className="text-xs font-bold text-text font-mono tracking-wider uppercase">
              DESIGNED IN COLLABORATION WITH THE GHOST OF DIETER RAMS &amp; TEENAGE ENGINEERING
            </h4>
            <p className="text-xs text-text-muted italic font-mono leading-relaxed">
              “Weniger, aber besser — Less, but better. A dedicated tactile writing instrument calibrated for frictionless thought and mechanical precision.”
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/70 font-mono">
            <Button
              onClick={() => handleOpenUrl("https://github.com/erictli/scratch")}
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
            >
              <GithubIcon className="w-3.5 h-3.5 stroke-[1.5]" />
              [ REPO / GITHUB ]
            </Button>
            <Button
              onClick={() => handleOpenUrl("https://github.com/erictli/scratch/issues")}
              variant="ghost"
              size="sm"
              className="text-xs"
            >
              [ SUBMIT FEEDBACK ]
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
