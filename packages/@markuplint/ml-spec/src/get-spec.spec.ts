import htmlSpec, { Attribute } from '@markuplint/html-spec';
import { getSpec } from './get-spec';

describe('getSpec', () => {
	test('', () => {
		const exAttr: Attribute = {
			name: 'extended-attr',
			type: 'Boolean',
			description: 'For the unit test.',
		};
		const exAttr2: Attribute = {
			name: 'extended-attr',
			type: 'Boolean',
			description: 'For the unit test. Override.',
		};
		const mergedSpec = getSpec([
			htmlSpec,
			{
				specs: [
					{
						name: 'a',
						attributes: [exAttr],
					},
				],
			},
			{
				specs: [
					{
						name: 'a',
						attributes: [exAttr2],
					},
				],
			},
		]);
		const aElAttrs = mergedSpec.specs.find(el => el.name === 'a')!.attributes;
		expect(
			aElAttrs.find((attr): attr is Attribute => !(typeof attr === 'string') && attr.name === 'href')!.name,
		).toBe('href');
		expect(
			aElAttrs.find((attr): attr is Attribute => !(typeof attr === 'string') && attr.name === exAttr.name),
		).toStrictEqual(exAttr2);
	});
});
