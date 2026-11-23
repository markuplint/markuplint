import type { MLElement } from './element.js';
import type { MLParser } from '@markuplint/ml-ast';
import type { ExtendedSpec, MLMLSpec } from '@markuplint/ml-spec';

import htmlSpec from '@markuplint/html-spec';
import { schemaToSpec } from '@markuplint/ml-spec';
import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

/**
 * Whether the tree of an element may hold an element whose `id` the markup does not tell: a reference that finds no element in such a tree
 * may refer to it.
 * Which tree an element is in is `getRootNode()`: the document, the content of a `template` element
 * and a shadow root are trees of their own.
 */

async function jsxParser(): Promise<MLParser> {
	return (await import('@markuplint/jsx-parser')).parser;
}

async function vueParser(): Promise<MLParser> {
	return (await import('@markuplint/vue-parser')).parser;
}

function must<T>(value: T | null | undefined): T {
	expect(value).not.toBeNull();
	expect(value).not.toBeUndefined();
	return value as T;
}

async function jsx(code: string, pretenders?: NonNullable<Parameters<typeof createTestDocument>[1]>['pretenders']) {
	return createTestDocument(code, { parser: await jsxParser(), ...(pretenders ? { pretenders } : {}) });
}

function unknown(el: MLElement<any, any> | null) {
	return must(el).treeMayHoldUnknownId();
}

describe('MLElement#treeMayHoldUnknownId', () => {
	test('false for a tree whose ids the markup tells', async () => {
		const doc = await jsx('<><h2 id="a">t</h2><div className={cls} id="b">x</div></>');
		expect(unknown(doc.querySelector('div'))).toBe(false);
	});

	test('true for an element whose id is not known until it is rendered', async () => {
		const doc = await jsx('<><h2 id={x}>t</h2><div></div></>');
		expect(unknown(doc.querySelector('div'))).toBe(true);
	});

	test.each([
		['<><h2 {...props}>t</h2><div></div></>', true],
		['<><h2 id="a" {...props}>t</h2><div></div></>', true],
		['<><h2 {...props} id="a">t</h2><div></div></>', false],
		['<><h2 {...props} id={x}>t</h2><div></div></>', true],
	])('a spread attribute: %s', async (code, expected) => {
		const doc = await jsx(code);
		expect(unknown(doc.querySelector('div'))).toBe(expected);
	});

	test('a spread before the first id is overridden, and a second id changes nothing', async () => {
		const doc = await jsx('<><h2 {...props} id="a" id="b">t</h2><div></div></>');
		expect(unknown(doc.querySelector('div'))).toBe(false);
	});

	test.each([
		['<><h2 id="a" id={x}>t</h2><div></div></>', true],
		['<><h2 id={x} id="a">t</h2><div></div></>', true],
		['<><h2 id="a" id="b" {...props}>t</h2><div></div></>', true],
		['<><h2 {...props} id="a" id={undefined}>t</h2><div></div></>', false],
	])(
		'an id written twice: the later one wins, so a dynamic one among them is not known: %s',
		async (code, expected) => {
			const doc = await jsx(code);
			expect(unknown(doc.querySelector('div'))).toBe(expected);
		},
	);

	test('an id that is not output (id={undefined}) gives none', async () => {
		const doc = await jsx('<><h2 id={undefined}>t</h2><div></div></>');
		expect(unknown(doc.querySelector('div'))).toBe(false);
	});

	test.each([
		['<><h2 id={undefined} {...props}>t</h2><div></div></>'],
		['<><h2 {...props} id={undefined}>t</h2><div></div></>'],
	])('an id that is not output does not override a spread, whichever comes first: %s', async code => {
		const doc = await jsx(code);
		expect(unknown(doc.querySelector('div'))).toBe(true);
	});

	test('a document is answered on its own: another document that has a spread does not leak', async () => {
		const withSpread = await jsx('<><h2 {...props}>t</h2><div></div></>');
		const without = await jsx('<><h2 id="a">t</h2><div></div></>');
		expect(unknown(withSpread.querySelector('div'))).toBe(true);
		expect(unknown(without.querySelector('div'))).toBe(false);
		// The second call reads the answer of the first, which is the same
		expect(unknown(withSpread.querySelector('div'))).toBe(true);
		expect(unknown(without.querySelector('div'))).toBe(false);
	});

	test('a block of a template language that has no behavior is unknown content', async () => {
		const parser = (await import('@markuplint/nunjucks-parser')).parser;
		const doc = createTestDocument("<div></div>{% include 'nav.html' %}", { parser });
		expect(unknown(doc.querySelector('div'))).toBe(true);
	});

	test.each([
		['<><Header /><div></div></>'],
		['<><Foo.Bar /><div></div></>'],
		['<><section><Header /></section><div></div></>'],
	])('a component that no pretender resolved: %s', async code => {
		const doc = await jsx(code);
		expect(unknown(doc.querySelector('div'))).toBe(true);
	});

	test('a component that a pretender stands for an element of HTML is that element', async () => {
		const doc = await jsx('<><Header /><div></div></>', [{ selector: 'Header', as: 'header' }]);
		expect(unknown(doc.querySelector('div'))).toBe(false);
	});

	test('a pretender whose contents are not known may render an id; one whose contents are declared does not', async () => {
		const unknownContents = await jsx('<><Dyn /><div></div></>', [
			{ selector: 'Dyn', as: { element: 'div', contents: [{ dynamic: true }] } },
		]);
		expect(unknown(unknownContents.querySelector('div'))).toBe(true);
		const knownContents = await jsx('<><Known /><div></div></>', [
			{ selector: 'Known', as: { element: 'div', contents: [{ element: 'span' }] } },
		]);
		expect(unknown(knownContents.querySelector('div'))).toBe(false);
	});

	test('a pretender that inherits the attributes takes a spread of the usage', async () => {
		const doc = await jsx('<><X {...props} /><div></div></>', [
			{ selector: 'X', as: { element: 'h2', inheritAttrs: true } },
		]);
		expect(unknown(doc.querySelector('div'))).toBe(true);
		const plain = await jsx('<><X {...props} /><div></div></>', [{ selector: 'X', as: 'h2' }]);
		expect(unknown(plain.querySelector('div'))).toBe(false);
	});

	test.each([['<><div>{children}</div></>'], ['<><div></div>{cond && <i />}</>']])(
		'content that is not known (a block without a behavior): %s',
		async code => {
			const doc = await jsx(code);
			expect(unknown(doc.querySelector('div'))).toBe(true);
		},
	);

	test('content that a block with a behavior shows is known', async () => {
		const doc = await jsx('<><div></div>{items.map(i => <li key={i}>a</li>)}</>');
		expect(unknown(doc.querySelector('div'))).toBe(false);
	});

	test('a component in a block with a behavior is not known', async () => {
		const doc = await jsx('<><div></div>{items.map(i => <Item key={i} />)}</>');
		expect(unknown(doc.querySelector('div'))).toBe(true);
	});

	test('the slot of a framework renders what the component is given', async () => {
		const doc = createTestDocument('<template><div></div><slot /></template>', { parser: await vueParser() });
		expect(unknown(doc.querySelector('div'))).toBe(true);
	});

	test('the slot of a shadow root of HTML brings no id of its own tree', () => {
		const doc = createTestDocument(
			'<section><template shadowrootmode="open"><div></div><slot></slot></template><p>a</p></section>',
		);
		const div = must(doc.deepQuerySelectorAll('div')[0]);
		expect(unknown(div)).toBe(false);
	});
});

describe('MLElement#treeMayHoldUnknownId and x-bind of Alpine.js', () => {
	test.each([
		['<h2 x-bind="o" id="a">t</h2><div></div>'],
		['<h2 id="a" x-bind="o">t</h2><div></div>'],
		['<h2 x-bind="o">t</h2><div></div>'],
	])('the object overrides an attribute wherever it is written: %s', async code => {
		const document = createTestDocument(code, {
			parser: (await import('@markuplint/alpine-parser')).parser,
			specs: schemaToSpec([
				htmlSpec as unknown as MLMLSpec,
				(await import('@markuplint/alpine-spec')).default as ExtendedSpec,
			]),
		});
		expect(unknown(document.querySelector('div'))).toBe(true);
	});

	test('x-bind with an argument is one attribute, not a spread', async () => {
		const document = createTestDocument('<h2 x-bind:title="t" id="a">t</h2><div></div>', {
			parser: (await import('@markuplint/alpine-parser')).parser,
			specs: schemaToSpec([
				htmlSpec as unknown as MLMLSpec,
				(await import('@markuplint/alpine-spec')).default as ExtendedSpec,
			]),
		});
		expect(unknown(document.querySelector('div'))).toBe(false);
	});
});

describe('MLElement#treeMayHoldUnknownId and the components of Vue', () => {
	async function vue(code: string) {
		return createTestDocument(code, { parser: await vueParser() });
	}

	test.each([
		['<template><div></div><Transition><p>a</p></Transition></template>'],
		['<template><div></div><transition><p>a</p></transition></template>'],
		['<template><div></div><keep-alive><p>a</p></keep-alive></template>'],
		['<template><div></div><TransitionGroup><p>a</p></TransitionGroup></template>'],
		['<template><div></div><Teleport to="body"><p>a</p></Teleport></template>'],
		['<template><div></div><Suspense><p>a</p></Suspense></template>'],
	])('a built-in component renders what is written in it, so it brings no id: %s', async code => {
		expect(unknown((await vue(code)).querySelector('div'))).toBe(false);
	});

	test.each([
		['<template><div></div><Transition><Foo /></Transition></template>'],
		['<template><div></div><Foo><p>a</p></Foo></template>'],
	])(
		'what a built-in component holds is read as any other, and a component of the project is not one: %s',
		async code => {
			expect(unknown((await vue(code)).querySelector('div'))).toBe(true);
		},
	);
});

describe('MLElement#treeMayHoldUnknownId and a declarative shadow root', () => {
	test('the HTML slot places nodes of the tree of a shadow host, so it brings no id into its own', () => {
		const doc = createTestDocument(
			'<section><template shadowrootmode="open"><div></div><slot></slot></template><p></p><slot></slot></section>',
		);
		expect(unknown(must(doc.deepQuerySelectorAll('div')[0]))).toBe(false);
		expect(unknown(must(doc.deepQuerySelectorAll('p')[0]))).toBe(false);
	});

	test('a component in the shadow root is not what the document has', async () => {
		const doc = createTestDocument(
			'<section><template shadowrootmode="open"><Foo /><div></div></template><p></p></section>',
			{ parser: await jsxParser() },
		);
		const div = must(doc.deepQuerySelectorAll('div')[0]);
		const p = must(doc.deepQuerySelectorAll('p')[0]);
		expect(unknown(div)).toBe(true);
		expect(unknown(p)).toBe(false);
	});

	test('in Vue the children of a template without a directive are in the tree of the document', async () => {
		const doc = createTestDocument('<template><div></div><template><Foo /><p></p></template></template>', {
			parser: await vueParser(),
		});
		expect(unknown(must(doc.deepQuerySelectorAll('p')[0]))).toBe(true);
		expect(unknown(must(doc.querySelector('div')))).toBe(true);
	});
});

describe('MLElement#treeMayHoldUnknownId across trees (JSX)', () => {
	test('what the content of a template has is not what the document has', async () => {
		const doc = await jsx('<><div></div><template><Header /><p /></template></>');
		const div = must(doc.querySelector('div'));
		const p = must(doc.deepQuerySelectorAll('p')[0]);
		expect(unknown(div)).toBe(false);
		expect(unknown(p)).toBe(true);
	});

	test('a spread in the content of a template is counted for that tree only', async () => {
		const doc = await jsx('<><div></div><template><h2 {...props} /><p /></template></>');
		expect(unknown(must(doc.querySelector('div')))).toBe(false);
		expect(unknown(must(doc.deepQuerySelectorAll('p')[0]))).toBe(true);
	});
});
