import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import htmlSpec from '@markuplint/html-spec';
import { schemaToSpec } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

/**
 * An attribute that gives an element attributes that the markup does not show is a spread:
 * `{...props}` of the syntax tree, and a directive that the spec says is one (`v-bind="obj"`).
 * The parsers and the specs of the frameworks are in their own packages.
 */

async function jsxParser() {
	return (await import('@markuplint/jsx-parser')).parser;
}

async function vueParser() {
	return (await import('@markuplint/vue-parser')).parser;
}

async function vueSpecs() {
	return schemaToSpec([
		htmlSpec as unknown as MLMLSpec,
		(await import('@markuplint/vue-spec')).default as ExtendedSpec,
	]);
}

describe('MLAttr#isSpread', () => {
	test('{...props} of JSX is a spread', async () => {
		const document = createTestDocument('<div {...props} id="a"></div>', { parser: await jsxParser() });
		const el = document.querySelector('div');
		expect([...(el?.attributes ?? [])].map(a => a.isSpread)).toStrictEqual([true, undefined]);
		expect(el?.hasSpreadAttr).toBe(true);
	});

	test('v-bind="obj" of Vue is a spread that keeps its name, and a binding with an argument is not', async () => {
		const document = createTestDocument('<template><div v-bind="props" :id="a" v-show="b"></div></template>', {
			parser: await vueParser(),
			specs: await vueSpecs(),
		});
		const el = document.querySelector('div');
		expect([...(el?.attributes ?? [])].map(a => ({ name: a.name, isSpread: a.isSpread }))).toStrictEqual([
			{ name: 'v-bind', isSpread: true },
			{ name: 'id', isSpread: undefined },
			{ name: 'v-show', isSpread: undefined },
		]);
		expect(el?.hasSpreadAttr).toBe(true);
	});

	test('an element of Vue without a binding of an object has no spread', async () => {
		const document = createTestDocument('<template><div :id="a" v-show="b"></div></template>', {
			parser: await vueParser(),
			specs: await vueSpecs(),
		});
		expect(document.querySelector('div')?.hasSpreadAttr).toBe(false);
	});

	test('v-bind="obj" is not a spread where the spec of Vue is not given', async () => {
		const document = createTestDocument('<template><div v-bind="props"></div></template>', {
			parser: await vueParser(),
		});
		expect(document.querySelector('div')?.hasSpreadAttr).toBe(false);
	});
});
