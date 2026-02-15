import { describe, expect, test } from 'vitest';

import { computeAccessibleName } from '../compute.js';

import { createTestResolver, element, textNode } from './test-helpers.js';

describe('label association', () => {
	test('explicit label (for=id)', () => {
		const input = element('input', {
			attrs: { id: 'name', type: 'text' },
		});
		const label = element('label', {
			attrs: { for: 'name' },
			children: [textNode('Name')],
		});
		const resolver = createTestResolver({
			labels: new Map([['name', [label]]]),
		});
		const result = computeAccessibleName(input, resolver);
		expect(result.name).toBe('Name');
		expect(result.source).toBe('label');
	});

	test('implicit label (ancestor)', () => {
		const input = element('input', {
			attrs: { type: 'text' },
		});
		const label = element('label', {
			children: [textNode('Email: '), input],
		});
		// Set parent
		Object.defineProperty(input, 'parentElement', { value: label });

		const resolver = createTestResolver();
		const result = computeAccessibleName(input, resolver);
		expect(result.name).toBe('Email:');
		expect(result.source).toBe('label');
	});

	test('multiple explicit labels', () => {
		const input = element('input', {
			attrs: { id: 'multi', type: 'text' },
		});
		const label1 = element('label', {
			attrs: { for: 'multi' },
			children: [textNode('First')],
		});
		const label2 = element('label', {
			attrs: { for: 'multi' },
			children: [textNode('Second')],
		});
		const resolver = createTestResolver({
			labels: new Map([['multi', [label1, label2]]]),
		});
		const result = computeAccessibleName(input, resolver);
		expect(result.name).toBe('First Second');
		expect(result.source).toBe('label');
	});

	test('label with nested elements', () => {
		const em = element('em', {
			children: [textNode('important')],
		});
		const input = element('input', {
			attrs: { id: 'nested', type: 'text' },
		});
		const label = element('label', {
			attrs: { for: 'nested' },
			children: [textNode('This is '), em],
		});
		const resolver = createTestResolver({
			labels: new Map([['nested', [label]]]),
			nameFromContent: new Set(['em']),
		});
		const result = computeAccessibleName(input, resolver);
		expect(result.name).toBe('This is important');
		expect(result.source).toBe('label');
	});

	test('no label returns null source', () => {
		const input = element('input', {
			attrs: { type: 'text' },
		});
		const resolver = createTestResolver();
		const result = computeAccessibleName(input, resolver);
		expect(result.name).toBe('');
		expect(result.source).toBeNull();
	});

	test('T4-3: explicit label takes precedence over implicit label', () => {
		const input = element('input', {
			attrs: { id: 'name', type: 'text' },
		});
		const implicitLabel = element('label', {
			children: [textNode('Implicit: '), input],
		});
		Object.defineProperty(input, 'parentElement', { value: implicitLabel });
		const explicitLabel = element('label', {
			attrs: { for: 'name' },
			children: [textNode('Explicit')],
		});
		const resolver = createTestResolver({
			labels: new Map([['name', [explicitLabel]]]),
		});
		const result = computeAccessibleName(input, resolver);
		// When both explicit (for=id) and implicit (ancestor) labels exist,
		// explicit label wins and implicit is ignored
		expect(result.name).toBe('Explicit');
		expect(result.source).toBe('label');
	});
});
