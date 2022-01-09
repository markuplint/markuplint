<script>
	import MlPlayground from './ml-playground.svelte';

	const rulsJSON = require('@markuplint/ml-core/markuplint-recommended.json');
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
