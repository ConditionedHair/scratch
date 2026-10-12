<script lang="ts">
  interface Props {
    class?: string;
    className?: string;
    [key: string]: any;
  }
  let { class: klass = "w-4.5 h-4.5", className = klass, ...restProps }: Props = $props();
  let finalClass = $derived(className || klass);
</script>

<svg class={finalClass}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
     {...restProps}>
      <path stroke="none" d="M0 0h24v24H0z" fill="none"></path>
      <path d="M12 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
      <path d="M4 6l8 0"></path>
      <path d="M16 6l4 0"></path>
      <path d="M6 12a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
      <path d="M4 12l2 0"></path>
      <path d="M10 12l10 0"></path>
      <path d="M15 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
      <path d="M4 18l11 0"></path>
      <path d="M19 18l1 0"></path>
    </svg>
