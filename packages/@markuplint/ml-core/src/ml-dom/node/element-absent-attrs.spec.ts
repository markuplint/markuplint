import type { MLParser } from '@markuplint/ml-ast';

import { describe, test, expect } from 'vitest';

import { createTestDocument, createTestElement } from '../../test/index.js';

async function jsxParser(): Promise<MLParser> {
	return (await import('@markuplint/jsx-parser')).parser;
}

/** The document of the code, and the first element that the selector matches (`el`). */
async function jsx(code: string, selector: string) {
	const document = createTestDocument(code, { parser: await jsxParser() });
	const el = document.querySelector(selector);
	if (!el) {
		throw new TypeError(`No element ${selector} in ${code}`);
	}
	return { document, el };
}

/**
 * An attribute that the framework does not output (`disabled={false}`, `title={null}`) is in the list of the
 * attributes of the element, as the name of one that is misspelled is reported whatever its value is, and is not
 * found when the DOM is asked for it by name, as the DOM does not have it.
 */
describe('an attribute that the framework does not output', () => {
	test('is in the list of the attributes', async () => {
		const { el } = await jsx('<button disabled={false} title={null} type="button"></button>', 'button');
		expect([...el.attributes].map(attr => attr.name)).toStrictEqual(['disabled', 'title', 'type']);
		expect([...el.getAttributeTokens()].map(attr => attr.name)).toStrictEqual(['disabled', 'title', 'type']);
		expect([...el.attributes].map(attr => attr.isAbsent)).toStrictEqual([true, true, undefined]);
	});

	test('is not found by name', async () => {
		const { el } = await jsx('<button disabled={false} title={null} type="button"></button>', 'button');
		expect(el.getAttribute('disabled')).toBeNull();
		expect(el.hasAttribute('disabled')).toBe(false);
		expect(el.getAttributeToken('disabled')).toHaveLength(0);
		expect(el.getAttributeNode('disabled')).toBeNull();
		expect(el.attributes.getNamedItem('disabled')).toBeNull();
		expect(el.getAttributePretended('disabled')).toBeNull();
		// An attribute that is output is found
		expect(el.getAttribute('type')).toBe('button');
		expect(el.hasAttribute('type')).toBe(true);
		expect(el.getAttributeToken('type')).toHaveLength(1);
		expect(el.getAttributeNode('type')?.name).toBe('type');
		expect(el.attributes.getNamedItem('type')?.name).toBe('type');
	});

	test('is not a name that the element has', async () => {
		const { el } = await jsx('<button disabled={false} type="button"></button>', 'button');
		expect(el.getAttributeNames()).toStrictEqual(['type']);
		expect(el.hasAttributes()).toBe(true);
		expect((await jsx('<button disabled={false}></button>', 'button')).el.hasAttributes()).toBe(false);
	});

	test('is not an id, and an id of code that is not a literal is', async () => {
		expect((await jsx('<div id={null}></div>', 'div')).el.id).toBe('');
		expect((await jsx('<div id={"a"}></div>', 'div')).el.id).toBe('a');
		expect((await jsx('<div id={"a"} id={null}></div>', 'div')).el.id).toBe('a');
	});

	test('is not a class', async () => {
		const { el } = await jsx('<div class={null} class="a"></div>', 'div');
		expect([...el.classList]).toStrictEqual(['a']);
		expect((await jsx('<div class={"a b"}></div>', 'div')).el.classList.value).toBe('a b');
		// A boolean on `class` is the string, as the default of ml-core says
		expect([...(await jsx('<div class={false} class="a"></div>', 'div')).el.classList]).toStrictEqual([
			'false',
			'a',
		]);
	});

	test('does not make the attributes of the element mutable, and code that is not a literal does', async () => {
		expect((await jsx('<button disabled={false} title={null}></button>', 'button')).el.hasMutableAttributes()).toBe(
			false,
		);
		expect((await jsx('<button disabled={true}></button>', 'button')).el.hasMutableAttributes()).toBe(false);
		expect((await jsx('<button disabled={cond}></button>', 'button')).el.hasMutableAttributes()).toBe(true);
		expect((await jsx('<button {...props}></button>', 'button')).el.hasMutableAttributes()).toBe(true);
	});

	test('is not selected by an attribute selector, and an attribute that is output is', async () => {
		const { document } = await jsx(
			'<><button disabled={false}></button><button disabled={true}></button></>',
			'button',
		);
		const buttons = [...document.querySelectorAll('button')];
		expect(buttons).toHaveLength(2);
		expect(document.querySelectorAll('button[disabled]')).toHaveLength(1);
		expect(document.querySelectorAll('button:not([disabled])')).toHaveLength(1);
		expect(document.querySelector('button[disabled]')).toBe(buttons[1]);
	});

	test('is not matched by the value either', async () => {
		const { document } = await jsx('<><a title={null}></a><a title={"x"}></a></>', 'a');
		expect(document.querySelectorAll('a[title]')).toHaveLength(1);
		expect(document.querySelectorAll('a[title="x"]')).toHaveLength(1);
		expect(document.querySelectorAll('a[title=""]')).toHaveLength(0);
	});

	test('is one of the two that has the name when the same name is written twice', async () => {
		const { el } = await jsx('<div title="a" title={null}></div>', 'div');
		expect(el.getAttribute('title')).toBe('a');
		expect(el.getAttributeToken('title')).toHaveLength(1);
	});

	test('is none in a document of HTML, where nothing is written as code', () => {
		const el = createTestElement('<button disabled title="x"></button>');
		expect([...el.attributes].every(attr => attr.isAbsent === undefined)).toBe(true);
		expect(el.getAttribute('disabled')).toBe('');
	});
});
