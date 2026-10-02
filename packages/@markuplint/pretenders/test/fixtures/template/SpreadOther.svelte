<script>
	let { label } = $props();
	const extra = { id: 'a' };
</script>

<button aria-label={label} {...extra}><slot /></button>
