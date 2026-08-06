import { invoke } from "@tauri-apps/api/core";

export interface IcloudStatus {
  available: boolean;
  containerPath: string | null;
  defaultFolderPath: string | null;
}

/** Detect whether iCloud Drive is available and resolve its container path. macOS only. */
export async function getIcloudStatus(): Promise<IcloudStatus> {
  return invoke("icloud_get_status");
}

/** Whether the given folder path lives inside the iCloud Drive container. */
export async function isPathInIcloud(path: string): Promise<boolean> {
  return invoke("icloud_is_path_inside", { path });
}

/** Create (if needed) and return the default `Scratch` folder inside iCloud Drive. */
export async function ensureIcloudDefaultFolder(): Promise<string> {
  return invoke("icloud_ensure_default_folder");
}
