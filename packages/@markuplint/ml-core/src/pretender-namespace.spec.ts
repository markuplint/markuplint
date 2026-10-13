import { describe, expect, test } from 'vitest';

import { createTestDocument, createTestElement } from './test/index.js';

describe('pretender namespace', () => {
	test('an SVG root enters the SVG namespace without an explicit namespace setting', async () => {
		const element = createTestElement('<Icon />', {
			parser: await import('@markuplint/jsx-parser'),
			pretenders: [{ selector: 'Icon', as: { element: 'svg', slots: null } }],
		});
		expect(element.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(element.matches('svg|svg')).toBe(true);
	});
	test('a bare tag identity inherits its native SVG parent namespace', async () => {
		const document = createTestDocument('<svg><Path /></svg>', {
			parser: await import('@markuplint/jsx-parser'),
			pretenders: [{ selector: 'Path', as: 'path' }],
		});
		expect(document.querySelector('Path')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
	});
	test('native SVG children inherit the rendered parent namespace', async () => {
		const document = createTestDocument('<Svg><g><path /></g></Svg>', {
			parser: await import('@markuplint/jsx-parser'),
			pretenders: [{ selector: 'Svg', as: { element: 'svg', slots: true } }],
		});
		expect(document.querySelector('g')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(document.querySelector('path')?.namespaceURI).toBe('http://www.w3.org/2000/svg');
	});
	test('an inline as attribute inside svg keeps the parsed SVG namespace', async () => {
		const document = createTestDocument('<svg><Icon as="rect" /></svg>', {
			parser: await import('@markuplint/jsx-parser'),
		});
		const element = document.querySelector('Icon');

		expect(element?.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(element?.isForeignElement).toBe(true);
		expect(element?.localName).toBe('rect');
	});

	test('a component pretending to be svg exposes the SVG namespace', async () => {
		const element = createTestElement('<Icon />', {
			parser: await import('@markuplint/jsx-parser'),
			pretenders: [{ selector: 'Icon', as: { element: 'svg', namespace: 'svg', slots: null } }],
		});

		expect(element.namespaceURI).toBe('http://www.w3.org/2000/svg');
		expect(element.isForeignElement).toBe(true);
		expect(element.matches('svg|svg')).toBe(true);
		expect(element.matches('Icon')).toBe(true);
		expect(element.namespaceURI).toBe('http://www.w3.org/2000/svg');
	});

	test('a component pretending to be an HTML element keeps the HTML namespace', async () => {
		const element = createTestElement('<Button />', {
			parser: await import('@markuplint/jsx-parser'),
			pretenders: [{ selector: 'Button', as: { element: 'button', slots: null } }],
		});

		expect(element.namespaceURI).toBe('http://www.w3.org/1999/xhtml');
		expect(element.isForeignElement).toBe(false);
		expect(element.matches('svg|button')).toBe(false);
	});
});
