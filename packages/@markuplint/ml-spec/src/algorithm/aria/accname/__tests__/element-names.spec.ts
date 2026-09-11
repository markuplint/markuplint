import { describe, expect, test } from 'vitest';

import { computeAccessibleName } from '../compute.js';

import { createTestResolver, element, textNode } from './test-helpers.js';

describe('HTML-AAM §4.1 element-specific name computation', () => {
	describe('input[text-like]', () => {
		test('label association', () => {
			const input = element('input', {
				attrs: { id: 'fname', type: 'text' },
			});
			const label = element('label', {
				attrs: { for: 'fname' },
				children: [textNode('First name')],
			});
			const resolver = createTestResolver({
				labels: new Map([['fname', [label]]]),
			});
			const result = computeAccessibleName(input, resolver);
			expect(result.name).toBe('First name');
			expect(result.source).toBe('label');
		});

		test('title fallback', () => {
			const input = element('input', {
				attrs: { type: 'text', title: 'Enter name' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(input, resolver);
			expect(result.name).toBe('Enter name');
			expect(result.source).toBe('title');
		});

		test('placeholder fallback', () => {
			const input = element('input', {
				attrs: { type: 'text', placeholder: 'Enter your name' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(input, resolver);
			expect(result.name).toBe('Enter your name');
			expect(result.source).toBe('placeholder');
		});

		test('placeholder with whitespace trimmed', () => {
			const input = element('input', {
				attrs: { placeholder: '  placeholder text  ' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(input, resolver);
			expect(result.name).toBe('placeholder text');
			expect(result.source).toBe('placeholder');
		});

		test('label takes precedence over title', () => {
			const input = element('input', {
				attrs: { id: 'fname', type: 'text', title: 'Title', placeholder: 'Placeholder' },
			});
			const label = element('label', {
				attrs: { for: 'fname' },
				children: [textNode('Label')],
			});
			const resolver = createTestResolver({
				labels: new Map([['fname', [label]]]),
			});
			const result = computeAccessibleName(input, resolver);
			expect(result.name).toBe('Label');
			expect(result.source).toBe('label');
		});

		test('title takes precedence over placeholder', () => {
			const input = element('input', {
				attrs: { type: 'text', title: 'Title', placeholder: 'Placeholder' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(input, resolver);
			expect(result.name).toBe('Title');
			expect(result.source).toBe('title');
		});

		test('input without type defaults to text', () => {
			const input = element('input', {
				attrs: { placeholder: 'Default text' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(input, resolver);
			expect(result.name).toBe('Default text');
			expect(result.source).toBe('placeholder');
		});
	});

	describe('input[button/submit/reset]', () => {
		test('input[submit] with value', () => {
			const el = element('input', {
				attrs: { type: 'submit', value: 'Go' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Go');
			expect(result.source).toBe('value');
		});

		test('input[submit] default', () => {
			const el = element('input', {
				attrs: { type: 'submit' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Submit');
			expect(result.source).toBe('default');
		});

		test('input[reset] default', () => {
			const el = element('input', {
				attrs: { type: 'reset' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Reset');
			expect(result.source).toBe('default');
		});

		test('input[button] with value', () => {
			const el = element('input', {
				attrs: { type: 'button', value: 'Click me' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Click me');
			expect(result.source).toBe('value');
		});

		test('input[button] with title fallback', () => {
			const el = element('input', {
				attrs: { type: 'button', title: 'Button title' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Button title');
			expect(result.source).toBe('title');
		});

		test('T4-2: input[type=button] with no label, value, or title returns empty', () => {
			const el = element('input', {
				attrs: { type: 'button' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			// input[type=button] has no default label (unlike submit/reset)
			expect(result.name).toBe('');
			expect(result.source).toBeNull();
		});
	});

	describe('input[image]', () => {
		test('alt attribute', () => {
			const el = element('input', {
				attrs: { type: 'image', alt: 'Submit form' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Submit form');
			expect(result.source).toBe('alt');
		});

		test('title fallback', () => {
			const el = element('input', {
				attrs: { type: 'image', title: 'Image title' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Image title');
			expect(result.source).toBe('title');
		});

		test('default fallback', () => {
			const el = element('input', {
				attrs: { type: 'image' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Submit Query');
			expect(result.source).toBe('default');
		});
	});

	describe('button', () => {
		test('content text', () => {
			const el = element('button', {
				children: [textNode('Click me')],
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Click me');
			expect(result.source).toBe('content');
		});

		test('label association takes precedence over content', () => {
			const btn = element('button', {
				attrs: { id: 'btn1' },
				children: [textNode('Content')],
			});
			const label = element('label', {
				attrs: { for: 'btn1' },
				children: [textNode('Label text')],
			});
			const resolver = createTestResolver({
				labels: new Map([['btn1', [label]]]),
			});
			const result = computeAccessibleName(btn, resolver);
			expect(result.name).toBe('Label text');
			expect(result.source).toBe('label');
		});

		test('title fallback when no content', () => {
			const el = element('button', {
				attrs: { title: 'Button title' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Button title');
			expect(result.source).toBe('title');
		});
	});

	describe('fieldset', () => {
		test('legend child', () => {
			const legend = element('legend', {
				children: [textNode('Personal Info')],
			});
			const el = element('fieldset', {
				children: [legend],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['legend']),
			});
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Personal Info');
			expect(result.source).toBe('legend');
		});

		test('title fallback when no legend', () => {
			const el = element('fieldset', {
				attrs: { title: 'Group title' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Group title');
			expect(result.source).toBe('title');
		});
	});

	describe('textarea, select, meter, progress, output', () => {
		test('textarea with label', () => {
			const textarea = element('textarea', {
				attrs: { id: 'desc' },
			});
			const label = element('label', {
				attrs: { for: 'desc' },
				children: [textNode('Description')],
			});
			const resolver = createTestResolver({
				labels: new Map([['desc', [label]]]),
			});
			const result = computeAccessibleName(textarea, resolver);
			expect(result.name).toBe('Description');
			expect(result.source).toBe('label');
		});

		test('select with title', () => {
			const el = element('select', {
				attrs: { title: 'Choose option' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Choose option');
			expect(result.source).toBe('title');
		});

		test('output with label', () => {
			const output = element('output', {
				attrs: { id: 'result' },
			});
			const label = element('label', {
				attrs: { for: 'result' },
				children: [textNode('Result')],
			});
			const resolver = createTestResolver({
				labels: new Map([['result', [label]]]),
			});
			const result = computeAccessibleName(output, resolver);
			expect(result.name).toBe('Result');
			expect(result.source).toBe('label');
		});

		test('meter with label', () => {
			const meter = element('meter', {
				attrs: { id: 'disk' },
			});
			const label = element('label', {
				attrs: { for: 'disk' },
				children: [textNode('Disk usage')],
			});
			const resolver = createTestResolver({
				labels: new Map([['disk', [label]]]),
			});
			const result = computeAccessibleName(meter, resolver);
			expect(result.name).toBe('Disk usage');
			expect(result.source).toBe('label');
		});

		test('meter with title fallback', () => {
			const el = element('meter', {
				attrs: { title: 'Meter title' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Meter title');
			expect(result.source).toBe('title');
		});

		test('progress with label', () => {
			const progress = element('progress', {
				attrs: { id: 'upload' },
			});
			const label = element('label', {
				attrs: { for: 'upload' },
				children: [textNode('Upload progress')],
			});
			const resolver = createTestResolver({
				labels: new Map([['upload', [label]]]),
			});
			const result = computeAccessibleName(progress, resolver);
			expect(result.name).toBe('Upload progress');
			expect(result.source).toBe('label');
		});

		test('progress with title fallback', () => {
			const el = element('progress', {
				attrs: { title: 'Loading' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Loading');
			expect(result.source).toBe('title');
		});

		test('meter without any name source returns empty', () => {
			const el = element('meter');
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('');
			expect(result.source).toBeNull();
		});

		test('progress without any name source returns empty', () => {
			const el = element('progress');
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('');
			expect(result.source).toBeNull();
		});

		test('meter label takes precedence over title', () => {
			const meter = element('meter', {
				attrs: { id: 'cpu', title: 'Ignored title' },
			});
			const label = element('label', {
				attrs: { for: 'cpu' },
				children: [textNode('CPU usage')],
			});
			const resolver = createTestResolver({
				labels: new Map([['cpu', [label]]]),
			});
			const result = computeAccessibleName(meter, resolver);
			expect(result.name).toBe('CPU usage');
			expect(result.source).toBe('label');
		});

		test('progress label takes precedence over title', () => {
			const progress = element('progress', {
				attrs: { id: 'dl', title: 'Ignored title' },
			});
			const label = element('label', {
				attrs: { for: 'dl' },
				children: [textNode('Download')],
			});
			const resolver = createTestResolver({
				labels: new Map([['dl', [label]]]),
			});
			const result = computeAccessibleName(progress, resolver);
			expect(result.name).toBe('Download');
			expect(result.source).toBe('label');
		});

		test('select with placeholder fallback', () => {
			const el = element('select', {
				attrs: { placeholder: 'Choose...' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Choose...');
			expect(result.source).toBe('placeholder');
		});

		test('textarea title takes precedence over placeholder', () => {
			const el = element('textarea', {
				attrs: { title: 'Title', placeholder: 'Placeholder' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Title');
			expect(result.source).toBe('title');
		});
	});

	describe('summary', () => {
		test('content text', () => {
			const el = element('summary', {
				children: [textNode('Details')],
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Details');
			expect(result.source).toBe('content');
		});

		test('title fallback', () => {
			const el = element('summary', {
				attrs: { title: 'Summary title' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Summary title');
			expect(result.source).toBe('title');
		});
	});

	describe('figure', () => {
		test('title only', () => {
			const el = element('figure', {
				attrs: { title: 'Figure title' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Figure title');
			expect(result.source).toBe('title');
		});

		test('no name without title', () => {
			const el = element('figure');
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('');
			expect(result.source).toBeNull();
		});

		test('figcaption does not provide accessible name', () => {
			const figcaption = element('figcaption', {
				children: [textNode('Figure caption')],
			});
			const el = element('figure', {
				children: [figcaption],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['figcaption']),
			});
			const result = computeAccessibleName(el, resolver);
			// figcaption is NOT an automatic name source for figure
			expect(result.name).toBe('');
			expect(result.source).toBeNull();
		});
	});

	describe('img', () => {
		test('alt attribute', () => {
			const el = element('img', {
				attrs: { alt: 'Photo description' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Photo description');
			expect(result.source).toBe('alt');
		});

		test('empty alt (intentional empty name)', () => {
			const el = element('img', {
				attrs: { alt: '' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('');
			expect(result.source).toBeNull();
		});

		test('title fallback when alt not specified', () => {
			const el = element('img', {
				attrs: { title: 'Image title' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Image title');
			expect(result.source).toBe('title');
		});

		test('alt takes precedence over title', () => {
			const el = element('img', {
				attrs: { alt: 'Alt text', title: 'Title text' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Alt text');
			expect(result.source).toBe('alt');
		});
	});

	describe('table', () => {
		test('caption child', () => {
			const caption = element('caption', {
				children: [textNode('Data Table')],
			});
			const el = element('table', {
				children: [caption],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['caption']),
			});
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Data Table');
			expect(result.source).toBe('caption');
		});

		test('title fallback', () => {
			const el = element('table', {
				attrs: { title: 'Table title' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Table title');
			expect(result.source).toBe('title');
		});

		test('T4-7: empty caption falls through to title', () => {
			const caption = element('caption', {
				children: [textNode('')],
			});
			const el = element('table', {
				attrs: { title: 'Fallback title' },
				children: [caption],
			});
			const resolver = createTestResolver({
				nameFromContent: new Set(['caption']),
			});
			const result = computeAccessibleName(el, resolver);
			// Empty caption produces empty name → falls through to title
			expect(result.name).toBe('Fallback title');
			expect(result.source).toBe('title');
		});
	});

	describe('a[href]', () => {
		test('content text', () => {
			const el = element('a', {
				attrs: { href: '/page' },
				children: [textNode('Click here')],
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Click here');
			expect(result.source).toBe('content');
		});

		test('title fallback', () => {
			const el = element('a', {
				attrs: { href: '/page', title: 'Link title' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Link title');
			expect(result.source).toBe('title');
		});

		test('a without href has no element-specific handler', () => {
			const el = element('a', {
				children: [textNode('Not a link')],
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('');
		});
	});

	describe('area', () => {
		test('alt attribute', () => {
			const el = element('area', {
				attrs: { alt: 'Area description' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Area description');
			expect(result.source).toBe('alt');
		});

		test('title fallback', () => {
			const el = element('area', {
				attrs: { title: 'Area title' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Area title');
			expect(result.source).toBe('title');
		});
	});

	describe('iframe', () => {
		test('title attribute', () => {
			const el = element('iframe', {
				attrs: { title: 'Embedded content' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Embedded content');
			expect(result.source).toBe('title');
		});
	});

	describe('section/div/span/etc.', () => {
		test('title fallback for div', () => {
			const el = element('div', {
				attrs: { title: 'Div title' },
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Div title');
			expect(result.source).toBe('title');
		});

		test('no name without title for span', () => {
			const el = element('span', {
				children: [textNode('Some text')],
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('');
		});
	});

	describe('SVG elements', () => {
		test('SVG title child', () => {
			const titleEl = element('title', {
				children: [textNode('Chart title')],
				namespaceURI: 'http://www.w3.org/2000/svg',
			});
			const el = element('svg', {
				children: [titleEl],
				namespaceURI: 'http://www.w3.org/2000/svg',
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Chart title');
			expect(result.source).toBe('svg-title');
		});

		test('aria-label takes precedence over SVG title', () => {
			const titleEl = element('title', {
				children: [textNode('Chart title')],
				namespaceURI: 'http://www.w3.org/2000/svg',
			});
			const el = element('svg', {
				attrs: { 'aria-label': 'Custom label' },
				children: [titleEl],
				namespaceURI: 'http://www.w3.org/2000/svg',
			});
			const resolver = createTestResolver();
			const result = computeAccessibleName(el, resolver);
			expect(result.name).toBe('Custom label');
			expect(result.source).toBe('aria-label');
		});
	});
});
