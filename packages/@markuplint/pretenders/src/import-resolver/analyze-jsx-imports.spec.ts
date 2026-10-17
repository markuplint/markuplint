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
			// Behavior change: the binding is named after the variable `lazy()` is assigned to
			expect(bindings).toStrictEqual([
				{ localName: 'Item', importedName: 'default', source: './Item', type: 'dynamic' },
			]);
			// expect(bindings).toStrictEqual([{ localName: '*', importedName: '*', source: './Item', type: 'dynamic' }]); // previous
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
			// Behavior change: the binding is named after the variable, and imports the export `.then` reads
			expect(bindings).toStrictEqual([{ localName: 'A', importedName: 'A', source: './a', type: 'dynamic' }]);
			// expect(bindings).toStrictEqual([{ localName: '*', importedName: '*', source: './a', type: 'dynamic' }]); // previous
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
				// Behavior change: the binding is named after the variable `lazy()` is assigned to
				{ localName: 'L', importedName: 'default', source: './Item', type: 'dynamic' },
				// { localName: '*', importedName: '*', source: './Item', type: 'dynamic' }, // previous
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
				// Behavior change: the binding is named after the variable `lazy()` is assigned to
				{ localName: 'B', importedName: 'default', source: './b', type: 'dynamic' },
				// { localName: '*', importedName: '*', source: './b', type: 'dynamic' }, // previous
				{ localName: 'C', importedName: 'C', source: './c', type: 'named' },
			]);
		});
	});

	describe('the name of a dynamic import', () => {
		const named = (localName: string, importedName = 'default') => ({
			localName,
			importedName,
			source: './a',
			type: 'dynamic',
		});
		const unnamed = { localName: '*', importedName: '*', source: './a', type: 'dynamic' };

		test.each([
			['`React.lazy`', "const A = React.lazy(() => import('./a'));"],
			['any wrapper call, judged by its shape', "const A = dynamic(() => import('./a'));"],
			['an `async` arrow', "const A = lazy(async () => import('./a'));"],
			['a parenthesized import', "const A = lazy(() => (import('./a')));"],
			['a function expression', "const A = lazy(function () { return import('./a'); });"],
			['an arrow with a block body', "const A = lazy(() => { return import('./a'); });"],
			['a loader of an options object', "const A = defineAsyncComponent({ loader: () => import('./a') });"],
			['an argument after the loader', "const A = lazy(() => import('./a'), []);"],
			['an awaited import', "const A = lazy(async () => await import('./a'));"],
			['a type assertion on the import', "const A = lazy(() => import('./a') as Promise<never>);"],
			['a non-null assertion on the import', "const A = lazy(() => import('./a')!);"],
			['a type assertion on the wrapper call', "const A = lazy(() => import('./a')) as Component;"],
			['`satisfies` on the import', "const A = lazy(() => import('./a') satisfies Promise<never>);"],
			[
				'a loader option next to others',
				"const A = defineAsyncComponent({ delay: 200, loader: () => import('./a') });",
			],
			// Limitation: the wrapper is judged by its shape, so any call that takes the loader first names it.
			// It matters only when the variable is also rendered as a tag.
			['a call that is not a lazy wrapper (shape only)', "const A = useMemo(() => import('./a'), []);"],
		])('is the variable assigned to, for %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code))).toStrictEqual([named('A')]);
		});

		test('is the variable assigned to, in a function body too', () => {
			const bindings = collectImportBindings(
				sourceFile("function f() {\n\tconst A = lazy(() => import('./a'));\n}"),
			);
			expect(bindings).toStrictEqual([named('A')]);
		});

		test.each([
			['`.then(m => ({ default: m.B }))`', "const A = lazy(() => import('./a').then(m => ({ default: m.B })));"],
			['`.then(m => m.B)`', "const A = lazy(() => import('./a').then(m => m.B));"],
			[
				'`.then` with a block body',
				"const A = lazy(() => import('./a').then(m => { return { default: m.B }; }));",
			],
			[
				'`.then` with a function expression',
				"const A = lazy(() => import('./a').then(function (m) { return m.B; }));",
			],
		])('is the export `.then` reads, for %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code))).toStrictEqual([named('A', 'B')]);
		});

		test('is the export `.then` reads, with a loader option', () => {
			const bindings = collectImportBindings(
				sourceFile("const A = defineAsyncComponent({ loader: () => import('./a').then(m => m.B) });"),
			);
			expect(bindings).toStrictEqual([named('A', 'B')]);
		});

		test('is the string-literal key of a component registered in a `components` option', () => {
			const bindings = collectImportBindings(
				sourceFile("export default { components: { 'Item': defineAsyncComponent(() => import('./a')) } };"),
			);
			expect(bindings).toStrictEqual([named('Item')]);
		});

		test('is the key of a component registered in a `components` option', () => {
			const bindings = collectImportBindings(
				sourceFile("export default { components: { Item: defineAsyncComponent(() => import('./a')) } };"),
			);
			expect(bindings).toStrictEqual([named('Item')]);
		});

		test.each([
			['an `export default`', "export default lazy(() => import('./a'));"],
			['a bare import', "const A = import('./a');"],
			['a destructuring declaration', "const { A } = lazy(() => import('./a'));"],
			['an object property that is not `components`', "const o = { A: lazy(() => import('./a')) };"],
			['a wrapper inside another call', "const A = memo(lazy(() => import('./a')));"],
			[
				'a loader that does more than return the import',
				"const A = lazy(() => { init(); return import('./a'); });",
			],
			['a loader that is not the first argument', "const A = lazy(false, () => import('./a'));"],
			[
				'a `.then` that destructures the module',
				"const A = lazy(() => import('./a').then(({ B }) => ({ default: B })));",
			],
			['a `.then` that reads a computed member', "const A = lazy(() => import('./a').then(m => m['B']));"],
			[
				'a `.then` with a default that is not a member',
				"const A = lazy(() => import('./a').then(m => ({ default: B })));",
			],
			['a `.then` that returns the module as it is', "const A = lazy(() => import('./a').then(m => m));"],
			['a call whose result is used, not returned', "const A = lazy(() => (use(import('./a')), null));"],
			[
				'a loader that is a shorthand method',
				"const A = defineAsyncComponent({ loader() { return import('./a'); } });",
			],
			[
				'a `.then` that reads two things',
				"const A = lazy(() => import('./a').then(m => ({ default: m.B, other: 1 })));",
			],
			['a `.then` callback with two parameters', "const A = lazy(() => import('./a').then((m, n) => m.B));"],
			['a `.then` without a callback', "const A = lazy(() => import('./a').then());"],
			['a `.then` followed by a `.catch`', "const A = lazy(() => import('./a').then(m => m.B).catch(fallback));"],
			[
				'a loader that reads the module in a statement',
				"const A = lazy(async () => { const m = await import('./a'); return m.default; });",
			],
		])('is none for %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code))).toStrictEqual([unnamed]);
		});
	});
});
