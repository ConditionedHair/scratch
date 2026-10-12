<script lang="ts">
  interface Props {
    class?: string;
    className?: string;
    filled?: boolean;
    [key: string]: any;
  }
  let { class: klass = "w-4.5 h-4.5", className = klass, filled = false, ...restProps }: Props = $props();
  let finalClass = $derived(className || klass);
</script>

<svg class={finalClass}
     fill={filled ? "currentColor" : "none"}
     stroke="currentColor"
     viewBox="0 0 24 24"
     stroke-width="1.8"
     stroke-linecap="round"
     stroke-linejoin="round"
     {...restProps}>
  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
</svg>
