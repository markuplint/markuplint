// @ts-nocheck

import { AstroCompileError, astroParse } from './astro-parser';

it('Basic', () => {
	const ast = astroParse(`---
const name = "World";
---
<!-- Comment -->
<style>
div {
    color: red;
}
</style>
<div data-attr="v">Hello {name}!</div>
`);
	if (ast instanceof AstroCompileError) {
		throw ast;
	}
	expect(ast.html?.start).toBe(30);
	expect(ast.html?.end).toBe(126);
	expect(ast.html?.type).toBe('Fragment');
	expect(ast.html?.children?.length).toBe(5);
	expect(ast.html?.children?.[0]?.type).toBe('Text');
	expect(ast.html?.children?.[1]?.type).toBe('Comment');
	expect(ast.html?.children?.[1]?.data).toBe(' Comment ');
	expect(ast.html?.children?.[4]?.start).toBe(88);
	expect(ast.html?.children?.[4]?.end).toBe(126);
	expect(ast.html?.children?.[4]?.type).toBe('Element');
	expect(ast.html?.children?.[4]?.name).toBe('div');
	expect(ast.html?.children?.[4]?.attributes?.length).toBe(1);
	expect(ast.html?.children?.[4]?.children?.length).toBe(3);
});

it('2 style element', () => {
	const ast = astroParse(`---
const name = "World";
---
<!-- Comment -->
<style>
div {
    color: red;
}
</style>
<div>Hello {name}!</div>
<style>
div {
    background: #000;
}
</style>
`);
	if (ast instanceof AstroCompileError) {
		throw ast;
	}
	expect(ast.style?.length).toBe(2);
});

it('Void Element', () => {
	const ast = astroParse('<img>Text<img>');
	if (ast instanceof AstroCompileError) {
		throw ast;
	}
	expect(ast.html?.children?.length).toBe(3);
});

it('Attr and Template Directive', () => {
	const ast = astroParse('<div a x:y></div>');
	if (ast instanceof AstroCompileError) {
		throw ast;
	}
	expect(ast.html?.children?.[0].attributes).toStrictEqual([
		{
			type: 'Attribute',
			name: 'a',
			start: 5,
			end: 6,
			value: true,
		},
		{
			type: 'Attribute',
			name: 'x:y',
			start: 7,
			end: 10,
			value: true,
		},
	]);
});
