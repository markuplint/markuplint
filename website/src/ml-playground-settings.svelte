<script lang="ts">
	import { onMount } from 'svelte';
	import MlPlayground from './ml-playground.svelte';
	import rulsJSON from 'json-loader!../.markuplintrc';
	import getConfigSchema, { JSONSchema } from './config-schema';

	let ruleSchema: JSONSchema[] | null = null;
	let ruleset = JSON.stringify(rulsJSON);
	let checked = false;

	function onChange(event) {
		ruleset = JSON.stringify({
			rules: { ...rulsJSON.rules, 'permitted-contents': checked },
		});
	}

	onMount(async () => {
		const configSchema = await getConfigSchema();
		ruleSchema = Object.keys(configSchema.properties.rules.properties).map(ruleName => ({
			title: ruleName,
			...configSchema.properties.rules.properties[ruleName],
		}));
		console.log(ruleSchema);
	});
</script>

<style>
	.container {
		height: 500px;
		margin: 0 0 2em;
		display: flex;
		justify-content: flex-start;
		align-items: stretch;
	}

	.html {
		flex: 0 0 40%;
	}

	form {
		flex: 1 0 auto;
	}
</style>

<div class="container">
	<div class="html">
		<MlPlayground {ruleset} />
	</div>
	<form novalidate on:change={onChange}>
		{#if ruleSchema}
			{#each ruleSchema as rule}
				<fieldset>
					<legend>{rule.title}</legend>
					{#if rule.definitions.value.type === 'boolean'}
						<label>
							<input type="checkbox" bind:checked />
							<span>Enabled</span>
						</label>
					{:else if rule.definitions.value.type === 'string'}
						{#if rule.definitions.value.enum}
							{#each rule.definitions.value.enum as option}
								<label>
									<input type="radio" bind:group={rule._value} value={option} />
									<span>{option}</span>
								</label>
							{/each}
						{/if}
					{:else if rule.definitions.value.oneOf}
						{#if rule.definitions.value.oneOf.length === 2 && rule.definitions.value.oneOf[0].type === 'string' && rule.definitions.value.oneOf[1].type === 'array'}
							<textarea>&nbsp;</textarea>
						{/if}
						{#if rule.definitions.value.oneOf[0].enum}
							{#if rule.definitions.value.oneOf[0].enum.length === 1}
								<label>
									<input type="checkbox" />
									<span>{rule.definitions.value.oneOf[0].enum[0]}</span>
								</label>
							{:else}
								{#each rule.definitions.value.oneOf[0].enum as option}
									<label>
										<input
											type="radio"
											bind:group={rule.definitions.value.oneOf[0]._value}
											value={option} />
										<span>{option}</span>
									</label>
								{/each}
							{/if}
							{#if rule.definitions.value.oneOf[1].type === 'integer'}
								<label>
									<span>Or unsigned number</span>
									<input
										type="number"
										min={rule.definitions.value.oneOf[1].minimum === null ? false : rule.definitions.value.oneOf[1].minimum}
										step="1" />
								</label>
							{/if}
						{/if}
					{/if}

				</fieldset>
			{/each}
		{/if}
	</form>
</div>
