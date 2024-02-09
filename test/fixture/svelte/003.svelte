<!-- #1442 -->

<script>
	const type = 'c';
</script>

{#if type === 'a'}
	a
{:else if type === 'b'}
	b
{:else if type === 'c'}
	c
{:else if type === 'd'}
	d
{/if}