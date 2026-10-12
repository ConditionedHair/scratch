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
      <path d="M2 6m0 2a2 2 0 0 1 2 -2h16a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2z"></path>
      <path d="M6 10l0 .01"></path>
      <path d="M10 10l0 .01"></path>
      <path d="M14 10l0 .01"></path>
      <path d="M18 10l0 .01"></path>
      <path d="M6 14l0 .01"></path>
      <path d="M18 14l0 .01"></path>
      <path d="M10 14l4 0"></path>
    </svg>
