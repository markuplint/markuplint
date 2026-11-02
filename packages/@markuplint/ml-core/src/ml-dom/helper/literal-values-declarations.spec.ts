import type { LiteralValueDeclaration, LiteralValueTable, LiteralValues } from '@markuplint/ml-ast';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import htmlSpec from '@markuplint/html-spec';
import { schemaToSpec } from '@markuplint/ml-spec';
import { parseLiteralExpression } from '@markuplint/parser-utils';
import { describe, test, expect } from 'vitest';

import { getBooleanAttrNames } from './literal-values.js';

/**
 * What every declaration of `literalValues`, of a spec and of a parser, has to be for `@markuplint/ml-core` to
 * read it: the key of a table is the normal form of a literal, the name of an attribute is in lower case, and
 * what a key says is a string or `null`.
 */

const DECLARATIONS: readonly (readonly [string, () => Promise<LiteralValueDeclaration | undefined>])[] = [
	['react-spec', async () => (await import('@markuplint/react-spec')).default.literalValues],
	['vue-spec', async () => (await import('@markuplint/vue-spec')).default.literalValues],
	['svelte-spec', async () => (await import('@markuplint/svelte-spec')).default.literalValues],
	['alpine-spec', async () => (await import('@markuplint/alpine-spec')).default.literalValues],
	['astro-parser', async () => (await import('@markuplint/astro-parser')).parser.literalValues],
	['pug-parser', async () => (await import('@markuplint/pug-parser')).parser.literalValues],
];

function tablesOf(declaration: LiteralValueDeclaration): readonly (readonly [string, LiteralValues])[] {
	const tables: (readonly [string, LiteralValues])[] = [];
	const collect = (prefix: string, table: LiteralValueTable) => {
		const { attrs, ...kinds } = table;
		for (const [kind, values] of Object.entries(kinds)) {
			tables.push([`${prefix}${kind}`, values as LiteralValues]);
		}
		for (const [name, values] of Object.entries(attrs ?? {})) {
			tables.push([`${prefix}attrs.${name}`, values]);
		}
	};
	const { customElements, ...table } = declaration;
	collect('', table);
	if (customElements) {
		collect('customElements.', customElements);
	}
	return tables;
}

describe.each(DECLARATIONS)('%s', (_name, load) => {
	test('declares tables', async () => {
		const declaration = await load();
		expect(declaration).toBeDefined();
		expect(tablesOf(declaration!).length).toBeGreaterThan(0);
	});

	test('a key is the normal form of a literal', async () => {
		const declaration = (await load())!;
		for (const [where, table] of tablesOf(declaration)) {
			for (const key of Object.keys(table)) {
				const literal = parseLiteralExpression(key);
				expect(literal?.key, `${where}: ${key}`).toBe(key);
			}
		}
	});

	test('a value is a string or null', async () => {
		const declaration = (await load())!;
		for (const [where, table] of tablesOf(declaration)) {
			for (const [key, value] of Object.entries(table)) {
				expect(value === null || typeof value === 'string', `${where}: ${key}`).toBe(true);
			}
		}
	});

	test('the name of an attribute is in lower case', async () => {
		const declaration = (await load())!;
		const names = [
			...Object.keys(declaration.attrs ?? {}),
			...Object.keys(declaration.customElements?.attrs ?? {}),
		];
		for (const name of names) {
			expect(name, name).toBe(name.toLowerCase());
		}
	});

	test('a table is not empty', async () => {
		const declaration = (await load())!;
		for (const [where, table] of tablesOf(declaration)) {
			expect(Object.keys(table).length, where).toBeGreaterThan(0);
		}
	});
});

describe('a framework that has no list of its own says nothing about a kind that it renders by the default', () => {
	test('react does not declare ariaAttrs or dataAttrs, whose booleans are strings', async () => {
		const declaration = (await import('@markuplint/react-spec')).default.literalValues!;
		expect(declaration.ariaAttrs).toBeUndefined();
		expect(declaration.dataAttrs).toBeUndefined();
	});

	test('vue and svelte do not say how an attribute of a kind that follows the default is rendered', async () => {
		for (const load of [
			async () => (await import('@markuplint/vue-spec')).default.literalValues!,
			async () => (await import('@markuplint/svelte-spec')).default.literalValues!,
		]) {
			const declaration = await load();
			expect(declaration.otherAttrs).toBeUndefined();
			expect(declaration.ariaAttrs).toBeUndefined();
			expect(declaration.dataAttrs).toBeUndefined();
		}
	});
});

/**
 * A table of a framework says where the framework renders a boolean attribute differently from the spec
 * (`attrs` of a name that the spec types as `Boolean` and the framework does not render as one), so the
 * set of those names is what the tables were checked against. A failure here means that a spec has a
 * `Boolean` name that no table has been checked for: read the source of each framework that the
 * declaration cites, and add the name to the table where the framework renders it otherwise.
 */
describe('the names that the specs type as Boolean are the ones that the tables were checked against', () => {
	const HTML = [
		'allowfullscreen',
		'alpha',
		'async',
		'autofocus',
		'autoplay',
		'checked',
		'controls',
		'default',
		'defer',
		'disabled',
		'focusgroupstart',
		'formnovalidate',
		'headingreset',
		'inert',
		'ismap',
		'itemscope',
		'loop',
		'multiple',
		'muted',
		'nomodule',
		'novalidate',
		'open',
		'playsinline',
		'readonly',
		'required',
		'reversed',
		'selected',
		'shadowrootclonable',
		'shadowrootcustomelementregistry',
		'shadowrootdelegatesfocus',
		'shadowrootserializable',
		'switch',
	];

	/** The specs that are merged into the HTML spec, and the names that they type as `Boolean` besides the HTML ones. */
	const SPECS: readonly (readonly [string, () => Promise<readonly ExtendedSpec[]>, readonly string[]])[] = [
		['html-spec', () => Promise.resolve([]), []],
		[
			'react-spec',
			async () => [(await import('@markuplint/react-spec')).default],
			['defaultchecked', 'suppresscontenteditablewarning', 'suppresshydrationwarning'],
		],
		['vue-spec', async () => [(await import('@markuplint/vue-spec')).default], []],
		[
			'svelte-spec',
			async () => [(await import('@markuplint/svelte-spec')).default],
			['defaultchecked', 'indeterminate'],
		],
		['alpine-spec', async () => [(await import('@markuplint/alpine-spec')).default], ['x-cloak', 'x-ignore']],
	];

	test.each(SPECS)('%s', async (_name, load, added) => {
		const specs = schemaToSpec([htmlSpec as unknown as MLMLSpec, ...(await load())]);
		const names = [...getBooleanAttrNames(specs)].toSorted();
		expect(names).toStrictEqual([...HTML, ...added].toSorted());
	});
});
