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
      <path d="M11 5l6 0"></path>
      <path d="M7 19l6 0"></path>
      <path d="M14 5l-4 14"></path>
    </svg>
