<script lang="ts">
	import MlPlayground from './ml-playground.svelte';
	import rulsJSON from 'json-loader!../.markuplintrc';

	const ruleset = JSON.stringify(rulsJSON);
</script>

<style>
	.container {
		width: 950px;
		height: 500px;
		margin: 0 0 2em;
	}
</style>

<div class="container">
	<MlPlayground {ruleset} />
</div>
