<script lang="ts">
  interface Props {
    class?: string;
    className?: string;
    [key: string]: any;
  }
  let { class: klass = "w-4 h-4", className = klass, ...restProps }: Props = $props();
  let finalClass = $derived(className || klass);
</script>

<svg class={finalClass}
     fill="none"
     stroke="currentColor"
     viewBox="0 0 24 24"
     stroke-width="1.8"
     stroke-linecap="round"
     stroke-linejoin="round"
     {...restProps}>
  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
  <circle cx="12" cy="10" r="3"></circle>
</svg>
