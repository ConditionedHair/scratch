import { AlertDialog as AlertDialogPrimitive } from "bits-ui";

export const AlertDialog = AlertDialogPrimitive.Root;
export const AlertDialogTrigger = AlertDialogPrimitive.Trigger;
export const AlertDialogPortal = AlertDialogPrimitive.Portal;

export { default as AlertDialogContent } from "./alert-dialog-content.svelte";
export { default as AlertDialogHeader } from "./alert-dialog-header.svelte";
export { default as AlertDialogFooter } from "./alert-dialog-footer.svelte";
export { default as AlertDialogTitle } from "./alert-dialog-title.svelte";
export { default as AlertDialogDescription } from "./alert-dialog-description.svelte";
export { default as AlertDialogAction } from "./alert-dialog-action.svelte";
export { default as AlertDialogCancel } from "./alert-dialog-cancel.svelte";
