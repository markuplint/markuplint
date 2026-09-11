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
});
