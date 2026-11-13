import type { MLDocument } from '../node/document.js';
import type { MLNode } from '../node/node.js';

import { describe, test, expect } from 'vitest';

import { createTestDocument } from '../../test/index.js';

import { expandConditionalBlocks, isConditionalBlock, mayBeAbsentWith, mayBeLeftOut } from './conditional-block.js';

async function svelte(code: string) {
	return createTestDocument(code, { parser: await import('@markuplint/svelte-parser') });
}

async function vue(code: string) {
	return createTestDocument(code, { parser: await import('@markuplint/vue-parser') });
}

function must<T>(value: T | null | undefined): T {
	expect(value).not.toBeNull();
	expect(value).not.toBeUndefined();
	return value as T;
}

function behaviorOf(node: MLNode<any, any>) {
	return node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK) || node.is(node.ELEMENT_NODE)
		? node.blockBehavior?.type
		: undefined;
}

function legends(doc: MLDocument<any, any>) {
	return [...doc.querySelectorAll('legend')];
}

describe('isConditionalBlock and expandConditionalBlocks', () => {
	test('an if block with its else clause is conditional, an each block is not', async () => {
		const doc = await svelte('<div>{#if a}x{:else}y{/if}{#each xs as x}{x}{/each}</div>');
		const blocks = doc.nodeList.filter(node => node.is(node.MARKUPLINT_PREPROCESSOR_BLOCK));
		const conditional = blocks.filter(block => isConditionalBlock(block)).map(block => behaviorOf(block));
		expect(conditional).toStrictEqual(['if', 'if:else']);
	});

	test('a nested block is replaced by the nodes of its branches', async () => {
		const doc = await svelte('<div>{#if a}{#if b}<i></i>{:else}<u></u>{/if}<b></b>{/if}</div>');
		const names = expandConditionalBlocks(must(doc.querySelector('div')).childNodes)
			.filter(node => node.is(node.ELEMENT_NODE))
			.map(node => node.nodeName.toLowerCase());
		expect(names).toStrictEqual(['i', 'u', 'b']);
	});

	test('the clauses of if, await and each are expanded', async () => {
		const doc = await svelte(
			'<div>{#if a}<i></i>{:else if b}<u></u>{:else}<s></s>{/if}{#await p}<p></p>{:then v}<q></q>{:catch e}<r></r>{/await}{#each xs as x}<m></m>{:else}<n></n>{/each}</div>',
		);
		const names = expandConditionalBlocks(must(doc.querySelector('div')).childNodes)
			.filter(node => node.is(node.ELEMENT_NODE))
			.map(node => node.nodeName.toLowerCase());
		expect(names).toStrictEqual(['i', 'u', 's', 'p', 'q', 'r', 'm', 'n']);
	});
});

describe('a template that a framework renders away', () => {
	test('is replaced by its content, with or without the spec of the framework', async () => {
		const doc = await vue(
			'<template><div><template v-if="a"><b></b></template><template v-slot:x><i></i></template></div></template>',
		);
		const names = expandConditionalBlocks(must(doc.querySelector('div')).childNodes)
			.filter(node => node.is(node.ELEMENT_NODE))
			.map(node => node.nodeName.toLowerCase());
		expect(names).toStrictEqual(['b', 'template']);
	});
});

describe('mayBeLeftOut', () => {
	test('a block that has a behavior, an each block included, and an element that carries one', async () => {
		const doc = await svelte('<div>{#if a}<i></i>{/if}{#each xs as x}<u></u>{/each}<b></b></div>');
		const left = doc.nodeList.filter(node => mayBeLeftOut(node)).map(node => behaviorOf(node));
		expect(left).toStrictEqual(['if', 'each']);
		const vueDoc = await vue('<template><i v-if="a"></i><u v-for="x in xs"></u><b></b></template>');
		const elements = vueDoc.nodeList.filter(node => node.is(node.ELEMENT_NODE));
		expect(elements.map(node => mayBeLeftOut(node))).toStrictEqual([true, true, false]);
	});
});

describe('mayBeAbsentWith', () => {
	test('a candidate in a branch is absent with one in another branch', async () => {
		const [first, second] = legends(
			await svelte('<fieldset>{#if a}<legend></legend>{:else}<legend></legend>{/if}</fieldset>'),
		);
		expect(mayBeAbsentWith(must(first), must(second))).toBe(true);
		expect(mayBeAbsentWith(must(second), must(first))).toBe(true);
	});

	test('a candidate that is not in a block is always rendered', async () => {
		const [first, second] = legends(
			await svelte('<fieldset><legend></legend>{#if a}<legend></legend>{/if}</fieldset>'),
		);
		expect(mayBeAbsentWith(must(first), must(second))).toBe(false);
		expect(mayBeAbsentWith(must(second), must(first))).toBe(true);
	});

	test('two candidates in the same branch are rendered together', async () => {
		const [first, second] = legends(
			await svelte('<fieldset>{#if a}<legend></legend><legend></legend>{/if}</fieldset>'),
		);
		expect(mayBeAbsentWith(must(first), must(second))).toBe(false);
	});

	test('the inner block of a nested one leaves the candidate out of the outer one', async () => {
		const [first, second] = legends(
			await svelte('<fieldset>{#if a}{#if b}<legend></legend>{/if}<legend></legend>{/if}</fieldset>'),
		);
		expect(mayBeAbsentWith(must(first), must(second))).toBe(true);
		expect(mayBeAbsentWith(must(second), must(first))).toBe(false);
	});

	test('an else if clause is a branch', async () => {
		const [first, second, third] = legends(
			await svelte(
				'<fieldset>{#if a}<legend></legend>{:else if b}<legend></legend>{:else}<legend></legend>{/if}</fieldset>',
			),
		);
		expect(mayBeAbsentWith(must(first), must(third))).toBe(true);
		expect(mayBeAbsentWith(must(second), must(third))).toBe(true);
	});

	test('a loop may render nothing, so what is in it is left out when its empty clause renders', async () => {
		const [first, second] = legends(
			await svelte('<fieldset>{#each xs as x}<legend></legend>{:else}<legend></legend>{/each}</fieldset>'),
		);
		expect(mayBeAbsentWith(must(first), must(second))).toBe(true);
	});

	test('an element that has v-if, v-else-if, v-else or v-for may be left out', async () => {
		const [a, b, c, d] = legends(
			await vue(
				'<template><fieldset><legend v-if="a"></legend><legend v-else-if="b"></legend><legend v-else></legend><legend v-for="x in xs"></legend></fieldset></template>',
			),
		);
		expect(mayBeAbsentWith(must(a), must(b))).toBe(true);
		expect(mayBeAbsentWith(must(b), must(c))).toBe(true);
		expect(mayBeAbsentWith(must(c), must(d))).toBe(true);
	});

	test('an element without a directive is always rendered', async () => {
		const [a, b] = legends(
			await vue('<template><fieldset><legend></legend><legend></legend></fieldset></template>'),
		);
		expect(mayBeAbsentWith(must(a), must(b))).toBe(false);
	});
});
