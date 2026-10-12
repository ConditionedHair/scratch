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
      <path d="M7 4h-4v16h4"></path>
      <path d="M17 4h4v16h-4"></path>
      <path d="M8 16h.01"></path>
      <path d="M12 16h.01"></path>
      <path d="M16 16h.01"></path>
    </svg>
