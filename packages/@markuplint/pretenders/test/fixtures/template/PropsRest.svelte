<script>
	let { label, size = 'm', ...rest } = $props();
</script>

<button aria-label={label} data-size={size} {...rest}><slot /></button>
