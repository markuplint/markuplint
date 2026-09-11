import { describe, expect, test } from 'vitest';

import { computeAccessibleName } from '../compute.js';

import { createTestResolver, element, textNode } from './test-helpers.js';

describe('aria-labelledby and aria-label', () => {
	describe('aria-labelledby', () => {
		test('single reference', () => {
			const ref = element('span', {
				attrs: { id: 'label1' },
				children: [textNode('Label text')],
			});
			const el = element('input', {
				attrs: { 'aria-labelledby': 'label1' },
			});
			const resolver = createTestResolver({
				elements: new Map([['label1', ref]]),
				nameFromContent: new Set(['span']),
			});
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Label text');
			expect(result.source).toBe('aria-labelledby');
		});

		test('multiple references joined by space', () => {
			const ref1 = element('span', {
				attrs: { id: 'l1' },
				children: [textNode('Hello')],
			});
			const ref2 = element('span', {
				attrs: { id: 'l2' },
				children: [textNode('World')],
			});
			const el = element('input', {
				attrs: { 'aria-labelledby': 'l1 l2' },
			});
			const resolver = createTestResolver({
				elements: new Map([
					['l1', ref1],
					['l2', ref2],
				]),
				nameFromContent: new Set(['span']),
			});
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Hello World');
		});

		test('non-existent ID is skipped', () => {
			const ref = element('span', {
				attrs: { id: 'real' },
				children: [textNode('Real')],
			});
			const el = element('input', {
				attrs: { 'aria-labelledby': 'fake real' },
			});
			const resolver = createTestResolver({
				elements: new Map([['real', ref]]),
				nameFromContent: new Set(['span']),
			});
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Real');
		});

		test('self-reference (accname-1.2 Example 2 pattern)', () => {
			const fileLink = element('a', {
				attrs: { id: 'file_row1', href: '/file.pdf' },
				children: [textNode('Documentation.pdf')],
			});
			const deleteBtn = element('span', {
				attrs: {
					id: 'del_row1',
					role: 'button',
					'aria-label': 'Delete',
					'aria-labelledby': 'del_row1 file_row1',
				},
			});
			const resolver = createTestResolver({
				elements: new Map([
					['del_row1', deleteBtn],
					['file_row1', fileLink],
				]),
				nameFromContent: new Set(['a']),
			});
			const result = computeAccessibleName(deleteBtn, resolver);
			expect(result.name).toBe('Delete Documentation.pdf');
		});

		test('hidden element referenced by aria-labelledby still computes name', () => {
			const ref = element('span', {
				attrs: { id: 'hidden-label', 'aria-hidden': 'true' },
				children: [textNode('Hidden text')],
			});
			const el = element('input', {
				attrs: { 'aria-labelledby': 'hidden-label' },
			});
			const resolver = createTestResolver({
				elements: new Map([['hidden-label', ref]]),
				nameFromContent: new Set(['span']),
			});
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Hidden text');
			expect(result.source).toBe('aria-labelledby');
		});

		test('empty aria-labelledby is ignored', () => {
			const el = element('button', {
				attrs: { 'aria-labelledby': '' },
				children: [textNode('Content')],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['button']),
			});
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Content');
			expect(result.source).toBe('content');
		});

		test('whitespace-only aria-labelledby is ignored', () => {
			const el = element('button', {
				attrs: { 'aria-labelledby': '   ' },
				children: [textNode('Content')],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['button']),
			});
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Content');
		});
	});

	describe('aria-label', () => {
		test('non-empty aria-label', () => {
			const el = element('div', {
				attrs: { 'aria-label': 'Custom name' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Custom name');
			expect(result.source).toBe('aria-label');
		});

		test('whitespace-only aria-label is skipped', () => {
			const el = element('div', {
				attrs: { 'aria-label': '   ' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('');
		});

		test('aria-label with leading/trailing whitespace is trimmed', () => {
			const el = element('div', {
				attrs: { 'aria-label': '  Trimmed  ' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Trimmed');
		});
	});
});
