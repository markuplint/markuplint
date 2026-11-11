import type { MLParser } from '@markuplint/ml-ast';

import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

async function jsxParser(): Promise<MLParser> {
	return (await import('@markuplint/jsx-parser')).parser;
}

async function root(code: string) {
	return createTestDocument(code, { parser: await jsxParser() }).querySelector('div');
}

/**
 * A component that no pretender resolved renders something that is not known: its attributes tell nothing
 * of it, whether they are written as code (`size={size}`), as a literal (`size={16}`) or as a string
 * (`size="16"`). So an element that has one among its descendants may have content and attributes that
 * change, for the rules that ask about the descendants (`hasMutableChildren(true)`).
 */
describe('MLElement#hasMutableChildren(true) and a component that no pretender resolved', () => {
	test.each([
		['<div><Icon /></div>'],
		['<div><Icon size="16" /></div>'],
		['<div><Icon size={16} /></div>'],
		['<div><Icon size={size} /></div>'],
		['<div><span><Icon /></span></div>'],
		['<div><span></span><Icon /></div>'],
		['<div><Foo.Bar /></div>'],
	])('%s is mutable', async code => {
		expect((await root(code))?.hasMutableChildren(true)).toBe(true);
	});

	test.each([['<div></div>'], ['<div>text</div>'], ['<div><span></span></div>'], ['<div><x-el></x-el></div>']])(
		'%s is not',
		async code => {
			expect((await root(code))?.hasMutableChildren(true)).toBe(false);
		},
	);

	test('is asked only when the caller asks about the descendants', async () => {
		// `permitted-contents` and the others do not ask, and a component is checked by their own rules
		expect((await root('<div><Icon /></div>'))?.hasMutableChildren()).toBe(false);
		expect((await root('<div><Icon /></div>'))?.hasMutableChildren(false)).toBe(false);
	});

	test('a component that a pretender resolved is the element that it renders', async () => {
		const document = createTestDocument('<div><Icon /></div>', {
			parser: await jsxParser(),
			pretenders: [{ selector: 'Icon', as: { element: 'span', contents: [{ element: 'svg' }] } }],
		});
		expect(document.querySelector('div')?.hasMutableChildren(true)).toBe(false);
	});

	test('a pretender that renders content that is not known does not make the usage site mutable, the rules read the content', async () => {
		const document = createTestDocument('<div><Icon /></div>', {
			parser: await jsxParser(),
			pretenders: [{ selector: 'Icon', as: { element: 'span', contents: [{ dynamic: true }] } }],
		});
		// `hasMutableChildren` is about the usage site: what the pretender renders is read by the rules (`hasUnknownContent`)
		expect(document.querySelector('div')?.hasMutableChildren(true)).toBe(false);
	});

	test('a pretender whose target is itself a component renders something that is not known', async () => {
		const document = createTestDocument('<div><Icon /></div>', {
			parser: await jsxParser(),
			pretenders: [{ selector: 'Icon', as: 'Foo.Bar' }],
		});
		expect(document.querySelector('div')?.hasMutableChildren(true)).toBe(true);
	});
});

describe('MLElement#isUnresolvedComponent', () => {
	test.each([['<Icon />'], ['<Icon size={size} />'], ['<Foo.Bar />']])('%s is one', async code => {
		const document = createTestDocument(`<div>${code}</div>`, { parser: await jsxParser() });
		expect(document.querySelector('div')?.firstElementChild?.isUnresolvedComponent()).toBe(true);
	});

	test.each([['<div />'], ['<span></span>'], ['<x-el></x-el>']])('%s is not', async code => {
		const document = createTestDocument(`<div>${code}</div>`, { parser: await jsxParser() });
		expect(document.querySelector('div')?.firstElementChild?.isUnresolvedComponent()).toBe(false);
	});

	test('a component that a pretender resolved is not', async () => {
		const document = createTestDocument('<div><Icon /></div>', {
			parser: await jsxParser(),
			pretenders: [{ selector: 'Icon', as: 'span' }],
		});
		expect(document.querySelector('div')?.firstElementChild?.isUnresolvedComponent()).toBe(false);
	});

	test('a component in a Vue template is one', async () => {
		const document = createTestDocument('<template><div><Icon /></div></template>', {
			parser: (await import('@markuplint/vue-parser')).parser,
		});
		expect(document.querySelector('div')?.firstElementChild?.isUnresolvedComponent()).toBe(true);
	});

	test('a component that a pretender stands for a web component is not', async () => {
		const document = createTestDocument('<div><Icon /></div>', {
			parser: await jsxParser(),
			pretenders: [{ selector: 'Icon', as: 'x-icon' }],
		});
		expect(document.querySelector('div')?.firstElementChild?.isUnresolvedComponent()).toBe(false);
	});

	test('a component that a pretender stands for another component is one', async () => {
		const document = createTestDocument('<div><Icon /></div>', {
			parser: await jsxParser(),
			pretenders: [{ selector: 'Icon', as: 'Foo.Bar' }],
		});
		expect(document.querySelector('div')?.firstElementChild?.isUnresolvedComponent()).toBe(true);
	});
});

describe('MLElement#hasMutableChildren and a slot', () => {
	test('counts every slot by default', () => {
		const doc = createTestDocument('<div><span><slot></slot></span></div>');
		expect(doc.querySelector('div')?.hasMutableChildren()).toBe(true);
	});

	test('counts only the slots that the predicate says', () => {
		const doc = createTestDocument('<div><span><slot></slot></span></div>');
		const div = doc.querySelector('div');
		expect(div?.hasMutableChildren(true, () => false)).toBe(false);
		expect(div?.hasMutableChildren(true, slot => slot.localName === 'slot')).toBe(true);
	});
});
