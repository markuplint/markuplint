import type { MLDocument } from './document.js';
import type { MLMLSpec } from '@markuplint/ml-spec';

import htmlSpec from '@markuplint/html-spec';
import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

async function svelte(code: string) {
	return createTestDocument(code, { parser: await import('@markuplint/svelte-parser') });
}

async function jsx(code: string) {
	return createTestDocument(code, { parser: await import('@markuplint/jsx-parser') });
}

async function vue(code: string) {
	return createTestDocument(code, { parser: await import('@markuplint/vue-parser') });
}

function must<T>(value: T | null | undefined): T {
	expect(value).not.toBeNull();
	expect(value).not.toBeUndefined();
	return value as T;
}

function div(doc: MLDocument<any, any>) {
	return must(doc.querySelector('div'));
}

function localNames(elements: Iterable<{ readonly localName: string }>) {
	return [...elements].map(el => el.localName);
}

function nameOf(doc: MLDocument<any, any>) {
	const a11y = must(doc.getAccessibilityProp(div(doc)));
	expect(a11y).toHaveProperty('name');
	return (a11y as { readonly name?: unknown }).name;
}

/**
 * Which branch of a conditional block is rendered is not known from the markup, so the markup as written
 * has no name for an element whose name is in a branch (`getAccessibleName`), while the element may have
 * one (`mayHaveAccessibleName`).
 */
describe('MLElement#mayHaveAccessibleName', () => {
	test.each([
		['<div role="button">{#if a}Save{/if}</div>'],
		['<div role="button">{#if a}Save{:else}Cancel{/if}</div>'],
		['<div role="button">{#if a}<span></span>{:else}Cancel{/if}</div>'],
		['<div role="button">{#await p}Loading{:then v}Done{/await}</div>'],
		['<div role="button"><span>{#if a}Save{/if}</span></div>'],
		['<div role="button">{#if a}{#if b}Save{/if}{/if}</div>'],
	])('%s has no name as written, and may have one', async code => {
		const el = div(await svelte(code));
		expect(el.getAccessibleName('1.3')).toBe('');
		expect(el.mayHaveAccessibleName('1.3')).toBe(true);
	});

	test.each([
		['<div role="button">{#if a}<span></span>{/if}</div>'],
		['<div role="button">{#if a}{/if}</div>'],
		['<div role="button">{#if a}<span hidden>Save</span>{/if}</div>'],
		['<div role="button"></div>'],
	])('%s has no name in any branch', async code => {
		expect(div(await svelte(code)).mayHaveAccessibleName('1.3')).toBe(false);
	});

	test('the name as written is a name', async () => {
		const el = div(await svelte('<div role="button">Save{#if a}<span></span>{/if}</div>'));
		expect(el.getAccessibleName('1.3')).toBe('Save');
		expect(el.mayHaveAccessibleName('1.3')).toBe(true);
	});

	test('the answer is the same however often and for whichever version it is asked', async () => {
		const doc = await svelte('<div role="button">{#if a}<img src="a.png">{:else}Save{/if}</div>');
		const el = div(doc);
		const img = must(doc.querySelector('img'));
		const answers = [
			el.mayHaveAccessibleName('1.3'),
			el.mayHaveAccessibleName('1.2'),
			img.mayHaveAccessibleName('1.3'),
			el.mayHaveAccessibleName('1.3'),
			img.mayHaveAccessibleName('1.2'),
			el.mayHaveAccessibleName('1.2'),
		];
		expect(answers).toStrictEqual([true, true, false, true, false, true]);
	});

	test('a document without a conditional block says what the markup as written says', async () => {
		const doc = await jsx('<div role="button"></div>');
		expect(doc.hasConditionalNode).toBe(false);
		expect(div(doc).mayHaveAccessibleName('1.3')).toBe(false);
	});

	test('an each block may render nothing, so it is a node that may be left out', async () => {
		const doc = await svelte('<div role="button">{#each xs as x}{x}{/each}</div>');
		expect(doc.hasConditionalNode).toBe(true);
	});

	test.each([
		['<template><i v-if="a"></i></template>', true],
		['<template><i v-if="a"></i><i v-else></i></template>', true],
		['<template><i v-else></i></template>', true],
		['<template><i v-for="x in xs"></i></template>', true],
		['<template><i></i><i :a="b" @click="c"></i></template>', false],
	])('%s: an element that has v-if, v-else or v-for is a node that may be left out', async (code, expected) => {
		const doc = await vue(code);
		expect(doc.hasConditionalNode).toBe(expected);
		expect(doc.hasConditionalNode).toBe(expected);
	});

	test('Vue: the name of an element whose legend a v-if may leave out is not known', async () => {
		const doc = await vue(
			'<template><fieldset role="img"><legend v-if="a"></legend><legend v-else>N</legend></fieldset></template>',
		);
		const fieldset = must(doc.querySelector('fieldset'));
		expect(fieldset.getAccessibleName('1.3')).toBe('');
		expect(fieldset.mayHaveAccessibleName('1.3')).toBe(true);
		const a11y = must(doc.getAccessibilityProp(fieldset));
		expect(a11y).toHaveProperty('name');
		expect((a11y as { readonly name?: unknown }).name).toStrictEqual({ unknown: true });
		expect(localNames(doc.querySelectorAll(':aria(has name)'))).toContain('fieldset');
	});

	test('a conditional block in the content of a template is in the node list as well', async () => {
		expect((await svelte('<template>{#if a}x{/if}</template>')).hasConditionalNode).toBe(true);
		expect(
			(await svelte('<div><template shadowrootmode="open">{#if a}x{/if}</template></div>')).hasConditionalNode,
		).toBe(true);
	});

	test('a document with an if block has a conditional block', async () => {
		expect((await svelte('<div>{#if a}x{/if}</div>')).hasConditionalNode).toBe(true);
	});
});

describe(':aria() and a name in a branch', () => {
	test('an element whose name is in a branch matches has name', async () => {
		const doc = await svelte('<div role="button">{#if a}Save{/if}</div>');
		expect(localNames(doc.querySelectorAll(':aria(has name)'))).toContain('div');
		expect(localNames(doc.querySelectorAll(':aria(has no name)'))).not.toContain('div');
	});

	test('an element that has no name in any branch matches has no name', async () => {
		const doc = await svelte('<div role="button">{#if a}<span></span>{/if}</div>');
		expect(localNames(doc.querySelectorAll(':aria(has no name)'))).toContain('div');
		expect(localNames(doc.querySelectorAll(':aria(has name)'))).not.toContain('div');
	});
});

describe('MLDocument#getAccessibilityProp and a name in a branch', () => {
	test('the name is not known', async () => {
		expect(nameOf(await svelte('<div role="button">{#if a}Save{/if}</div>'))).toStrictEqual({ unknown: true });
	});

	test('the name is known to be empty when no branch has one', async () => {
		expect(nameOf(await svelte('<div role="button">{#if a}<span></span>{/if}</div>'))).toBe('');
	});

	test('the name of a loop body is the name, as an each block is flattened', async () => {
		expect(nameOf(await svelte('<div role="button">{#each xs as x}<b>Save</b>{/each}</div>'))).toBe('Save');
	});
});

describe('MLElement#hasMutableChildren and a branch of a conditional block', () => {
	test.each([
		['<div>{#if a}{label}{/if}</div>'],
		['<div>{#if a}{:else}{label}{/if}</div>'],
		['<div>{#if a}<Comp />{/if}</div>'],
	])('%s is mutable', async code => {
		expect(div(await svelte(code)).hasMutableChildren(true)).toBe(true);
	});

	test.each([['<div>{#if a}Save{/if}</div>'], ['<div>{#if a}<span></span>{:else}Cancel{/if}</div>']])(
		'%s is not mutable',
		async code => {
			expect(div(await svelte(code)).hasMutableChildren(true)).toBe(false);
		},
	);

	test('a component in a branch is mutable only when attributes are asked', async () => {
		expect(div(await svelte('<div>{#if a}<Comp />{/if}</div>')).hasMutableChildren()).toBe(false);
	});
});

describe('The content of a template that the parser declares to be in place', () => {
	const inPlace = { ...htmlSpec, templateContent: 'in-place' } as unknown as MLMLSpec;
	const separateTree = { ...htmlSpec, templateContent: 'separate-tree' } as unknown as MLMLSpec;

	test('is read as the content of an ordinary element', async () => {
		const doc = await vue('<template><div><template><b>x</b></template></div></template>');
		expect(must(doc.querySelector('div > template')).isHTMLTemplateElement).toBe(false);
	});

	test('is what the spec of the framework says, for Vue', async () => {
		expect((await import('@markuplint/vue-parser')).parser.templateContent).toBe('in-place');
		expect((await import('@markuplint/vue-spec')).default.templateContent).toBe('in-place');
	});

	test('is left to the spec by a parser that several frameworks share, JSX', async () => {
		expect((await import('@markuplint/jsx-parser')).parser.templateContent).toBeUndefined();
		expect((await import('@markuplint/react-spec')).default.templateContent).toBe('in-place');
	});

	test('is not read so when the parser says nothing', () => {
		const doc = createTestDocument('<div><template><b>x</b></template></div>');
		expect(must(doc.querySelector('template')).isHTMLTemplateElement).toBe(true);
	});

	test('is what the spec says when the spec and the parser differ', async () => {
		const asSeparate = createTestDocument('<template><div><template><b>x</b></template></div></template>', {
			parser: await import('@markuplint/vue-parser'),
			specs: separateTree,
		});
		expect(must(asSeparate.querySelector('div > template')).isHTMLTemplateElement).toBe(true);
		const asInPlace = createTestDocument('<div><template><b>x</b></template></div>', { specs: inPlace });
		expect(must(asInPlace.querySelector('template')).isHTMLTemplateElement).toBe(false);
	});
});
