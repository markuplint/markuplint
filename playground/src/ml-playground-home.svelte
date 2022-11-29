<script>
	import MlPlayground from './ml-playground.svelte';

	const rulesJSON = require('@markuplint/ml-core/markuplint-recommended.json');
	const ruleset = JSON.stringify(rulesJSON);
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
