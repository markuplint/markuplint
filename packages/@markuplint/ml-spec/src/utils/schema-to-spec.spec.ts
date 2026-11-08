// @ts-nocheck

import htmlSpec from '@markuplint/html-spec';
import { describe, test, expect } from 'vitest';

import { schemaToSpec } from './schema-to-spec.js';

describe('schemaToSpec', () => {
	test('specs', () => {
		const exAttr = {
			ref: 'N/A',
			type: 'Boolean',
			description: 'For the unit test.',
		};
		const exAttr2 = {
			ref: 'N/A',
			type: 'Boolean',
			description: 'For the unit test. Override.',
		};
		const mergedSpec = schemaToSpec([
			htmlSpec,
			{
				specs: [
					{
						name: 'a',
						attributes: { 'extended-attr': exAttr },
					},
				],
			},
			{
				specs: [
					{
						name: 'a',
						attributes: { 'extended-attr': exAttr2 },
					},
				],
			},
		]);
		const aElAttrs = mergedSpec.specs.find(el => el.name === 'a').attributes;
		expect(aElAttrs['extended-attr']).toStrictEqual(exAttr2);
	});

	test('directivePatterns', () => {
		const mergedSpec = schemaToSpec([
			htmlSpec,
			{
				directivePatterns: [{ pattern: '^x-data$', isDirective: true }],
			},
			{
				directivePatterns: [{ pattern: '^hx-on[:-]([a-z]+)$', potentialName: 'on$1', isDirective: true }],
			},
		]);
		expect(mergedSpec.directivePatterns).toHaveLength(2);
		expect(mergedSpec.directivePatterns[0].pattern).toBe('^x-data$');
		expect(mergedSpec.directivePatterns[1].pattern).toBe('^hx-on[:-]([a-z]+)$');
	});

	test('directivePatterns defaults to empty when not provided', () => {
		const mergedSpec = schemaToSpec([htmlSpec]);
		expect(mergedSpec.directivePatterns ?? []).toStrictEqual([]);
	});

	test('movedToHead', () => {
		const mergedSpec = schemaToSpec([
			htmlSpec,
			{ movedToHead: ['title'] },
			{ movedToHead: ['style[href][precedence]'] },
		]);
		expect(mergedSpec.movedToHead).toStrictEqual(['title', 'style[href][precedence]']);
	});

	test('movedToHead defaults to undefined', () => {
		expect(schemaToSpec([htmlSpec]).movedToHead).toBeUndefined();
		expect(schemaToSpec([htmlSpec, {}]).movedToHead).toBeUndefined();
	});

	test('acceptedAttrNames defaults to undefined', () => {
		const mergedSpec = schemaToSpec([htmlSpec]);
		expect(mergedSpec.acceptedAttrNames).toBeUndefined();
	});

	test('acceptedAttrNames can be set to idl', () => {
		const mergedSpec = schemaToSpec([htmlSpec, { acceptedAttrNames: 'idl' }]);
		expect(mergedSpec.acceptedAttrNames).toBe('idl');
	});

	test('acceptedAttrNames can be set to both', () => {
		const mergedSpec = schemaToSpec([htmlSpec, { acceptedAttrNames: 'both' }]);
		expect(mergedSpec.acceptedAttrNames).toBe('both');
	});

	test('acceptedAttrNames is overridden by later spec', () => {
		const mergedSpec = schemaToSpec([htmlSpec, { acceptedAttrNames: 'idl' }, { acceptedAttrNames: 'both' }]);
		expect(mergedSpec.acceptedAttrNames).toBe('both');
	});

	test('acceptedAttrNames is not overridden when omitted', () => {
		const mergedSpec = schemaToSpec([htmlSpec, { acceptedAttrNames: 'idl' }, { specs: [] }]);
		expect(mergedSpec.acceptedAttrNames).toBe('idl');
	});

	test('globalAttrs.extends', () => {
		const keyAttr = {
			type: 'NoEmptyAny',
			description: 'A special attribute for list rendering',
			condition: '[v-for]',
		};
		const mergedSpec = schemaToSpec([
			htmlSpec,
			{
				def: {
					'#globalAttrs': {
						'#extends': {
							key: keyAttr,
						},
					},
				},
			},
		]);
		const key = mergedSpec.def['#globalAttrs']['#HTMLGlobalAttrs']['key'];
		expect(key).toStrictEqual(keyAttr);
	});

	describe('literalValues', () => {
		test('is absent when no spec has it', () => {
			expect(schemaToSpec([htmlSpec, { specs: [] }]).literalValues).toBeUndefined();
		});

		test('is taken from a spec', () => {
			const mergedSpec = schemaToSpec([htmlSpec, { literalValues: { booleanAttrs: { '""': null } } }]);
			expect(mergedSpec.literalValues).toStrictEqual({ booleanAttrs: { '""': null } });
		});

		test('is merged by kind of attribute, and a later spec wins on a key', () => {
			const mergedSpec = schemaToSpec([
				htmlSpec,
				{
					literalValues: {
						booleanAttrs: { '""': null, '0': null },
						otherAttrs: { true: null },
					},
				},
				{
					literalValues: {
						booleanAttrs: { '""': '' },
						ariaAttrs: { true: '' },
					},
				},
			]);
			expect(mergedSpec.literalValues).toStrictEqual({
				booleanAttrs: { '""': '', '0': null },
				otherAttrs: { true: null },
				ariaAttrs: { true: '' },
			});
		});

		test('a null value is a value, not an omission', () => {
			const mergedSpec = schemaToSpec([
				htmlSpec,
				{ literalValues: { otherAttrs: { false: 'false' } } },
				{ literalValues: { otherAttrs: { false: null } } },
			]);
			expect(mergedSpec.literalValues?.otherAttrs).toStrictEqual({ false: null });
		});

		test('attrs is merged by attribute name and by key', () => {
			const mergedSpec = schemaToSpec([
				htmlSpec,
				{ literalValues: { attrs: { value: { true: 'true' }, download: { true: '' } } } },
				{ literalValues: { attrs: { value: { false: 'false', true: 'later' }, size: { '0': null } } } },
			]);
			expect(mergedSpec.literalValues?.attrs).toStrictEqual({
				value: { true: 'later', false: 'false' },
				download: { true: '' },
				size: { '0': null },
			});
		});

		test('customElements is merged by kind of attribute, by name and by key', () => {
			const mergedSpec = schemaToSpec([
				htmlSpec,
				{
					literalValues: {
						customElements: {
							booleanAttrs: { '0': '0' },
							attrs: { hidden: { true: '' } },
						},
					},
				},
				{
					literalValues: {
						customElements: {
							booleanAttrs: { '""': '' },
							attrs: { hidden: { false: 'false' }, popover: { true: '' } },
						},
					},
				},
			]);
			expect(mergedSpec.literalValues?.customElements).toStrictEqual({
				booleanAttrs: { '0': '0', '""': '' },
				attrs: { hidden: { true: '', false: 'false' }, popover: { true: '' } },
			});
		});

		test('the kinds, attrs and customElements are independent of one another', () => {
			const mergedSpec = schemaToSpec([
				htmlSpec,
				{ literalValues: { otherAttrs: { true: null }, attrs: { value: { true: 'true' } } } },
				{ literalValues: { customElements: { otherAttrs: { true: '' } } } },
			]);
			expect(mergedSpec.literalValues).toStrictEqual({
				otherAttrs: { true: null },
				attrs: { value: { true: 'true' } },
				customElements: { otherAttrs: { true: '' } },
			});
		});

		test('does not change the spec that it merges', () => {
			const first = { literalValues: { booleanAttrs: { '""': null } } };
			schemaToSpec([htmlSpec, first, { literalValues: { booleanAttrs: { '0': null } } }]);
			expect(first).toStrictEqual({ literalValues: { booleanAttrs: { '""': null } } });
		});
	});
});
