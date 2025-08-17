import htmlSpec from '@markuplint/html-spec';
import { describe, test, expect } from 'vitest';

import { getAttrSpecs } from './get-attr-specs-spec.js';

describe('getSpec', () => {
	test('svg:image[x]', () => {
		const specs = getAttrSpecs('image', 'http://www.w3.org/2000/svg', htmlSpec);
		const x = specs?.find(spec => spec.name === 'x');
		expect(x).toStrictEqual({
			defaultValue: '0',
			description:
				'Positions the image horizontally from the origin. Value type: <length> | <percentage>; Default value: 0; Animatable: yes',
			name: 'x',
			type: ['<svg-length>', '<percentage>'],
			animatable: true,
		});
	});

	test('svg:foreignObject[x]', () => {
		const specs = getAttrSpecs('foreignObject', 'http://www.w3.org/2000/svg', htmlSpec);
		const x = specs?.find(spec => spec.name === 'x');
		expect(x).toStrictEqual({
			defaultValue: '0',
			description:
				'The x coordinate of the foreignObject. Value type: <length> | <percentage>; Default value: 0; Animatable: yes',
			name: 'x',
			type: ['<svg-length>', '<percentage>'],
			animatable: true,
		});
	});

	test('svg:linearGradient[xlink:href]', () => {
		const specs = getAttrSpecs('linearGradient', 'http://www.w3.org/2000/svg', htmlSpec);
		const x = specs?.find(spec => spec.name === 'xlink:href');
		expect(x).toStrictEqual({
			description:
				'An <IRI> reference to another <linearGradient> element that will be used as a template. Value type: <IRI>; Default value: none; Animatable: yes',
			name: 'xlink:href',
			type: 'URL',
			deprecated: true,
		});
	});
});
