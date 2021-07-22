import { AstroCompileError, astroParse } from './astro-parser';

it('Parse error', () => {
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
	if (!(ast instanceof AstroCompileError)) {
		throw ast;
	}
	expect(ast instanceof AstroCompileError).toBeTruthy();
	expect(ast.start).toEqual({ line: 11, column: 0, character: 113 });
	expect(ast.end).toEqual({ line: 11, column: 0, character: 113 });
});

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

it('Void Element', () => {
	const ast = astroParse('<img>Text<img>');
	if (ast instanceof AstroCompileError) {
		throw ast;
	}
	expect(ast.html?.children?.length).toBe(3);
});
