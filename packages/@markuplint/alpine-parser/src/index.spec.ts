import { describe, test, expect } from 'vitest';

import { parser } from './parser.js';

const parse = parser.parse.bind(parser);

describe('template x-for', () => {
	test('converts template x-for to psblock', () => {
		const doc = parse('<template x-for="item in items"><li x-text="item"></li></template>');
		const types = doc.nodeList.map(n => n.type);
		expect(types).toContain('psblock');
	});

	test('non-x-for template remains a starttag', () => {
		const doc = parse('<template x-if="show"><p>hello</p></template>');
		const types = doc.nodeList.map(n => n.type);
		expect(types).not.toContain('psblock');
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
