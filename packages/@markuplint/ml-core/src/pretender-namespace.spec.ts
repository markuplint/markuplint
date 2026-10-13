import { describe, test, expect } from 'vitest';

import { createTestDocument, createTestElement } from './test/index.js';

const SVG = 'http://www.w3.org/2000/svg';
const HTML = 'http://www.w3.org/1999/xhtml';
const MATHML = 'http://www.w3.org/1998/Math/MathML';

const jsx = async () => ({ parser: await import('@markuplint/jsx-parser') });

function pretendedNamespace(el: { pretenderContext: unknown } | null | undefined) {
	const context = el?.pretenderContext as { type: string; as: { namespaceURI: string } } | null | undefined;
	expect(context?.type).toBe('pretender');
	return context?.as.namespaceURI;
}

describe('pretender namespace', () => {
	test('a component pretending to be svg is an SVG element without an explicit namespace', async () => {
		const el = createTestElement('<Icon />', {
			...(await jsx()),
			pretenders: [{ selector: 'Icon', as: { element: 'svg', slots: null } }],
		});
		expect(pretendedNamespace(el)).toBe(SVG);
	});

	test('a bare string identity of svg is an SVG element', async () => {
		const el = createTestElement('<Icon />', {
			...(await jsx()),
			pretenders: [{ selector: 'Icon', as: 'svg' }],
		});
		expect(pretendedNamespace(el)).toBe(SVG);
	});

	test('a component pretending to be math is a MathML element', async () => {
		const el = createTestElement('<Formula />', {
			...(await jsx()),
			pretenders: [{ selector: 'Formula', as: 'math' }],
		});
		expect(pretendedNamespace(el)).toBe(MATHML);
	});

	test('the namespace a definition states takes precedence over the name', async () => {
		const el = createTestElement('<Link />', {
			...(await jsx()),
			pretenders: [{ selector: 'Link', as: { element: 'a', namespace: 'svg' } }],
		});
		expect(pretendedNamespace(el)).toBe(SVG);
	});

	test('a component pretending to be an HTML element stays HTML', async () => {
		const el = createTestElement('<Button />', {
			...(await jsx()),
			pretenders: [{ selector: 'Button', as: 'button' }],
		});
		expect(pretendedNamespace(el)).toBe(HTML);
	});

	test('a component inside svg takes the SVG namespace of where it is used', async () => {
		const doc = createTestDocument('<svg><Path /></svg>', {
			...(await jsx()),
			pretenders: [{ selector: 'Path', as: 'path' }],
		});
		expect(pretendedNamespace(doc.querySelector('Path'))).toBe(SVG);
	});

	test('a component inside foreignObject takes the HTML namespace', async () => {
		const doc = createTestDocument('<svg><foreignObject><Box /></foreignObject></svg>', {
			...(await jsx()),
			pretenders: [{ selector: 'Box', as: 'div' }],
		});
		expect(pretendedNamespace(doc.querySelector('Box'))).toBe(HTML);
	});

	test('the component exposes the namespace of the element it renders', async () => {
		const el = createTestElement('<Icon />', {
			...(await jsx()),
			pretenders: [{ selector: 'Icon', as: 'svg' }],
		});
		expect(el.namespaceURI).toBe(SVG);
		expect(el.matches('svg|svg')).toBe(true);
	});

	test('isForeignElement still describes how the component tag was parsed', async () => {
		const el = createTestElement('<Icon />', {
			...(await jsx()),
			pretenders: [{ selector: 'Icon', as: 'svg' }],
		});
		expect(el.isForeignElement).toBe(false);
	});

	test('children given to a component rendering svg are SVG elements', async () => {
		const doc = createTestDocument('<Icon><g><path /></g></Icon>', {
			...(await jsx()),
			pretenders: [{ selector: 'Icon', as: { element: 'svg', slots: true } }],
		});
		expect(doc.querySelector('g')?.namespaceURI).toBe(SVG);
		expect(doc.querySelector('path')?.namespaceURI).toBe(SVG);
	});

	test('a component given to a component rendering svg is an SVG element', async () => {
		const doc = createTestDocument('<Icon><Path /></Icon>', {
			...(await jsx()),
			pretenders: [
				{ selector: 'Icon', as: { element: 'svg', slots: true } },
				{ selector: 'Path', as: 'path' },
			],
		});
		expect(pretendedNamespace(doc.querySelector('Path'))).toBe(SVG);
	});

	test('children inside foreignObject given to a component rendering svg are HTML elements', async () => {
		const doc = createTestDocument('<Icon><foreignObject><div /></foreignObject></Icon>', {
			...(await jsx()),
			pretenders: [{ selector: 'Icon', as: { element: 'svg', slots: true } }],
		});
		expect(doc.querySelector('foreignObject')?.namespaceURI).toBe(SVG);
		expect(doc.querySelector('div')?.namespaceURI).toBe(HTML);
	});

	test('children take the namespace of the slot wrapper', async () => {
		const doc = createTestDocument('<Icon><path /></Icon>', {
			...(await jsx()),
			pretenders: [{ selector: 'Icon', as: { element: 'div', slots: [{ element: 'svg' }] } }],
		});
		expect(doc.querySelector('path')?.namespaceURI).toBe(SVG);
	});

	test('children given to a component rendering an HTML element keep the namespace the parser gave', async () => {
		const doc = createTestDocument('<Box><div /></Box>', {
			...(await jsx()),
			pretenders: [{ selector: 'Box', as: { element: 'div', slots: true } }],
		});
		expect(doc.querySelector('div')?.namespaceURI).toBe(HTML);
	});

	test('children take the namespace a slot wrapper states', async () => {
		const doc = createTestDocument('<Icon><p /></Icon>', {
			...(await jsx()),
			pretenders: [
				{
					selector: 'Icon',
					as: { element: 'svg', slots: [{ element: 'div', namespace: 'html' }] },
				},
			],
		});
		expect(doc.querySelector('p')?.namespaceURI).toBe(HTML);
	});

	test('children keep the namespace the parser gave when the slots give different namespaces', async () => {
		const doc = createTestDocument('<Chart><p /></Chart>', {
			...(await jsx()),
			pretenders: [
				{
					selector: 'Chart',
					as: { element: 'svg', slots: [{ element: 'svg' }, { element: 'div', namespace: 'html' }] },
				},
			],
		});
		expect(doc.querySelector('p')?.namespaceURI).toBe(HTML);
	});

	test('a component given to a component whose slots give different namespaces keeps its namespace', async () => {
		const doc = createTestDocument('<Chart><Path /></Chart>', {
			...(await jsx()),
			pretenders: [
				{
					selector: 'Chart',
					as: { element: 'svg', slots: [{ element: 'svg' }, { element: 'div', namespace: 'html' }] },
				},
				{ selector: 'Path', as: 'path' },
			],
		});
		expect(pretendedNamespace(doc.querySelector('Path'))).toBe(HTML);
	});

	test('children take the namespace all the slots give', async () => {
		const doc = createTestDocument('<Icon><path /></Icon>', {
			...(await jsx()),
			pretenders: [
				{
					selector: 'Icon',
					as: { element: 'svg', slots: [{ element: 'g' }, { element: 'g' }] },
				},
			],
		});
		expect(doc.querySelector('path')?.namespaceURI).toBe(SVG);
	});

	test('a component named like a foreign element given to a component is not a foreign element', async () => {
		const doc = createTestDocument('<Box><Math><b /></Math></Box>', {
			...(await jsx()),
			pretenders: [{ selector: 'Box', as: { element: 'div', slots: true } }],
		});
		expect(doc.querySelector('Math')?.namespaceURI).toBe(HTML);
		expect(doc.querySelector('b')?.namespaceURI).toBe(HTML);
	});

	test('a component named like a foreign element is an HTML element without a pretender', async () => {
		const doc = createTestDocument('<div><Svg><g /></Svg><Math><b /></Math></div>', await jsx());
		expect(doc.querySelector('Svg')?.namespaceURI).toBe(HTML);
		expect(doc.querySelector('g')?.namespaceURI).toBe(HTML);
		expect(doc.querySelector('Math')?.namespaceURI).toBe(HTML);
		expect(doc.querySelector('b')?.namespaceURI).toBe(HTML);
	});

	test('a component in a MathML text integration point has the namespace of an element written there', () => {
		const doc = createTestDocument('<math><mi><x-label></x-label><span></span></mi></math>', {
			pretenders: [{ selector: 'x-label', as: 'span' }],
		});
		expect(doc.querySelector('span')?.namespaceURI).toBe(MATHML);
		expect(pretendedNamespace(doc.querySelector('x-label'))).toBe(MATHML);
	});

	test('children of a custom element keep the namespace they are parsed in', () => {
		const doc = createTestDocument('<x-icon><path></path></x-icon>', {
			pretenders: [{ selector: 'x-icon', as: { element: 'svg', slots: true } }],
		});
		expect(pretendedNamespace(doc.querySelector('x-icon'))).toBe(SVG);
		expect(doc.querySelector('path')?.namespaceURI).toBe(HTML);
	});

	test('a camelCase SVG element given to a component keeps the case of its name', async () => {
		const doc = createTestDocument('<Icon><linearGradient /></Icon>', {
			...(await jsx()),
			pretenders: [{ selector: 'Icon', as: { element: 'svg', slots: true } }],
		});
		const el = doc.querySelector('linearGradient');
		expect(el?.namespaceURI).toBe(SVG);
		expect(el?.isForeignElement).toBe(true);
		expect(el?.localName).toBe('linearGradient');
	});

	test('children given to a component in HTML keep the case of their names', () => {
		const doc = createTestDocument(
			'<SimpleIcon><foreignObject><div></div></foreignObject><linearGradient></linearGradient></SimpleIcon>',
			{ pretenders: [{ selector: 'SimpleIcon', as: { element: 'svg', slots: true } }] },
		);
		expect(doc.querySelector('foreignObject')?.namespaceURI).toBe(SVG);
		expect(doc.querySelector('div')?.namespaceURI).toBe(HTML);
		const gradient = doc.querySelector('linearGradient');
		expect(gradient?.namespaceURI).toBe(SVG);
		expect(gradient?.localName).toBe('linearGradient');
	});

	test('an element in contents takes the namespace of the slot wrapper', async () => {
		const el = createTestElement('<Icon />', {
			...(await jsx()),
			pretenders: [
				{
					selector: 'Icon',
					as: {
						element: 'svg',
						slots: [{ element: 'foreignObject', contents: [{ element: 'div' }, { slot: true }] }],
					},
				},
			],
		});
		const context = el.pretenderContext as {
			type: string;
			slotContent?: {
				wrapper: { namespaceURI: string } | null;
				fill: (given: never[]) => { namespaceURI: string }[];
			};
		};
		expect(context.slotContent?.wrapper?.namespaceURI).toBe(SVG);
		expect(context.slotContent?.fill([])[0]?.namespaceURI).toBe(HTML);
	});

	test('a component named like a foreign element at the root takes the HTML namespace', async () => {
		const el = createTestElement('<Math />', {
			...(await jsx()),
			pretenders: [{ selector: 'Math', as: 'span' }],
		});
		expect(pretendedNamespace(el)).toBe(HTML);
	});
});
