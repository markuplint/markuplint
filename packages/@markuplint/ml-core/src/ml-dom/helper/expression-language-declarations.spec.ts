import type { ExtendedSpec } from '@markuplint/ml-spec';

import { compileDirectivePatterns, resolveDirective } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

/**
 * Which attributes have the value read as a literal (`expressionLanguage` of the pattern of a directive, or
 * `attrExpressionLanguage` of the parser). It is the attribute that is bound under its own name, whose value
 * is what the attribute becomes; not a directive, a binding to a target, a condition, or an attribute whose
 * name a modifier changes.
 */

async function resolutionOf(specLoader: () => Promise<ExtendedSpec>, name: string) {
	const spec = await specLoader();
	return resolveDirective(name, compileDirectivePatterns(spec.directivePatterns ?? []));
}

async function languageOf(specLoader: () => Promise<ExtendedSpec>, name: string) {
	return (await resolutionOf(specLoader, name))?.expressionLanguage;
}

const vue = async () => (await import('@markuplint/vue-spec')).default;
const alpine = async () => (await import('@markuplint/alpine-spec')).default;
const svelte = async () => (await import('@markuplint/svelte-spec')).default;

describe('vue-spec', () => {
	test.each([[':title'], ['v-bind:title'], [':aria-label'], [':xlink:href']])('%s is JavaScript', async name => {
		expect(await languageOf(vue, name)).toBe('javascript');
	});

	test.each([
		// A modifier changes the name or sets the property
		[':title.prop'],
		[':title.camel'],
		[':title.attr'],
		['.title'],
		// A dynamic name, and the object syntax
		[':[name]'],
		['v-bind'],
		// Directives
		['v-model'],
		['v-model.lazy'],
		['v-if'],
		['v-show'],
		['v-html'],
		['v-slot:name'],
		['#name'],
		['@click'],
		['v-on:click'],
	])('%s is not read', async name => {
		expect(await languageOf(vue, name)).toBeUndefined();
	});
});

describe('alpine-spec', () => {
	test.each([[':title'], ['x-bind:title'], [':aria-label']])('%s is JavaScript', async name => {
		expect(await languageOf(alpine, name)).toBe('javascript');
	});

	test.each([
		[':title.camel'],
		['x-bind:title.camel'],
		['x-data'],
		['x-show'],
		['x-model'],
		['x-model.lazy'],
		['@click'],
		['x-on:click'],
		['x-transition'],
		['x-ignore'],
	])('%s is not read', async name => {
		expect(await languageOf(alpine, name)).toBeUndefined();
	});

	test('a name with a modifier is the attribute of the same name', async () => {
		expect(await resolutionOf(alpine, ':title.camel')).toMatchObject({
			potentialName: 'title',
			isDynamicValue: true,
			valueType: 'code',
		});
		expect(await resolutionOf(alpine, ':class.camel')).toMatchObject({
			potentialName: 'class',
			isDuplicatable: true,
		});
		expect(await resolutionOf(alpine, ':title')).toMatchObject({
			potentialName: 'title',
			isDynamicValue: true,
			valueType: 'code',
			expressionLanguage: 'javascript',
		});
	});
});

describe('svelte-spec', () => {
	// Its `{…}` is read by the parser, which says that the language is JavaScript; the directives are not the attribute
	test.each([
		['class:active'],
		['style:color'],
		['bind:value'],
		['bind:group'],
		['on:click'],
		['use:action'],
		['transition:fade'],
	])('%s is not read', async name => {
		expect(await languageOf(svelte, name)).toBeUndefined();
	});
});

describe('the parsers say the language of the code in an attribute value', () => {
	test.each([
		['jsx-parser', async () => (await import('@markuplint/jsx-parser')).parser, 'javascript'],
		['mdx-parser', async () => (await import('@markuplint/mdx-parser')).parser, 'javascript'],
		['svelte-parser', async () => (await import('@markuplint/svelte-parser')).parser, 'javascript'],
		['astro-parser', async () => (await import('@markuplint/astro-parser')).parser, 'javascript'],
		['pug-parser', async () => (await import('@markuplint/pug-parser')).parser, 'javascript'],
		// Vue says it by the pattern of the directive, as Alpine does, and the other languages do not say it
		['vue-parser', async () => (await import('@markuplint/vue-parser')).parser, undefined],
		['html-parser', async () => (await import('@markuplint/html-parser')).parser, undefined],
		['ejs-parser', async () => (await import('@markuplint/ejs-parser')).parser, undefined],
		['php-parser', async () => (await import('@markuplint/php-parser')).parser, undefined],
		['liquid-parser', async () => (await import('@markuplint/liquid-parser')).parser, undefined],
	])('%s', async (_name, load, expected) => {
		expect((await load()).attrExpressionLanguage).toBe(expected);
	});

	test.each([
		['astro-parser', async () => (await import('@markuplint/astro-parser')).parser, { '""': null }],
		['pug-parser', async () => (await import('@markuplint/pug-parser')).parser, { '""': '', '0': '0' }],
	])('%s says how the framework renders, in the same form as a spec', async (_name, load, booleanAttrs) => {
		expect((await load()).literalValues?.booleanAttrs).toStrictEqual(booleanAttrs);
	});

	test('the shorthand of a boolean is for the languages of JSX', async () => {
		expect((await import('@markuplint/jsx-parser')).parser.booleanish).toBe(true);
		expect((await import('@markuplint/mdx-parser')).parser.booleanish).toBe(true);
		expect((await import('@markuplint/html-parser')).parser.booleanish).toBeFalsy();
	});
});
