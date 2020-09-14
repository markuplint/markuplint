<script lang="ts">
	import { onMount } from 'svelte';
	import Playground from './playground';

	export let ruleset: string;

	let el: HTMLDivElement;
	let playground: Playground | null = null;
	let isLoaded = false;

	$: playground && playground.changeRuleset(ruleset);

	onMount(() => {
		playground = new Playground(el, ruleset);
		isLoaded = true;
	});
</script>

<style>
	.app {
		width: 100%;
		height: 100%;
		position: relative;
		background: #000;
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

{#if !isLoaded}
	<div class="loading">Playground is booting...</div>
{/if}
<div class="app" bind:this={el} />
