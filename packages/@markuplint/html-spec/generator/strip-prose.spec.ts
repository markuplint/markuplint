import type { ExtendedSpec } from '@markuplint/ml-spec';

import { describe, test, expect } from 'vitest';

import { stripProse } from './strip-prose.ts';

const role = (name: string) => ({ name, description: `The ${name} role.`, isAbstract: false });

function spec(extraAttributes: Record<string, object> = {}): ExtendedSpec {
	return {
		cites: ['https://html.spec.whatwg.org/multipage/'],
		def: {
			'#globalAttrs': { '#HTMLGlobalAttrs': { id: { type: 'Any', description: 'The unique identifier.' } } },
			'#aria': {
				'1.3': {
					roles: [role('button')],
					graphicsRoles: [role('graphics-symbol')],
					dpubRoles: [role('doc-abstract')],
					props: [
						{
							name: 'aria-checked',
							type: 'state',
							enum: ['true', 'false'],
							valueDescriptions: { true: 'Checked.', false: 'Not checked.' },
						},
						{ name: 'aria-label', type: 'property', enum: [] },
					],
				},
			},
			'#contentModels': { '#flow': ['div'] },
		},
		specs: [
			{
				name: 'a',
				cite: 'https://html.spec.whatwg.org/multipage/text-level-semantics.html#the-a-element',
				description: 'The a element.',
				attributes: {
					href: { type: 'URL', description: 'The URL that the hyperlink points to.', deprecated: false },
					// An attribute can be called "description": it is data, not prose.
					description: { type: 'Any' },
					...extraAttributes,
				},
			},
		],
	} as unknown as ExtendedSpec;
}

function deepFreeze<T>(value: T): T {
	if (value && typeof value === 'object') {
		for (const child of Object.values(value)) {
			deepFreeze(child);
		}
		Object.freeze(value);
	}
	return value;
}

describe('stripProse', () => {
	test('drops the description of an element', () => {
		const stripped = stripProse(spec());
		expect(stripped.specs?.[0]).not.toHaveProperty('description');
	});

	test('drops the description of an attribute and keeps the rest of it', () => {
		const attributes = stripProse(spec()).specs?.[0]?.attributes;
		expect(attributes?.href).toStrictEqual({ type: 'URL', deprecated: false });
	});

	test('keeps an attribute that is itself called "description"', () => {
		const attributes = stripProse(spec()).specs?.[0]?.attributes;
		expect(attributes?.description).toStrictEqual({ type: 'Any' });
	});

	test('keeps an attribute that had nothing but a description, as an empty entry', () => {
		// Its presence is what makes the attribute known: `getAttrSpecs` gives it the type `Any`.
		const attributes = stripProse(spec({ download: { description: 'Only MDN knows it.' } })).specs?.[0]?.attributes;
		expect(attributes).toHaveProperty('download');
		expect(attributes?.download).toStrictEqual({});
	});

	test('drops the description of a global attribute and keeps the rest of it', () => {
		const globalAttrs = stripProse(spec()).def?.['#globalAttrs'];
		expect(globalAttrs).toStrictEqual({ '#HTMLGlobalAttrs': { id: { type: 'Any' } } });
	});

	test.each(['roles', 'graphicsRoles', 'dpubRoles'] as const)('drops the description of an ARIA role in %s', key => {
		const aria = stripProse(spec()).def?.['#aria']?.['1.3'];
		expect(aria?.[key]?.map(r => Object.keys(r).toSorted())).toStrictEqual([['isAbstract', 'name']]);
	});

	test('drops the valueDescriptions of an ARIA property and keeps the rest of it', () => {
		const props = stripProse(spec()).def?.['#aria']?.['1.3']?.props;
		expect(props?.[0]).toStrictEqual({ name: 'aria-checked', type: 'state', enum: ['true', 'false'] });
	});

	test('keeps what is not prose', () => {
		const original = spec();
		const stripped = stripProse(original);
		expect(stripped.cites).toStrictEqual(original.cites);
		expect(stripped.def?.['#contentModels']).toStrictEqual(original.def?.['#contentModels']);
		expect(stripped.def?.['#aria']?.['1.3']?.props?.[1]).toStrictEqual({
			name: 'aria-label',
			type: 'property',
			enum: [],
		});
	});

	test('does not change its input: the generator checks the scraped text before it drops it', () => {
		const original = deepFreeze(spec());
		expect(() => stripProse(original)).not.toThrow();
		expect(original).toStrictEqual(spec());
	});

	test('shares what it does not touch with its input', () => {
		const original = spec();
		const stripped = stripProse(original);
		expect(stripped.cites).toBe(original.cites);
		expect(stripped.def?.['#contentModels']).toBe(original.def?.['#contentModels']);
	});

	test.each([
		['an empty spec', {}],
		['a spec with only the references', { cites: ['https://example.com/'] }],
		['a spec with no element specs', { def: { '#contentModels': { '#flow': ['div'] } } }],
		['a spec with no definitions', { specs: [{ name: 'my-element' }] }],
		['an ARIA version with none of the lists', { def: { '#aria': { '1.3': {} } } }],
		[
			'the attributes that an extension adds to the global ones',
			{ def: { '#globalAttrs': { '#extends': { 'my-attr': { type: 'Any', description: 'Mine.' } } } } },
		],
	] as const)('takes %s', (_name, input) => {
		const stripped = JSON.stringify(stripProse(input as unknown as ExtendedSpec));
		expect(stripped).not.toContain('description');
		expect(stripped).toBe(JSON.stringify(input).replaceAll(/,?"description":"[^"]*"/g, ''));
	});

	test('keeps the key order of what is left', () => {
		const stripped = stripProse(spec());
		expect(Object.keys(stripped.specs?.[0]?.attributes?.href ?? {})).toStrictEqual(['type', 'deprecated']);
		expect(Object.keys(stripped.specs?.[0] ?? {})).toStrictEqual(['name', 'cite', 'attributes']);
		expect(Object.keys(stripped.def?.['#aria']?.['1.3'] ?? {})).toStrictEqual([
			'roles',
			'graphicsRoles',
			'dpubRoles',
			'props',
		]);
	});
});
