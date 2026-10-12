<script lang="ts">
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";
  import { notesState } from "../../context/notes.svelte";
  import { themeState } from "../../context/theme.svelte";
  import {
    getIcloudStatus,
    isPathInIcloud,
    ensureIcloudDefaultFolder,
    type IcloudStatus,
  } from "../../services/icloud";
  import { Button } from "../ui";
  import { CloudCheckIcon, CloudPlusIcon } from "../icons";

  let status = $state<IcloudStatus | null>(null);
  let isSynced = $state(false);
  let isSwitching = $state(false);

  onMount(() => {
    getIcloudStatus()
      .then((res) => {
        status = res;
      })
      .catch(() => {
        status = { available: false, containerPath: null, defaultFolderPath: null };
      });
  });

  $effect(() => {
    const folder = notesState.notesFolder;
    if (!folder) {
      isSynced = false;
      return;
    }
    isPathInIcloud(folder)
      .then((synced) => {
        isSynced = synced;
      })
      .catch(() => {
        isSynced = false;
      });
  });

  async function handleUseIcloud() {
    if (isSwitching) return;
    isSwitching = true;
    try {
      const folder = await ensureIcloudDefaultFolder();
      await notesState.setNotesFolder(folder);
      await themeState.reloadSettings();
      toast.success("Notes folder moved to iCloud Drive");
    } catch (err) {
      console.error("Failed to switch to iCloud Drive:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to switch to iCloud Drive"
      );
    } finally {
      isSwitching = false;
    }
  }
</script>

{#if isSynced}
  <div class="flex items-center gap-1.25 mt-2 text-sm text-green-600 dark:text-green-500 font-medium">
    <CloudCheckIcon class="w-4 h-4 stroke-[1.7]" />
    iCloud synced
  </div>
{:else if status?.available}
  <div class="flex items-center gap-2 mt-2">
    <span class="text-sm text-text-muted">Local only</span>
    <Button
      onclick={handleUseIcloud}
      disabled={isSwitching}
      variant="link"
      class="h-auto p-0 text-sm gap-1"
    >
      <CloudPlusIcon class="w-3.5 h-3.5 stroke-[1.7]" />
      {isSwitching ? "Switching..." : "Use iCloud Drive"}
    </Button>
  </div>
{/if}
