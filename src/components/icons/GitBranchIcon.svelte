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
      <path d="M5 18a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
      <path d="M5 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
      <path d="M15 6a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"></path>
      <path d="M7 8l0 8"></path>
      <path d="M9 18h6a2 2 0 0 0 2 -2v-5"></path>
      <path d="M14 14l3 -3l3 3"></path>
    </svg>
