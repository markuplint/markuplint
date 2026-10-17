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

	describe('dynamic imports', () => {
		test('a string literal specifier inside `lazy(() => import(...))` is a dynamic binding', () => {
			const bindings = collectImportBindings(
				sourceFile("const Item = lazy(() => import('./Item'));\nexport const W = () => <Item />;"),
			);
			expect(bindings).toStrictEqual([{ localName: '*', importedName: '*', source: './Item', type: 'dynamic' }]);
		});

		test('a dynamic import nested in a function body is collected', () => {
			const bindings = collectImportBindings(
				sourceFile('export async function load() {\n\tconst m = await import("./Item");\n\treturn m;\n}'),
			);
			expect(bindings).toStrictEqual([{ localName: '*', importedName: '*', source: './Item', type: 'dynamic' }]);
		});

		test('a template literal specifier is excluded', () => {
			const bindings = collectImportBindings(sourceFile('const A = lazy(() => import(`./${name}`));'));
			expect(bindings).toStrictEqual([]);
		});

		test('a template literal specifier without substitutions is excluded, as for Vue', () => {
			const bindings = collectImportBindings(sourceFile('const A = lazy(() => import(`./Item`));'));
			expect(bindings).toStrictEqual([]);
		});

		test('an `import(...).then(...)` chain is collected through the inner call', () => {
			const bindings = collectImportBindings(
				sourceFile("const A = lazy(() => import('./a').then(m => ({ default: m.A })));"),
			);
			expect(bindings).toStrictEqual([{ localName: '*', importedName: '*', source: './a', type: 'dynamic' }]);
		});

		test('a dynamic import inside a class method is collected', () => {
			const bindings = collectImportBindings(
				sourceFile("class Loader {\n\tload() {\n\t\treturn import('./a');\n\t}\n}"),
			);
			expect(bindings).toStrictEqual([{ localName: '*', importedName: '*', source: './a', type: 'dynamic' }]);
		});

		test('a dynamic import with an import attributes argument is collected', () => {
			const bindings = collectImportBindings(
				sourceFile("const A = import('./a.json', { with: { type: 'json' } });"),
			);
			expect(bindings).toStrictEqual([
				{ localName: '*', importedName: '*', source: './a.json', type: 'dynamic' },
			]);
		});

		test('the same specifier imported twice yields one binding per call', () => {
			const bindings = collectImportBindings(sourceFile("const A = import('./a');\nconst B = import('./a');"));
			expect(bindings).toStrictEqual([
				{ localName: '*', importedName: '*', source: './a', type: 'dynamic' },
				{ localName: '*', importedName: '*', source: './a', type: 'dynamic' },
			]);
		});

		test('a static binding of the same name is kept next to the dynamic one', () => {
			const bindings = collectImportBindings(
				sourceFile("import { Item } from './x';\nconst L = lazy(() => import('./Item'));"),
			);
			expect(bindings).toStrictEqual([
				{ localName: 'Item', importedName: 'Item', source: './x', type: 'named' },
				{ localName: '*', importedName: '*', source: './Item', type: 'dynamic' },
			]);
		});

		test('a dynamic import in a JSX attribute expression is collected', () => {
			const bindings = collectImportBindings(
				sourceFile("export const A = () => <Suspense fallback={import('./Spinner')}>x</Suspense>;"),
			);
			expect(bindings).toStrictEqual([
				{ localName: '*', importedName: '*', source: './Spinner', type: 'dynamic' },
			]);
		});

		test('a dynamic import in an `export default` expression is collected', () => {
			const bindings = collectImportBindings(sourceFile("export default lazy(() => import('./Item'));"));
			expect(bindings).toStrictEqual([{ localName: '*', importedName: '*', source: './Item', type: 'dynamic' }]);
		});

		test('an `import()` without a string literal argument is excluded', () => {
			expect(collectImportBindings(sourceFile('const A = import();'))).toStrictEqual([]);
			expect(collectImportBindings(sourceFile('const A = import(1);'))).toStrictEqual([]);
		});

		test('a variable specifier is excluded', () => {
			const bindings = collectImportBindings(sourceFile('const A = lazy(() => import(path));'));
			expect(bindings).toStrictEqual([]);
		});

		test('a concatenated specifier is excluded', () => {
			const bindings = collectImportBindings(sourceFile("const A = lazy(() => import('./' + name));"));
			expect(bindings).toStrictEqual([]);
		});

		test('a type-position `typeof import()` is excluded', () => {
			const bindings = collectImportBindings(sourceFile("type T = typeof import('./a');"));
			expect(bindings).toStrictEqual([]);
		});

		test('`import.meta` is excluded', () => {
			const bindings = collectImportBindings(sourceFile('const url = import.meta.url;'));
			expect(bindings).toStrictEqual([]);
		});

		test('static and dynamic imports are collected in source order', () => {
			const bindings = collectImportBindings(
				sourceFile("import A from './a';\nconst B = lazy(() => import('./b'));\nimport { C } from './c';"),
			);
			expect(bindings).toStrictEqual([
				{ localName: 'A', importedName: 'default', source: './a', type: 'default' },
				{ localName: '*', importedName: '*', source: './b', type: 'dynamic' },
				{ localName: 'C', importedName: 'C', source: './c', type: 'named' },
			]);
		});
	});
});
