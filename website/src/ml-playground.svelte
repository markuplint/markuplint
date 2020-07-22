<script lang="ts">
	import { onMount } from 'svelte';
	import playground from './playground';

	let el: HTMLDivElement;
	let isLoaded = false;

	onMount(() => playground(el).then(() => (isLoaded = true)));
</script>

<style>
	.container {
		width: 950px;
		height: 500px;
		margin: 0 0 2em;
		background: #000;
	}

	.app {
		width: 100%;
		height: 100%;
		position: relative;
	}

	.loading {
		color: #fff;
		width: 100%;
		height: 100%;
		display: flex;
		justify-content: center;
		align-items: center;
	}
</style>

<div class="container">
	{#if !isLoaded}
		<div class="loading">Playground is booting...</div>
	{/if}
	<div class="app" bind:this={el} />
</div>
