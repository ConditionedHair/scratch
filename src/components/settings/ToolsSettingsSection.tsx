import { useState, useEffect, useReducer } from "react";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { Button } from "../ui";
import {
  SpinnerIcon,
  CheckIcon,
  ClaudeIcon,
  CodexIcon,
  OpenCodeIcon,
  OllamaIcon,
} from "../icons";
import { AI_PROVIDER_ORDER, type AiProvider } from "../../services/ai";
import * as aiService from "../../services/ai";
import { mod } from "../../lib/platform";
import * as cliService from "../../services/cli";
import type { CliStatus } from "../../services/cli";

type CliState = {
  status: CliStatus | null;
  loaded: boolean;
  error: boolean;
  operating: boolean;
};

type CliAction =
  | { type: "loaded"; status: CliStatus }
  | { type: "error" }
  | { type: "operating" }
  | { type: "operated"; status: CliStatus }
  | { type: "operate_failed" };

const cliInitialState: CliState = {
  status: null,
  loaded: false,
  error: false,
  operating: false,
};

function cliReducer(state: CliState, action: CliAction): CliState {
  switch (action.type) {
    case "loaded":
      return { ...state, status: action.status, loaded: true, error: false };
    case "error":
      return { ...state, error: true };
    case "operating":
      return { ...state, operating: true };
    case "operated":
      return { ...state, status: action.status, operating: false };
    case "operate_failed":
      return { ...state, operating: false };
  }
}

const AI_PROVIDER_INFO: Record<
  AiProvider,
  {
    name: string;
    icon: React.ComponentType<{ className?: string }>;
    installUrl: string;
  }
> = {
  claude: {
    name: "Claude Code",
    icon: ClaudeIcon,
    installUrl: "https://code.claude.com/docs/en/quickstart",
  },
  codex: {
    name: "OpenAI Codex",
    icon: CodexIcon,
    installUrl: "https://github.com/openai/codex",
  },
  opencode: {
    name: "OpenCode",
    icon: OpenCodeIcon,
    installUrl: "https://opencode.ai",
  },
  ollama: {
    name: "Ollama",
    icon: OllamaIcon,
    installUrl: "https://ollama.com",
  },
};

const AI_PROVIDER_DESCRIPTIONS: Record<AiProvider, { tag: string; desc: string }> = {
  claude: {
    tag: "ANTHROPIC API",
    desc: "Direct CLI synthesis & fast contextual execution",
  },
  codex: {
    tag: "GPT-4o / REASONING",
    desc: "Cloud completion engine via personal authorization key",
  },
  opencode: {
    tag: "LOCAL PIPELINE",
    desc: "Autonomous local code and syntax generator",
  },
  ollama: {
    tag: "DAEMON: 127.0.0.1:11434",
    desc: "Llama 3.3, DeepSeek-R1, Mistral offline inference",
  },
};

export function ToolsSettingsSection() {
  const [cli, dispatchCli] = useReducer(cliReducer, cliInitialState);
  const [aiProviders, setAiProviders] = useState<AiProvider[]>([]);
  const [aiProvidersLoading, setAiProvidersLoading] = useState(true);

  useEffect(() => {
    cliService
      .getCliStatus()
      .then((status) => dispatchCli({ type: "loaded", status }))
      .catch((err) => {
        console.error("Failed to get CLI status:", err);
        dispatchCli({ type: "error" });
      });
  }, []);

  useEffect(() => {
    aiService
      .getAvailableAiProviders()
      .then(setAiProviders)
      .catch(() => setAiProviders([]))
      .finally(() => setAiProvidersLoading(false));
  }, []);

  const handleInstallCli = async () => {
    dispatchCli({ type: "operating" });
    try {
      await cliService.installCli();
      const status = await cliService.getCliStatus();
      dispatchCli({ type: "operated", status });
      toast.success(
        "CLI tool installed. Open a new terminal to use `scratch`.",
      );
    } catch (err) {
      dispatchCli({ type: "operate_failed" });
      toast.error(
        err instanceof Error ? err.message : "Failed to install CLI tool",
      );
    }
  };

  const handleUninstallCli = async () => {
    dispatchCli({ type: "operating" });
    try {
      await cliService.uninstallCli();
      const status = await cliService.getCliStatus();
      dispatchCli({ type: "operated", status });
      toast.success("CLI tool uninstalled.");
    } catch (err) {
      dispatchCli({ type: "operate_failed" });
      toast.error(
        err instanceof Error ? err.message : "Failed to uninstall CLI tool",
      );
    }
  };

  return (
    <div className="space-y-7 pb-4">
      {/* SECTION A: AI Providers */}
      <div className="space-y-4" data-purpose="ai-providers-section">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/80 pb-3 gap-2 font-mono">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-bold text-text font-sans tracking-wide uppercase">
                AI PROVIDERS
              </h2>
              <span className="text-[10px] px-1.5 py-0.5 bg-bg-muted text-text-muted rounded font-mono">
                [ DISPATCH BUS ]
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Edit notes with AI from the command palette (<kbd className="px-1.5 py-0.5 bg-bg-card border border-border rounded text-text font-mono text-[10px]">{mod}P</kbd> while editing a note)
            </p>
          </div>
          <div className="text-[10px] text-emerald-500 tracking-wider font-semibold flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
            <span>ROUTING ENGINE: ACTIVE</span>
          </div>
        </div>

        {/* Provider Racks */}
        {aiProvidersLoading ? (
          <div className="flex items-center gap-2 p-4 rounded-xl bg-bg border border-border">
            <SpinnerIcon className="w-4 h-4 animate-spin text-text-muted" />
            <span className="text-xs font-mono text-text-muted">
              Detecting installed providers...
            </span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {AI_PROVIDER_ORDER.map((provider) => {
              const installed = aiProviders.includes(provider);
              const info = AI_PROVIDER_INFO[provider];
              const meta = AI_PROVIDER_DESCRIPTIONS[provider];
              return (
                <div
                  key={provider}
                  className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-lg bg-bg border border-border hover:border-border/80 transition-all gap-3 shadow-screen-inset"
                >
                  <div className="flex items-center space-x-3.5">
                    <div className="w-8 h-8 rounded-lg bg-bg-card border border-border flex items-center justify-center text-text shadow-xs shrink-0">
                      <info.icon className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-xs font-semibold text-text font-mono tracking-wide">
                          {info.name}
                        </h3>
                        <span className="text-[9px] text-text-muted font-mono uppercase bg-bg-card px-1.5 py-0.2 rounded border border-border">
                          {meta.tag}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted font-mono mt-0.5">
                        {meta.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-auto font-mono">
                    {installed ? (
                      <div className="flex items-center space-x-2 bg-bg-card px-3 py-1.5 rounded-lg border border-border shadow-xs">
                        <span className="text-xs text-text font-medium tracking-wide">
                          Installed
                        </span>
                        <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                          <CheckIcon className="w-2.5 h-2.5 text-emerald-500 stroke-[2.5]" />
                        </div>
                      </div>
                    ) : (
                      <a
                        href={info.installUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-1.5 rounded-lg text-xs font-semibold font-mono bg-bg-card hover:bg-bg-emphasis text-text border border-border shadow-keycap active:shadow-keycap-pressed transition-all cursor-pointer"
                      >
                        Install
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SECTION B: CLI Tool Bus */}
      {(cli.loaded && cli.status?.supported) || cli.error ? (
        <div className="space-y-4 pt-2" data-purpose="cli-bus-section">
          <div className="flex flex-col sm:flex-row sm:items-baseline justify-between border-b border-border/80 pb-3 gap-2 font-mono">
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-text font-sans tracking-wide uppercase">
                  CLI TOOL
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 bg-bg-muted text-text-muted rounded font-mono">
                  [ UNIX BRIDGE ]
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1">
                Open notes from the terminal with the{" "}
                <code className="px-1.5 py-0.5 bg-bg-card text-primary border border-border rounded font-mono text-[11px]">
                  scratch
                </code>{" "}
                command
              </p>
            </div>
            <div className="flex items-center space-x-1.5 text-[10px] text-emerald-500 font-mono font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
              <span>{cli.status?.installed ? "DAEMON READY" : "OFFLINE"}</span>
            </div>
          </div>

          {/* Terminal Status Card Enclosure */}
          <div className="rounded-xl bg-bg border border-border p-4 lg:p-5 space-y-4 shadow-screen-inset">
            {cli.error ? (
              <div className="bg-red-500/10 border border-red-500/20 rounded-md p-3 font-mono text-xs text-red-500">
                Failed to check CLI status. Please restart the app.
              </div>
            ) : cli.status === null ? (
              <div className="p-4 flex items-center justify-center">
                <SpinnerIcon className="w-4.5 h-4.5 stroke-[1.5] animate-spin text-text-muted" />
              </div>
            ) : cli.status.installed ? (
              <>
                {/* Status and Path Rows */}
                <div className="space-y-3 pb-3 border-b border-border/70 font-mono text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-text-muted tracking-wider uppercase font-semibold text-[11px]">
                      Status
                    </span>
                    <div className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_#10b981]" />
                      <span className="text-text font-bold">Installed</span>
                    </div>
                  </div>

                  {cli.status.path && (
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <span className="text-text-muted tracking-wider uppercase font-semibold text-[11px]">
                        Path
                      </span>
                      <div className="flex items-center space-x-2">
                        <div className="px-3 py-1.5 bg-bg-card text-text font-mono text-xs rounded-lg border border-border flex items-center space-x-2">
                          <span className="text-text-muted">$PATH:</span>
                          <span className="text-text">{cli.status.path}</span>
                        </div>
                        <button
                          className="px-2.5 py-1.5 bg-bg-card hover:bg-bg-emphasis text-text rounded-lg border border-border text-[11px] font-mono font-semibold transition-colors cursor-pointer shadow-xs"
                          title="Copy binary path"
                          type="button"
                          onClick={async () => {
                            try {
                              await invoke("copy_to_clipboard", { text: cli.status!.path! });
                              toast.success("Path copied to clipboard");
                            } catch {
                              toast.error("Failed to copy path");
                            }
                          }}
                        >
                          COPY
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* CRT Terminal Shell Preview */}
                <div className="relative rounded-lg bg-[#0a0b0d] border border-border p-4 overflow-hidden text-neutral-300">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] text-neutral-500 font-mono">
                    <span>TERMINAL BUFFER PREVIEW</span>
                    <span>SHELL: ZSH / BASH</span>
                  </div>
                  <pre className="font-mono text-xs leading-relaxed space-y-1">
                    <span className="text-neutral-500">$</span> scratch file.md    <span className="text-neutral-500"># open note directly into hardware buffer</span>
                    <br />
                    <span className="text-neutral-500">$</span> scratch .          <span className="text-neutral-500"># mount working directory as active tape bank</span>
                    <br />
                    <span className="text-neutral-500">$</span> scratch            <span className="text-neutral-500"># launch field marker desktop interface</span>
                  </pre>
                </div>

                {/* Action Strip */}
                <div className="flex items-center justify-between pt-1">
                  <Button
                    onClick={handleUninstallCli}
                    disabled={cli.operating}
                    variant="outline"
                    size="sm"
                    className="font-mono text-xs text-red-500 hover:text-red-400 hover:bg-red-500/10"
                  >
                    {cli.operating ? (
                      <>
                        <SpinnerIcon className="w-3.25 h-3.25 mr-2 animate-spin" />
                        Uninstalling...
                      </>
                    ) : (
                      "Uninstall CLI Tool"
                    )}
                  </Button>
                  <span className="text-[10px] text-text-muted/60 font-mono">
                    BIN REV: 1.0.4 • SHA256: VALIDATED
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-4 font-mono">
                <div className="relative rounded-lg bg-[#0a0b0d] border border-border p-4 overflow-hidden text-neutral-300">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-[10px] text-neutral-500 font-mono">
                    <span>UNIX BUS INTEGRATION</span>
                  </div>
                  <pre className="text-xs leading-relaxed text-neutral-400">
                    Install the scratch CLI binary to ~/bin or /usr/local/bin to enable direct terminal launching.
                  </pre>
                </div>

                <Button
                  onClick={handleInstallCli}
                  disabled={cli.operating}
                  variant="primary"
                  size="md"
                  className="font-mono text-xs"
                >
                  {cli.operating ? (
                    <>
                      <SpinnerIcon className="w-3.25 h-3.25 mr-2 animate-spin" />
                      Installing...
                    </>
                  ) : (
                    "Install CLI Tool"
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
