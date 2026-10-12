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
      <rect x="3" y="3" width="6" height="6" rx="1"></rect>
      <rect x="15" y="15" width="6" height="6" rx="1"></rect>
      <path d="M6 9v3a3 3 0 0 0 3 3h3"></path>
      <path d="M15 15l-3 0"></path>
    </svg>
