import htmlSpec from '@markuplint/html-spec';

import { getSpec } from './get-spec';

describe('getSpec', () => {
	test('Overriding', () => {
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
		const mergedSpec = getSpec([
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
});
