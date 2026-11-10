import type { Node } from 'typescript/ast';

import { SyntaxKind } from 'typescript/ast';
import { describe, expect, test } from 'vitest';

import { parseSource } from './ts-api.js';
import { forEachChild, isClassLike, isFunctionLike, isTypeOnlyImportClause } from './ts-ast.js';

/** The first node of the source, in a walk of the tree, that `predicate` accepts. */
function find(source: string, predicate: (node: Node) => boolean, fileName = 'a.ts'): Node | undefined {
	const walk = (node: Node): Node | undefined => (predicate(node) ? node : forEachChild(node, walk));
	return walk(parseSource(fileName, source));
}

const named = (kind: SyntaxKind) => (node: Node) => node.kind === kind;

describe('isFunctionLike', () => {
	test.each([
		['a function declaration', 'function f(a) {}'],
		['a function expression', 'const f = function (a) {};'],
		['an arrow function', 'const f = (a) => a;'],
		['a method', 'class C { m(a) {} }'],
		['a constructor', 'class C { constructor(a) {} }'],
		['a getter', 'class C { get g() { return 1; } }'],
		['a setter', 'class C { set s(a) {} }'],
		['a method signature', 'interface I { m(a): void }'],
		['a call signature', 'interface I { (a): void }'],
		['a construct signature', 'interface I { new (a): I }'],
		['an index signature', 'interface I { [key: string]: number }'],
		['a function type', 'type F = (a) => void;'],
		['a constructor type', 'type C = new (a) => object;'],
	])('accepts %s', (_, source) => {
		const node = find(source, isFunctionLike);
		expect(node).toBeDefined();
		expect(node && 'parameters' in node).toBe(true);
	});

	test.each([
		['a class', 'class C {}'],
		['an object literal', 'const o = { a: 1 };'],
		['a call', 'f(a);'],
		['a variable declaration', 'const a = 1;'],
	])('does not accept %s', (_, source) => {
		expect(find(source, isFunctionLike)).toBeUndefined();
	});
});

describe('isClassLike', () => {
	test('accepts a class declaration and a class expression', () => {
		expect(find('class C {}', isClassLike)?.kind).toBe(SyntaxKind.ClassDeclaration);
		expect(find('const C = class {};', isClassLike)?.kind).toBe(SyntaxKind.ClassExpression);
	});

	test.each([
		['an interface', 'interface I {}'],
		['a function', 'function f() {}'],
	])('does not accept %s', (_, source) => {
		expect(find(source, isClassLike)).toBeUndefined();
	});
});

describe('isTypeOnlyImportClause', () => {
	const clauseOf = (source: string) => {
		const declaration = find(source, named(SyntaxKind.ImportDeclaration));
		return declaration && 'importClause' in declaration
			? (declaration.importClause as Parameters<typeof isTypeOnlyImportClause>[0])
			: undefined;
	};

	test.each([
		['import type X from', "import type X from './x';", true],
		['import type { X } from', "import type { X } from './x';", true],
		['import type * as X from', "import type * as X from './x';", true],
		['import X from', "import X from './x';", false],
		['import { type X } from (the specifier is type-only, not the clause)', "import { type X } from './x';", false],
		['import defer * as X from', "import defer * as X from './x';", false],
		['import source X from', "import source X from './x';", false],
	])('%s', (_, source, expected) => {
		expect(isTypeOnlyImportClause(clauseOf(source))).toBe(expected);
	});

	test('a side-effect import has no clause', () => {
		expect(isTypeOnlyImportClause(clauseOf("import './x';"))).toBe(false);
	});
});

describe('forEachChild', () => {
	test('stops at the first child for which the callback returns a value', () => {
		const sourceFile = parseSource('a.ts', 'const a = 1; const b = 2; const c = 3;');
		const visited: string[] = [];
		const result = forEachChild(sourceFile, child => {
			visited.push(child.getText(sourceFile));
			return visited.length === 2 ? child : undefined;
		});
		expect(result?.getText(sourceFile)).toBe('const b = 2;');
		expect(visited).toStrictEqual(['const a = 1;', 'const b = 2;']);
	});

	test('returns undefined when every child was visited', () => {
		const sourceFile = parseSource('a.ts', 'const a = 1;');
		expect(forEachChild(sourceFile, () => {})).toBeUndefined();
	});
});
