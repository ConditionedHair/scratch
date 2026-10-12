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
    CalendarIcon,
    MailIcon,
    RefreshCwIcon,
  } from "../icons";
  import { calendarState } from "../../context/calendar.svelte";
  import { mailState } from "../../context/mail.svelte";
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

  let showAdvancedCalendar = $state(true);
  let customClientId = $state("");
  let customClientSecret = $state("");

  $effect(() => {
    if (customClientId) {
      localStorage.setItem("scratch_gcal_client_id", customClientId);
    }
  });

  $effect(() => {
    if (customClientSecret) {
      localStorage.setItem("scratch_gcal_client_secret", customClientSecret);
    }
  });

  async function handleStartAuth() {
    if (!customClientSecret.trim()) {
      showAdvancedCalendar = true;
      toast.error(
        "Please enter your Google OAuth Client Secret (starts with GOCSPX-...) before connecting."
      );
      return;
    }
    if (customClientId) localStorage.setItem("scratch_gcal_client_id", customClientId);
    if (customClientSecret) localStorage.setItem("scratch_gcal_client_secret", customClientSecret);
    try {
      await calendarState.startAuth(customClientId, customClientSecret);
      await mailState.startAuth(customClientId, customClientSecret);
    } catch {
      // toast is handled in services
    }
  }

  async function handleStartMailAuth() {
    if (!customClientSecret.trim()) {
      showAdvancedCalendar = true;
      toast.error(
        "Please enter your Google OAuth Client Secret (starts with GOCSPX-...) before connecting."
      );
      return;
    }
    if (customClientId) localStorage.setItem("scratch_gcal_client_id", customClientId);
    if (customClientSecret) localStorage.setItem("scratch_gcal_client_secret", customClientSecret);
    try {
      await mailState.startAuth(customClientId, customClientSecret);
    } catch {
      // toast is handled in services
    }
  }

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
    const savedClientId = localStorage.getItem("scratch_gcal_client_id");
    const savedClientSecret = localStorage.getItem("scratch_gcal_client_secret");
    if (savedClientId) {
      customClientId = savedClientId;
    } else {
      customClientId = "688447609926-eofijjrca2qvbt7e936ccu6d8c4fdrmh.apps.googleusercontent.com";
    }
    if (savedClientSecret) {
      customClientSecret = savedClientSecret;
    }

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
  <!-- Google Calendar Integration -->
  <section class="pb-2">
    <div class="flex items-center justify-between mb-0.5">
      <h2 class="text-xl font-medium">Google Calendar</h2>
      {#if calendarState.connected}
        <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]"></span>
          Connected
        </span>
      {/if}
    </div>
    <p class="text-sm text-text-muted mb-4">
      Two-way calendar sync, meeting schedules, and full-screen Braun calendar view.
    </p>

    {#if calendarState.connected}
      <div class="rounded-[10px] border border-border p-4 space-y-4 bg-bg-secondary/40 mb-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <CalendarIcon class="w-5 h-5 stroke-[1.8] text-accent" />
            <div>
              <span class="text-sm font-semibold text-text block">
                {calendarState.userEmail || "Google Account"}
              </span>
              {#if calendarState.lastSynced}
                <span class="text-[11px] text-text-muted font-mono block">
                  Last synced: {new Date(calendarState.lastSynced * 1000).toLocaleTimeString()}
                </span>
              {/if}
            </div>
          </div>

          <div class="flex items-center gap-2">
            <button
              type="button"
              onclick={() => calendarState.refresh()}
              disabled={calendarState.isSyncing}
              class="px-2.5 py-1.5 rounded-lg border border-border bg-bg hover:bg-bg-emphasis text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-text shadow-2xs"
            >
              <RefreshCwIcon class={`w-3.5 h-3.5 stroke-[1.8] ${calendarState.isSyncing ? "animate-spin text-accent" : ""}`} />
              <span>{calendarState.isSyncing ? "Syncing..." : "Sync Now"}</span>
            </button>

            <button
              type="button"
              onclick={() => calendarState.disconnect()}
              class="px-2.5 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 text-xs font-medium text-red-500 transition-colors cursor-pointer"
            >
              Disconnect
            </button>
          </div>
        </div>

        <!-- Detected Calendars List -->
        {#if calendarState.calendars.length > 0}
          <div class="pt-3 border-t border-border/60">
            <span class="block text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2">
              Synced Calendars ({calendarState.calendars.length})
            </span>
            <div class="space-y-1.5">
              {#each calendarState.calendars as cal (cal.id)}
                <label class="flex items-center justify-between p-2 rounded-lg hover:bg-bg-emphasis/60 border border-transparent hover:border-border/60 transition-colors cursor-pointer text-xs">
                  <div class="flex items-center gap-2.5 min-w-0">
                    <span
                      class="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs"
                      style:background-color={cal.bgColor || "#eab308"}
                    ></span>
                    <span class="font-medium text-text truncate">
                      {cal.summary} {cal.primary ? "(Primary)" : ""}
                    </span>
                  </div>

                  <input
                    type="checkbox"
                    checked={cal.selected}
                    onchange={(e) => calendarState.toggleVisibility(cal.id, (e.target as HTMLInputElement).checked)}
                    class="rounded border-border accent-accent cursor-pointer"
                  />
                </label>
              {/each}
            </div>
          </div>
        {/if}
      </div>

      <!-- Gmail Integration (when Calendar is connected) -->
      <div class="rounded-[10px] border border-border p-4 space-y-4 bg-bg-secondary/40 mb-3">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <MailIcon class="w-5 h-5 stroke-[1.8] text-accent" />
            <div>
              <span class="text-sm font-semibold text-text block">
                Gmail ({mailState.connected ? mailState.userEmail || "Connected" : "Not connected"})
              </span>
              {#if mailState.connected}
                <span class="text-[11px] text-text-muted font-mono block">
                  {mailState.unreadCount} unread • Last synced: {mailState.lastSynced ? new Date(mailState.lastSynced * 1000).toLocaleTimeString() : "Never"}
                </span>
              {/if}
            </div>
          </div>

          <div class="flex items-center gap-2">
            {#if mailState.connected}
              <button
                type="button"
                onclick={() => mailState.refresh()}
                disabled={mailState.isSyncing}
                class="px-2.5 py-1.5 rounded-lg border border-border bg-bg hover:bg-bg-emphasis text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer text-text shadow-2xs"
              >
                <RefreshCwIcon class={`w-3.5 h-3.5 stroke-[1.8] ${mailState.isSyncing ? "animate-spin text-accent" : ""}`} />
                <span>{mailState.isSyncing ? "Syncing..." : "Sync Mail"}</span>
              </button>

              <button
                type="button"
                onclick={() => mailState.disconnect()}
                class="px-2.5 py-1.5 rounded-lg border border-red-500/30 hover:bg-red-500/10 text-xs font-medium text-red-500 transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            {:else}
              <Button
                onclick={handleStartMailAuth}
                disabled={mailState.isAuthenticating}
                variant="default"
                size="sm"
                class="font-bold bg-accent text-slate-950 hover:brightness-105"
              >
                {#if mailState.isAuthenticating}
                  <SpinnerIcon class="w-3.5 h-3.5 mr-2 animate-spin" />
                  Connecting...
                {:else}
                  Connect Gmail
                {/if}
              </Button>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <div class="rounded-[10px] border border-border p-4 space-y-4 bg-bg-secondary/40 mb-3">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center shrink-0">
              <CalendarIcon class="w-5 h-5 stroke-[2] text-accent" />
            </div>
            <div>
              <h3 class="text-sm font-semibold text-text">Connect your Google Account</h3>
              <p class="text-xs text-text-muted leading-relaxed mt-0.5">
                Sign in with Google to view upcoming events in the tag bar, join Meet links with one click, and manage schedules in full screen.
              </p>
            </div>
          </div>

          <Button
            onclick={handleStartAuth}
            disabled={calendarState.isAuthenticating}
            variant="default"
            size="md"
            class="shrink-0 font-bold bg-accent text-slate-950 hover:brightness-105"
          >
            {#if calendarState.isAuthenticating}
              <SpinnerIcon class="w-3.5 h-3.5 mr-2 animate-spin" />
              Connecting...
            {:else}
              Sign in with Google
            {/if}
          </Button>
        </div>

        <!-- OAuth Credentials Configuration -->
        <div class="pt-3 border-t border-border/60">
          <div class="flex items-center justify-between">
            <span class="text-xs font-semibold text-text">OAuth 2.0 Credentials</span>
            <button
              type="button"
              onclick={() => { showAdvancedCalendar = !showAdvancedCalendar; }}
              class="text-[11px] font-medium text-text-muted hover:text-text cursor-pointer transition-colors"
            >
              {showAdvancedCalendar ? "Hide Configuration" : "Edit Credentials"}
            </button>
          </div>

          {#if showAdvancedCalendar}
            <div class="mt-2.5 space-y-3 p-3.5 rounded-lg bg-bg border border-border text-xs">
              <p class="text-[11px] text-text-muted leading-relaxed">
                Scratch connects directly to Google Calendar from your desktop. Google OAuth requires both the <strong>Client ID</strong> and the matching <strong>Client Secret</strong> (starts with <code class="text-accent font-mono">GOCSPX-</code>) to verify Desktop clients.
              </p>

              <div>
                <label for="custom-client-id" class="block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1">
                  OAuth Client ID (Type: Desktop)
                </label>
                <input
                  id="custom-client-id"
                  type="text"
                  bind:value={customClientId}
                  placeholder="e.g. 688447609926-xxxx.apps.googleusercontent.com"
                  class="w-full px-2.5 py-1.5 rounded-lg bg-bg-secondary border border-border font-mono text-xs focus:border-accent focus:outline-none text-text"
                />
              </div>

              <div>
                <div class="flex items-center justify-between mb-1">
                  <label for="custom-client-secret" class="block text-[10px] font-bold uppercase tracking-wider text-text-muted">
                    OAuth Client Secret <span class="text-accent font-normal">(Required by Google Cloud)</span>
                  </label>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    class="text-[10px] text-accent hover:underline flex items-center gap-1"
                  >
                    Google Cloud Console &rarr;
                  </a>
                </div>
                <input
                  id="custom-client-secret"
                  type="password"
                  bind:value={customClientSecret}
                  placeholder="Paste your Client Secret (starts with GOCSPX-...)"
                  class="w-full px-2.5 py-1.5 rounded-lg bg-bg-secondary border border-border font-mono text-xs focus:border-accent focus:outline-none text-text"
                />
                <span class="block text-[10px] text-text-muted mt-1 leading-normal">
                  In Google Cloud Console, navigate to <strong>APIs &amp; Services &rarr; Credentials</strong>, click on your OAuth 2.0 Client ID, and copy the <strong>Client secret</strong>.
                </span>
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </section>

  <div class="border-t border-border border-dashed"></div>

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
