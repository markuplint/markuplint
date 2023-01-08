<script>
	import MlPlayground from './ml-playground.svelte';
	const version = require('markuplint/package.json').version;

	const ruleset = JSON.stringify({
		rules: {
			"attr-duplication": true,
			"attr-value-quotes": true,
			"case-sensitive-attr-name": true,
			"case-sensitive-tag-name": true,
			"character-reference": true,
			"class-naming": true,
			"deprecated-attr": true,
			"deprecated-element": true,
			"disallowed-element": true,
			"doctype": true,
			"end-tag": true,
			"id-duplication": true,
			"ineffective-attr": true,
			"invalid-attr": true,
			"label-has-control": true,
			"landmark-roles": true,
			"no-boolean-attr-value": true,
			"no-default-value": true,
			"no-empty-palpable-content": true,
			"no-hard-code-id": true,
			"no-refer-to-non-existent-id": true,
			"no-use-event-handler-attr": true,
			"permitted-contents": true,
			"require-accessible-name": true,
			"require-datetime": true,
			"required-attr": true,
			"required-element": true,
			"required-h1": true,
			"use-list": true,
			"wai-aria": true,
		}
	});
</script>

<style>
	.container {
		width: 950px;
		height: 500px;
		margin: 0 0 2em;
	}

	.credit {
		display: flex;
		justify-content: flex-end;
		font-size: 0.8em;
		opacity: 0.8;
	}

	.credit p {
		margin: 0;
		padding: 0;
	}
</style>

<div class="container">
	<MlPlayground {ruleset} />

	<div class="credit">
		<p>Version: {version}</p>
	</div>
</div>

