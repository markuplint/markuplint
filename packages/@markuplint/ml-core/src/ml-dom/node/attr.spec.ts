import { describe, test, expect } from 'vitest';

import spec from '@markuplint/html-spec';
import type { MLMLSpec } from '@markuplint/ml-spec';

import { createTestElement } from '../../test/index.js';

function createSpecWithPatterns(directivePatterns: MLMLSpec['directivePatterns']): MLMLSpec {
	return {
		...spec,
		directivePatterns: [...(directivePatterns ?? [])],
	};
}

describe('directivePatterns fallback resolution', () => {
	test('plain HTML attr with no patterns', () => {
		const el = createTestElement('<div class="foo"></div>');
		const attr = el.attributes.find(a => a.nameNode?.raw === 'class');
		expect(attr).toBeDefined();
		expect(attr!.name).toBe('class');
		expect(attr!.isDirective).toBeUndefined();
		expect(attr!.isDynamicValue).toBeUndefined();
	});

	test('directive pattern matches', () => {
		const specs = createSpecWithPatterns([{ pattern: '^x-(?:data|show)$', isDirective: true }]);
		const el = createTestElement('<div x-data="{}"></div>', { specs });
		const attr = el.attributes.find(a => a.nameNode?.raw === 'x-data');
		expect(attr).toBeDefined();
		expect(attr!.name).toBe('x-data');
		expect(attr!.isDirective).toBe(true);
	});

	test('potentialName via capture group', () => {
		const specs = createSpecWithPatterns([
			{
				pattern: '^(?:x-bind:|:)([^.]+)$',
				potentialName: '$1',
				isDynamicValue: true,
				valueType: 'code',
			},
		]);
		const el = createTestElement('<div x-bind:href="url"></div>', { specs });
		const attr = el.attributes.find(a => a.nameNode?.raw === 'x-bind:href');
		expect(attr).toBeDefined();
		expect(attr!.name).toBe('href');
		expect(attr!.isDynamicValue).toBe(true);
		expect(attr!.valueType).toBe('code');
	});

	test('shorthand syntax @event to onevent', () => {
		const specs = createSpecWithPatterns([
			{
				pattern: '^@(.+)$',
				potentialName: 'on$1',
				isDirective: true,
				isDynamicValue: true,
			},
		]);
		const el = createTestElement('<div @click="handler"></div>', { specs });
		const attr = el.attributes.find(a => a.nameNode?.raw === '@click');
		expect(attr).toBeDefined();
		expect(attr!.name).toBe('onclick');
	});

	test('isDuplicatable conditional array - matching name', () => {
		const specs = createSpecWithPatterns([
			{
				pattern: '^:(.+)$',
				potentialName: '$1',
				isDuplicatable: ['class', 'style'],
			},
		]);
		const el = createTestElement('<div :class="cls"></div>', { specs });
		const attr = el.attributes.find(a => a.nameNode?.raw === ':class');
		expect(attr).toBeDefined();
		expect(attr!.name).toBe('class');
		expect(attr!.isDuplicatable).toBe(true);
	});

	test('isDuplicatable conditional array - non-matching name', () => {
		const specs = createSpecWithPatterns([
			{
				pattern: '^:(.+)$',
				potentialName: '$1',
				isDuplicatable: ['class', 'style'],
			},
		]);
		const el = createTestElement('<div :href="url"></div>', { specs });
		const attr = el.attributes.find(a => a.nameNode?.raw === ':href');
		expect(attr).toBeDefined();
		expect(attr!.name).toBe('href');
		expect(attr!.isDuplicatable).toBeFalsy();
	});

	test('no match falls through to defaults', () => {
		const specs = createSpecWithPatterns([{ pattern: '^x-(?:data|show)$', isDirective: true }]);
		const el = createTestElement('<div class="foo"></div>', { specs });
		const attr = el.attributes.find(a => a.nameNode?.raw === 'class');
		expect(attr).toBeDefined();
		expect(attr!.name).toBe('class');
		expect(attr!.isDirective).toBeUndefined();
		expect(attr!.isDynamicValue).toBeUndefined();
	});
});

describe('parser-set potentialName takes precedence', () => {
	test('regular attrs without potentialName from parser use spec fallback', () => {
		const specs = createSpecWithPatterns([
			{
				pattern: '^:(.+)$',
				potentialName: '$1',
				isDynamicValue: true,
			},
		]);
		const el = createTestElement('<div :href="url"></div>', { specs });
		const attr = el.attributes.find(a => a.nameNode?.raw === ':href');
		expect(attr).toBeDefined();
		expect(attr!.name).toBe('href');
		expect(attr!.isDynamicValue).toBe(true);
	});

	test('unmatched attr retains raw name when no parser potentialName', () => {
		const specs = createSpecWithPatterns([{ pattern: '^v-(.+)$', isDirective: true }]);
		const el = createTestElement('<div data-foo="bar"></div>', { specs });
		const attr = el.attributes.find(a => a.nameNode?.raw === 'data-foo');
		expect(attr).toBeDefined();
		expect(attr!.name).toBe('data-foo');
		expect(attr!.isDirective).toBeUndefined();
	});
});

describe('valueType from pattern', () => {
	test('pattern with valueType boolean', () => {
		const specs = createSpecWithPatterns([
			{
				pattern: '^x-show$',
				isDirective: true,
				valueType: 'boolean',
			},
		]);
		const el = createTestElement('<div x-show="true"></div>', { specs });
		const attr = el.attributes.find(a => a.nameNode?.raw === 'x-show');
		expect(attr).toBeDefined();
		expect(attr!.valueType).toBe('boolean');
	});

	test('pattern with valueType code', () => {
		const specs = createSpecWithPatterns([
			{
				pattern: '^:(.+)$',
				potentialName: '$1',
				isDynamicValue: true,
				valueType: 'code',
			},
		]);
		const el = createTestElement('<div :href="url"></div>', { specs });
		const attr = el.attributes.find(a => a.nameNode?.raw === ':href');
		expect(attr).toBeDefined();
		expect(attr!.valueType).toBe('code');
	});

	test('pattern without valueType keeps default', () => {
		const specs = createSpecWithPatterns([
			{
				pattern: '^x-data$',
				isDirective: true,
			},
		]);
		const el = createTestElement('<div x-data="{}"></div>', { specs });
		const attr = el.attributes.find(a => a.nameNode?.raw === 'x-data');
		expect(attr).toBeDefined();
		expect(attr!.valueType).toBe('string');
	});
});

describe('multiple attributes on same element', () => {
	test('each attribute resolves independently', () => {
		const specs = createSpecWithPatterns([
			{ pattern: '^x-data$', isDirective: true },
			{ pattern: '^x-show$', isDirective: true, isDynamicValue: true },
		]);
		const el = createTestElement('<div x-data="{}" x-show="visible" class="foo"></div>', { specs });

		const xData = el.attributes.find(a => a.nameNode?.raw === 'x-data');
		expect(xData).toBeDefined();
		expect(xData!.name).toBe('x-data');
		expect(xData!.isDirective).toBe(true);

		const xShow = el.attributes.find(a => a.nameNode?.raw === 'x-show');
		expect(xShow).toBeDefined();
		expect(xShow!.name).toBe('x-show');
		expect(xShow!.isDirective).toBe(true);
		expect(xShow!.isDynamicValue).toBe(true);

		const cls = el.attributes.find(a => a.nameNode?.raw === 'class');
		expect(cls).toBeDefined();
		expect(cls!.name).toBe('class');
		expect(cls!.isDirective).toBeUndefined();
		expect(cls!.isDynamicValue).toBeUndefined();
	});

	test('mixed directive and binding patterns', () => {
		const specs = createSpecWithPatterns([
			{
				pattern: '^@(.+)$',
				potentialName: 'on$1',
				isDirective: true,
				isDynamicValue: true,
			},
			{
				pattern: '^:(.+)$',
				potentialName: '$1',
				isDynamicValue: true,
				valueType: 'code',
			},
		]);
		const el = createTestElement('<div @click="handler" :href="url" id="test"></div>', { specs });

		const click = el.attributes.find(a => a.nameNode?.raw === '@click');
		expect(click).toBeDefined();
		expect(click!.name).toBe('onclick');
		expect(click!.isDirective).toBe(true);
		expect(click!.isDynamicValue).toBe(true);

		const href = el.attributes.find(a => a.nameNode?.raw === ':href');
		expect(href).toBeDefined();
		expect(href!.name).toBe('href');
		expect(href!.isDynamicValue).toBe(true);
		expect(href!.valueType).toBe('code');

		const id = el.attributes.find(a => a.nameNode?.raw === 'id');
		expect(id).toBeDefined();
		expect(id!.name).toBe('id');
		expect(id!.isDirective).toBeUndefined();
		expect(id!.isDynamicValue).toBeUndefined();
	});
});
