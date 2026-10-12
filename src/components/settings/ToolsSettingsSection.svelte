<script lang="ts">
  import { onMount } from "svelte";
  import { invoke } from "@tauri-apps/api/core";
  import { toast } from "svelte-sonner";
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
  import type { Component } from "svelte";

  let cliStatus = $state<CliStatus | null>(null);
  let cliLoaded = $state(false);
  let cliError = $state(false);
  let cliOperating = $state(false);

  let aiProviders = $state<AiProvider[]>([]);
  let aiProvidersLoading = $state(true);

  const AI_PROVIDER_INFO: Record<
    AiProvider,
    {
      name: string;
      icon: Component<{ class?: string }>;
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

  onMount(() => {
    cliService
      .getCliStatus()
      .then((status) => {
        cliStatus = status;
        cliLoaded = true;
        cliError = false;
      })
      .catch((err) => {
        console.error("Failed to get CLI status:", err);
        cliError = true;
      });

    aiService
      .getAvailableAiProviders()
      .then((providers) => {
        aiProviders = providers;
      })
      .catch(() => {
        aiProviders = [];
      })
      .finally(() => {
        aiProvidersLoading = false;
      });
  });

  async function handleInstallCli() {
    cliOperating = true;
    try {
      await cliService.installCli();
      cliStatus = await cliService.getCliStatus();
      toast.success("CLI tool installed. Open a new terminal to use `scratch`.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to install CLI tool"
      );
    } finally {
      cliOperating = false;
    }
  }

  async function handleUninstallCli() {
    cliOperating = true;
    try {
      await cliService.uninstallCli();
      cliStatus = await cliService.getCliStatus();
      toast.success("CLI tool uninstalled.");
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Failed to uninstall CLI tool"
      );
    } finally {
      cliOperating = false;
    }
  }
</script>

{#snippet cliUsageHint()}
  <p class="text-sm text-text-muted font-mono">
    scratch file.md # open note
    <br />
    scratch . # open folder
    <br />
    scratch # launch app
  </p>
{/snippet}

<div class="space-y-8 py-8">
  <!-- AI Providers -->
  <section class="pb-2">
    <h2 class="text-xl font-medium mb-0.5">AI Providers</h2>
    <p class="text-sm text-text-muted mb-4">
      Edit notes with AI from the command palette ({mod}P while editing a note)
    </p>

    {#if aiProvidersLoading}
      <div class="flex items-center gap-2 p-3">
        <SpinnerIcon class="w-4 h-4 animate-spin text-text-muted" />
        <span class="text-sm text-text-muted">
          Detecting installed providers...
        </span>
      </div>
    {:else}
      <div class="space-y-2">
        {#each AI_PROVIDER_ORDER as provider (provider)}
          {@const installed = aiProviders.includes(provider)}
          {@const info = AI_PROVIDER_INFO[provider]}
          {@const Icon = info.icon}
          <div class="flex items-center justify-between p-3 rounded-[10px] border border-border">
            <div class="flex items-center gap-2.5">
              <Icon class="w-4.5 h-4.5 text-text-muted" />
              <span class="text-sm font-medium">{info.name}</span>
            </div>
            {#if installed}
              <span class="flex items-center gap-1.25 text-sm text-text-muted">
                Installed
                <span class="h-4.5 w-4.5 bg-bg-emphasis rounded-full flex items-center justify-center">
                  <CheckIcon class="w-3 h-3 stroke-[2.2]" />
                </span>
              </span>
            {:else}
              <a
                href={info.installUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="text-sm text-text font-medium hover:text-text-muted transition-colors cursor-pointer"
              >
                Install
              </a>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
  </section>

  <!-- CLI Tool (macOS only) -->
  {#if (cliLoaded && cliStatus?.supported) || cliError}
    <div class="border-t border-border border-dashed"></div>

    <section class="pb-2">
      <h2 class="text-xl font-medium mb-0.5">CLI Tool</h2>
      <p class="text-sm text-text-muted mb-4">
        Open notes from the terminal with the{" "}
        <code class="font-mono text-xs bg-bg-muted px-1.5 py-0.5 rounded">
          scratch
        </code>{" "}
        command
      </p>

      {#if cliError}
        <div class="bg-red-500/10 border border-red-500/20 rounded-md p-3">
          <p class="text-sm text-red-500">
            Failed to check CLI status. Please restart the app.
          </p>
        </div>
      {:else if cliStatus === null}
        <div class="rounded-[10px] border border-border p-4 flex items-center justify-center">
          <SpinnerIcon class="w-4.5 h-4.5 stroke-[1.5] animate-spin text-text-muted" />
        </div>
      {:else if cliStatus.installed}
        <div class="rounded-[10px] border border-border p-4 space-y-3 mb-2.5">
          <div class="flex items-center justify-between">
            <span class="text-sm text-text font-medium">Status</span>
            <span class="text-sm text-text-muted">Installed</span>
          </div>
          {#if cliStatus.path}
            <div class="flex items-center justify-between">
              <span class="text-sm text-text font-medium">Path</span>
              <button
                type="button"
                class="text-xs font-mono text-text-muted bg-bg-muted px-2 py-0.5 rounded max-w-48 truncate cursor-pointer hover:bg-bg-hover transition-colors"
                title="Click to copy path"
                onclick={async () => {
                  try {
                    await invoke("copy_to_clipboard", { text: cliStatus!.path! });
                    toast.success("Path copied to clipboard");
                  } catch {
                    toast.error("Failed to copy path");
                  }
                }}
              >
                {cliStatus.path}
              </button>
            </div>
          {/if}
          <div class="pt-3 border-t border-border border-dashed">
            {@render cliUsageHint()}
          </div>
        </div>
        <Button
          onclick={handleUninstallCli}
          disabled={cliOperating}
          variant="outline"
          size="md"
        >
          {#if cliOperating}
            <SpinnerIcon class="w-3.25 h-3.25 mr-2 animate-spin" />
            Uninstalling...
          {:else}
            Uninstall CLI Tool
          {/if}
        </Button>
      {:else}
        <div class="flex items-center gap-2.5 p-2.5 rounded-[10px] border border-border bg-bg-secondary mb-2.5">
          {@render cliUsageHint()}
        </div>
        <Button
          onclick={handleInstallCli}
          disabled={cliOperating}
          variant="outline"
          size="md"
        >
          {#if cliOperating}
            <SpinnerIcon class="w-3.25 h-3.25 mr-2 animate-spin" />
            Installing...
          {:else}
            Install CLI Tool
          {/if}
        </Button>
      {/if}
    </section>
  {/if}
</div>
