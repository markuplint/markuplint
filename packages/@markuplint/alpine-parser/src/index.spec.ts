import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('template x-for', () => {
	test('converts template x-for to psblock', () => {
		const doc = parse('<template x-for="item in items"><li x-text="item"></li></template>');
		const types = doc.nodeList.map(n => n.type);
		expect(types).toContain('psblock');
	});

	test('x-if template is a block', () => {
		const doc = parse('<template x-if="show"><p>hello</p></template>');
		const types = doc.nodeList.map(n => n.type);
		expect(types).toContain('psblock');
	});

	test('non-template elements are unaffected', () => {
		const doc = parse('<div x-for="item in items"><span></span></div>');
		const types = doc.nodeList.map(n => n.type);
		expect(types).not.toContain('psblock');
	});

	test('nested content is preserved', () => {
		const doc = parse(`
<ul>
	<template x-for="item in items">
		<li x-text="item"></li>
	</template>
</ul>`);
		const types = doc.nodeList.map(n => n.type);
		expect(types).toContain('psblock');
		const blocks = doc.nodeList.filter(n => n.type === 'psblock');
		expect(blocks).toHaveLength(2);
	});
});

describe('template x-if', () => {
	test('converts template x-if to a block that has an if behavior, and its closing tag to an end', () => {
		const doc = parse('<template x-if="show"><p>hello</p></template>');
		const blocks = doc.nodeList.filter(n => n.type === 'psblock');
		expect(blocks.map(block => block.blockBehavior?.type)).toStrictEqual(['if', 'end']);
	});

	test('the content stays in the document between the two blocks', () => {
		const doc = parse('<template x-if="show"><p>hello</p></template>');
		expect(doc.nodeList.map(n => n.nodeName)).toStrictEqual(['template', 'p', '#text', 'p', 'template']);
	});

	test('x-if on an element other than template is unaffected', () => {
		const doc = parse('<div x-if="show"><span></span></div>');
		expect(doc.nodeList.map(n => n.type)).not.toContain('psblock');
	});

	test('a template that declares a shadow root stays a template element', () => {
		const doc = parse('<div><template shadowrootmode="open" x-if="show"><slot></slot></template></div>');
		expect(doc.nodeList.map(n => n.type)).not.toContain('psblock');
	});

	test('a template that has both x-for and x-if is a loop', () => {
		const doc = parse('<template x-for="item in items" x-if="show"><li></li></template>');
		const blocks = doc.nodeList.filter(n => n.type === 'psblock');
		expect(blocks.map(block => block.blockBehavior?.type)).toStrictEqual(['each', 'end']);
	});

	test('a template that has x-for keeps an each behavior', () => {
		const doc = parse('<template x-for="item in items"><li x-text="item"></li></template>');
		const blocks = doc.nodeList.filter(n => n.type === 'psblock');
		expect(blocks.map(block => block.blockBehavior?.type)).toStrictEqual(['each', 'end']);
	});
});
