<script>
	export let label;
	export let size = 'm';
</script>

<button aria-label={label} data-size={size} {...$$restProps}><slot /></button>
