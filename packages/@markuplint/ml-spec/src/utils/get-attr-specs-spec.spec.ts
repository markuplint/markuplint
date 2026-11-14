import htmlSpec from '@markuplint/html-spec';
import { describe, test, expect } from 'vitest';

import { getAttrSpecs } from './get-attr-specs-spec.js';

describe('getSpec', () => {
	test('svg:image[x]', () => {
		const specs = getAttrSpecs('image', 'http://www.w3.org/2000/svg', htmlSpec);
		const x = specs?.find(spec => spec.name === 'x');
		expect(x).toStrictEqual({
			defaultValue: '0',
			description: '',
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
			description: '',
			name: 'x',
			type: ['<svg-length>', '<percentage>'],
			animatable: true,
		});
	});

	test('svg:linearGradient[xlink:href]', () => {
		const specs = getAttrSpecs('linearGradient', 'http://www.w3.org/2000/svg', htmlSpec);
		const x = specs?.find(spec => spec.name === 'xlink:href');
		expect(x).toStrictEqual({
			description: '',
			name: 'xlink:href',
			type: 'URL',
			deprecated: true,
		});
	});

	test('input[switch]: a single selector is a string', () => {
		const specs = getAttrSpecs('input', null, htmlSpec);
		const attr = specs?.find(spec => spec.name === 'switch');
		expect(attr?.condition).toBe("[type='checkbox' i]");
	});

	test('audio[controlslist]: an attribute that the data lists with nothing but its name is known, as `Any`', () => {
		const specs = getAttrSpecs('audio', null, htmlSpec);
		const attr = specs?.find(spec => spec.name === 'controlslist');
		expect(attr).toStrictEqual({ name: 'controlslist', type: 'Any', description: '' });
	});
});
