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
      <path d="M14 4a1 1 0 0 1 1-1"></path>
      <path d="M15 10a1 1 0 0 1-1-1"></path>
      <path d="M21 4a1 1 0 0 0-1-1"></path>
      <path d="M21 9a1 1 0 0 1-1 1"></path>
      <path d="m3 7 3 3 3-3"></path>
      <path d="M6 10V5a2 2 0 0 1 2-2h2"></path>
      <rect x="3" y="14" width="7" height="7" rx="1"></rect>
    </svg>
