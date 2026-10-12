import { toast } from "svelte-sonner";
import { check as checkForUpdate } from "@tauri-apps/plugin-updater";
import UpdateToast from "../components/updater/UpdateToast.svelte";

// Shared update check — used by startup and manual "Check for Updates"
export async function showUpdateToast(): Promise<"update" | "no-update" | "error"> {
  try {
    const update = await checkForUpdate();
    if (update) {
      toast.custom(UpdateToast, {
        id: "update-toast",
        duration: Infinity,
        closeButton: true,
        componentProps: {
          update,
          toastId: "update-toast",
        },
      });
      return "update";
    }
    return "no-update";
  } catch (err) {
    // Network errors and 404s (no release published yet) are not real failures
    const msg = String(err);
    if (
      msg.includes("404") ||
      msg.includes("network") ||
      msg.includes("Could not fetch")
    ) {
      return "no-update";
    }
    console.error("Update check failed:", err);
    return "error";
  }
}
