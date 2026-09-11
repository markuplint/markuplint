import { describe, test, expect } from 'vitest';

import ts from 'typescript';

import { collectImportBindings } from './analyze-jsx-imports.js';

function sourceFile(code: string) {
	return ts.createSourceFile('test.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

describe('collectImportBindings', () => {
	test('default import', () => {
		const bindings = collectImportBindings(sourceFile("import Item from './a';"));
		expect(bindings).toStrictEqual([
			{ localName: 'Item', importedName: 'default', source: './a', type: 'default' },
		]);
	});

	test('named import', () => {
		const bindings = collectImportBindings(sourceFile("import { Item } from './a';"));
		expect(bindings).toStrictEqual([{ localName: 'Item', importedName: 'Item', source: './a', type: 'named' }]);
	});

	test('named import with alias', () => {
		const bindings = collectImportBindings(sourceFile("import { Item as ListItem } from './a';"));
		expect(bindings).toStrictEqual([{ localName: 'ListItem', importedName: 'Item', source: './a', type: 'named' }]);
	});

	test('namespace import', () => {
		const bindings = collectImportBindings(sourceFile("import * as NS from './a';"));
		expect(bindings).toStrictEqual([{ localName: 'NS', importedName: '*', source: './a', type: 'namespace' }]);
	});

	test('default + named import', () => {
		const bindings = collectImportBindings(sourceFile("import Item, { Other } from './a';"));
		expect(bindings).toStrictEqual([
			{ localName: 'Item', importedName: 'default', source: './a', type: 'default' },
			{ localName: 'Other', importedName: 'Other', source: './a', type: 'named' },
		]);
	});

	test('type-only import declaration is skipped entirely', () => {
		const bindings = collectImportBindings(sourceFile("import type { Item } from './a';"));
		expect(bindings).toStrictEqual([]);
	});

	test('inline type-only named specifier is skipped, siblings are kept', () => {
		const bindings = collectImportBindings(sourceFile("import { type Item, Other } from './a';"));
		expect(bindings).toStrictEqual([{ localName: 'Other', importedName: 'Other', source: './a', type: 'named' }]);
	});

	test('side-effect import contributes no bindings', () => {
		const bindings = collectImportBindings(sourceFile("import './a';"));
		expect(bindings).toStrictEqual([]);
	});

	test('extracts imports correctly even when the file also contains JSX syntax', () => {
		// Regression guard: es-module-lexer (used elsewhere in this package) fails to
		// parse TSX source containing JSX syntax; this AST-based extractor must not.
		const bindings = collectImportBindings(
			sourceFile("import { Item } from './a';\nexport const A = () => <Item>x</Item>;"),
		);
		expect(bindings).toStrictEqual([{ localName: 'Item', importedName: 'Item', source: './a', type: 'named' }]);
	});

	test('multiple import declarations are all collected', () => {
		const bindings = collectImportBindings(sourceFile("import A from './a';\nimport { B } from './b';"));
		expect(bindings).toStrictEqual([
			{ localName: 'A', importedName: 'default', source: './a', type: 'default' },
			{ localName: 'B', importedName: 'B', source: './b', type: 'named' },
		]);
	});
});
