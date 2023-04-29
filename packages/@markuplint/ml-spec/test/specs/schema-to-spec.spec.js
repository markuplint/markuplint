// @ts-nocheck

import htmlSpec from '@markuplint/html-spec';

import { schemaToSpec } from './schema-to-spec';

describe('schemaToSpec', () => {
	test('specs', () => {
		const exAttr = {
			ref: 'N/A',
			type: 'Boolean',
			description: 'For the unit test.',
		} as const;
		const exAttr2 = {
			ref: 'N/A',
			type: 'Boolean',
			description: 'For the unit test. Override.',
		} as const;
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
		const aElAttrs = mergedSpec.specs.find(el => el.name === 'a')!.attributes;
		expect(aElAttrs['extended-attr']).toStrictEqual(exAttr2);
	});

	test('globalAttrs.extends', () => {
		const keyAttr = {
			type: 'NoEmptyAny',
			description: 'A special attribute for list rendering',
			condition: '[v-for]',
		} as const;
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
