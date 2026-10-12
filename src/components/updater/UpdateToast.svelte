<script lang="ts">
  import { toast } from "svelte-sonner";
  import type { Update } from "@tauri-apps/plugin-updater";

  interface Props {
    update: Update;
    toastId: string | number;
  }

  let { update, toastId }: Props = $props();

  let installing = $state(false);

  async function handleUpdate() {
    installing = true;
    try {
      await update.downloadAndInstall();
      toast.dismiss(toastId);
      toast.success("Update installed! Restart Scratch to apply.", {
        duration: Infinity,
        closeButton: true,
      });
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Update failed. Please try again later.");
      installing = false;
    }
  }
</script>

<div class="flex flex-col gap-1">
  <div class="font-medium text-sm">
    Update Available: v{update.version}
  </div>
  {#if update.body}
    <div class="text-xs text-text-muted line-clamp-3">
      {update.body}
    </div>
  {/if}
  <button
    onclick={handleUpdate}
    disabled={installing}
    class="self-start mt-1 text-xs font-medium px-3 py-1.5 rounded-md bg-text text-bg hover:opacity-90 disabled:opacity-50 transition-opacity cursor-pointer"
  >
    {installing ? "Installing..." : "Update Now"}
  </button>
</div>
