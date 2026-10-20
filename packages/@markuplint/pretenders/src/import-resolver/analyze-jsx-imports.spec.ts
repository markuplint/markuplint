import { describe, test, expect } from 'vitest';

import ts from 'typescript';

import { collectImportBindings, scriptKindForJsxLang } from './analyze-jsx-imports.js';

function sourceFile(code: string) {
	return ts.createSourceFile('test.tsx', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

describe('scriptKindForJsxLang', () => {
	test.each([
		['tsx', ts.ScriptKind.TSX],
		['TSX', ts.ScriptKind.TSX],
		['jsx', ts.ScriptKind.JSX],
		['Jsx', ts.ScriptKind.JSX],
		['ts', null],
		['js', null],
		['', null],
		[undefined, null],
	])('lang %j is the script kind %j', (lang, kind) => {
		expect(scriptKindForJsxLang(lang)).toBe(kind);
	});
});

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
			// Behavior change: the whole module read into a variable is bound as a namespace under that variable
			expect(bindings).toStrictEqual([
				{ localName: 'm', importedName: '*', source: './Item', type: 'namespace' },
			]);
			// expect(bindings).toStrictEqual([{ localName: '*', importedName: '*', source: './Item', type: 'dynamic' }]); // previous
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
			// Behavior change: the call is judged by its name, so a known loader other than `lazy` is named
			// ['any wrapper call, judged by its shape', "const A = dynamic(() => import('./a'));"], // previous
			['a known loader, `dynamic`', "const A = dynamic(() => import('./a'));"],
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
			// Behavior change: only a known loader names the import, so `useMemo` does not
			// ['a call that is not a lazy wrapper (shape only)', "const A = useMemo(() => import('./a'), []);"], // previous
			// Behavior change: a wrapper inside another call is named after the variable the outer call is assigned to
			['a wrapper inside another call', "const A = memo(lazy(() => import('./a')));"],
			// Behavior change: a `.then` that returns the module as it is reads the default export
			['a `.then` that returns the module as it is', "const A = lazy(() => import('./a').then(m => m));"],
			// Behavior change: a loader that reads the module in a statement is read as a `.then` is
			[
				'a loader that reads the module in a statement',
				"const A = lazy(async () => { const m = await import('./a'); return m.default; });",
			],
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

		// Behavior change: a `.then` that destructures the module reads the destructured export
		test('is the export `.then` reads, for a destructured parameter', () => {
			const bindings = collectImportBindings(
				sourceFile("const A = lazy(() => import('./a').then(({ B }) => ({ default: B })));"),
			);
			expect(bindings).toStrictEqual([named('A', 'B')]);
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
			// Behavior change: a wrapper inside another call is named after the variable the outer call is assigned to
			// ['a wrapper inside another call', "const A = memo(lazy(() => import('./a')));"], // previous
			[
				'a loader that does more than return the import',
				"const A = lazy(() => { init(); return import('./a'); });",
			],
			['a loader that is not the first argument', "const A = lazy(false, () => import('./a'));"],
			// Behavior change: a `.then` that destructures the module reads the destructured export
			// [
			// 	'a `.then` that destructures the module',
			// 	"const A = lazy(() => import('./a').then(({ B }) => ({ default: B })));",
			// ], // previous
			['a `.then` that reads a computed member', "const A = lazy(() => import('./a').then(m => m['B']));"],
			[
				'a `.then` with a default that is not a member',
				"const A = lazy(() => import('./a').then(m => ({ default: B })));",
			],
			// Behavior change: a `.then` that returns the module as it is reads the default export
			// ['a `.then` that returns the module as it is', "const A = lazy(() => import('./a').then(m => m));"], // previous
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
			// Behavior change: a loader that reads the module in a statement is read as a `.then` is
			// [
			// 	'a loader that reads the module in a statement',
			// 	"const A = lazy(async () => { const m = await import('./a'); return m.default; });",
			// ], // previous
			// Behavior change: only a known loader names the import, so `useMemo` does not
			['a call that is not a loader', "const A = useMemo(() => import('./a'), []);"],
		])('is none for %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code))).toStrictEqual([unnamed]);
		});

		test.each([
			[
				'`lazy` imported under another name',
				"import { lazy as l } from 'react';\nconst A = l(() => import('./a'));",
			],
			[
				'`dynamic` of Next.js under any name',
				"import load from 'next/dynamic';\nconst A = load(() => import('./a'));",
			],
			['`loadable` under any name', "import l from '@loadable/component';\nconst A = l(() => import('./a'));"],
		])('is the default export, for %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code))).toContainEqual(named('A'));
		});

		test('is the default export, for a loader the file declares a variable of the same name for', () => {
			const bindings = collectImportBindings(
				sourceFile("const lazy = React.lazy;\nconst A = lazy(() => import('./a'));"),
			);
			expect(bindings).toStrictEqual([named('A')]);
		});

		test('is none for a default import of another module under any name', () => {
			const bindings = collectImportBindings(
				sourceFile("import load from './load';\nconst A = load(() => import('./a'));"),
			);
			expect(bindings).toContainEqual(unnamed);
		});

		test.each([
			['`loadable`', "const A = loadable(() => import('./a'));"],
			['a wrapper inside two calls', "const A = memo(memo(lazy(() => import('./a'))));"],
			['a wrapper inside a call with more arguments', "const A = memo(lazy(() => import('./a')), areEqual);"],
			['a wrapper inside a call and a type assertion', "const A = memo(lazy(() => import('./a'))) as Component;"],
			['an import passed through a call', "const A = lazy(() => delayForDemo(import('./a')));"],
			[
				'an import passed through a call, in a block body',
				"const A = lazy(() => { return delayForDemo(import('./a')); });",
			],
			['an import passed through two calls', "const A = lazy(() => wait(delayForDemo(import('./a'))));"],
			['an import passed through a call with more arguments', "const A = lazy(() => delay(import('./a'), 300));"],
			[
				'a loader that returns the module it awaited',
				"const A = lazy(async () => { const m = await import('./a'); return m; });",
			],
			[
				'a loader that returns the module it awaited with a type assertion',
				"const A = lazy(async () => { const m = (await import('./a')) as Mod; return m; });",
			],
			[
				'a `.then` that returns the destructured default',
				"const A = lazy(() => import('./a').then(({ default: C }) => C));",
			],
			['`Loadable` of react-loadable', "const A = Loadable({ loader: () => import('./a'), loading: Spinner });"],
			['a call that holds the wrapper, not `memo`', "const A = forwardRef(lazy(() => import('./a')));"],
			['a `.then` that reads `default`', "const A = lazy(() => import('./a').then(m => m.default));"],
			[
				'a loader that returns the awaited module',
				"const A = lazy(async () => { const m = await import('./a'); return await m; });",
			],
			['an import passed through `Promise.resolve`', "const A = lazy(() => Promise.resolve(import('./a')));"],
			['a member call ending in a loader name', "const A = router.dynamic(() => import('./a'));"],
			[
				'a `.then` that destructures the default',
				"const A = lazy(() => import('./a').then(({ default: C }) => ({ default: C })));",
			],
		])('is the default export, for %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code))).toStrictEqual([named('A')]);
		});

		test.each([
			['a `.then` that destructures the export', "const A = lazy(() => import('./a').then(({ B }) => B));"],
			[
				'a `.then` that destructures and renames the export',
				"const A = lazy(() => import('./a').then(({ B: C }) => ({ default: C })));",
			],
			[
				'a loader that returns one export of the module it awaited',
				"const A = lazy(async () => { const m = await import('./a'); return m.B; });",
			],
			[
				'a loader that returns one export as the default',
				"const A = lazy(async () => { const m = await import('./a'); return { default: m.B }; });",
			],
			[
				'a loader that destructures the module it awaited',
				"const A = lazy(async () => { const { B } = await import('./a'); return { default: B }; });",
			],
			[
				'a loader that destructures and renames the export',
				"const A = lazy(async () => { const { B: C } = await import('./a'); return C; });",
			],
		])('is the export the loader reads, for %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code))).toStrictEqual([named('A', 'B')]);
		});

		test.each([
			['`useCallback`', "const A = useCallback(() => import('./a'), []);"],
			[
				'a function the file declares under a loader name',
				"function dynamic(load) { return load(); }\nconst A = dynamic(() => import('./a'));",
			],
			[
				'a function the file declares under a loader name, after its call',
				"const A = lazy(() => import('./a'));\nfunction lazy(load) { return load(); }",
			],
			[
				'a type-only import of a loader',
				"import type { lazy as l } from 'react';\nconst A = l(() => import('./a'));",
			],
			[
				'an inline type-only import of a loader',
				"import { type lazy as l } from 'react';\nconst A = l(() => import('./a'));",
			],
			[
				'a wrapper that is not the first argument of the outer call',
				"const A = foo(0, lazy(() => import('./a')));",
			],
			[
				'a loader whose statement declares two variables',
				"const A = lazy(async () => { const m = await import('./a'), n = 1; return m; });",
			],
			[
				'a loader whose statement is a `let`',
				"const A = lazy(async () => { let m = await import('./a'); return m; });",
			],
			['a project’s own helper', "const A = lazyWithRetry(() => import('./a'));"],
			['a loader that comes after the import in a call', "const A = lazy(() => delayForDemo(0, import('./a')));"],
			[
				'a loader with a statement before the import',
				"const A = lazy(async () => { init(); const m = await import('./a'); return m; });",
			],
			[
				'a loader that uses the module in another statement',
				"const A = lazy(async () => { const m = await import('./a'); log(m); return m; });",
			],
			[
				'a loader that returns something else than the module',
				"const A = lazy(async () => { const m = await import('./a'); return other; });",
			],
			['a loader that returns nothing', "const A = lazy(async () => { const m = await import('./a'); });"],
			[
				'a loader that returns the module with another key',
				"const A = lazy(async () => { const m = await import('./a'); return { default: m.B, other: 1 }; });",
			],
			[
				'a loader that destructures two exports',
				"const A = lazy(async () => { const { B, C } = await import('./a'); return B; });",
			],
			['a `.then` that destructures two exports', "const A = lazy(() => import('./a').then(({ B, C }) => B));"],
			['a `.then` that destructures a rest', "const A = lazy(() => import('./a').then(({ ...rest }) => rest));"],
			[
				'a `.then` that destructures a computed key',
				"const A = lazy(() => import('./a').then(({ [k]: C }) => C));",
			],
			[
				'a `.then` that destructures a nested pattern',
				"const A = lazy(() => import('./a').then(({ B: { C } }) => C));",
			],
			[
				'a `.then` that returns another name than the destructured one',
				"const A = lazy(() => import('./a').then(({ B }) => other));",
			],
		])('is none, for %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code))).toStrictEqual([unnamed]);
		});

		test.each([
			['the default export read by a property', "const A = (await import('./a')).default;", 'A', 'default'],
			['one export read by a property', "const A = (await import('./a')).B;", 'A', 'B'],
			['the default export destructured', "const { default: A } = await import('./a');", 'A', 'default'],
			['one export destructured and renamed', "const { B: A } = await import('./a');", 'A', 'B'],
			['one export destructured', "const { B } = await import('./a');", 'B', 'B'],
			['one export read by `.then`', "const A = await import('./a').then(m => m.B);", 'A', 'B'],
			[
				'a destructuring in a function body',
				"async function f() {\n\tconst { B: A } = await import('./a');\n}",
				'A',
				'B',
			],
			['a type assertion on the module', "const { B: A } = (await import('./a')) as Mod;", 'A', 'B'],
			['`.then` that returns `default`', "const A = await import('./a').then(m => m.default);", 'A', 'default'],
			['an optional chain on the module', "const A = (await import('./a'))?.default;", 'A', 'default'],
			['a non-null assertion on the export', "const A = (await import('./a')).default!;", 'A', 'default'],
			['a default value in the pattern', "const { B: A = X } = await import('./a');", 'A', 'B'],
		])('is the variable the awaited import is read into, for %s', (_, code, localName, importedName) => {
			expect(collectImportBindings(sourceFile(code))).toStrictEqual([named(localName, importedName)]);
		});

		test.each([
			// Behavior change: the whole module read into a variable is bound as a namespace
			// ['the whole module', "const A = await import('./a');"], // previous
			['two exports destructured', "const { B, C } = await import('./a');"],
			['a rest destructured', "const { ...rest } = await import('./a');"],
			['a nested pattern', "const { B: { C } } = await import('./a');"],
			['a computed key', "const { [k]: A } = await import('./a');"],
			['an import that is not awaited', "const { B } = import('./a');"],
			['an array pattern', "const [A] = await import('./a');"],
			['a computed property read', "const A = (await import('./a'))['B'];"],
			['a call on the module', "const A = (await import('./a')).B();"],
			// Behavior change: a `.then` that returns the module as it is gives a namespace
			// ['a `.then` that returns the module', "const A = await import('./a').then(m => m);"], // previous
			[
				'a `.then` that returns an object with a default',
				"const A = await import('./a').then(m => ({ default: m.B }));",
			],
			[
				'a `.then` that destructures into an object with a default',
				"const A = await import('./a').then(({ B }) => ({ default: B }));",
			],
			['a nullish fallback', "const A = (await import('./a')).default ?? X;"],
			['an assignment', "let A; A = (await import('./a')).default;"],
			['a member of the export', "const A = (await import('./a')).default.B;"],
		])('is none for an awaited import read into %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code))).toStrictEqual([unnamed]);
		});

		test('is the key of a component registered with a loader that reads the module in a statement', () => {
			const bindings = collectImportBindings(
				sourceFile(
					"export default { components: { A: defineAsyncComponent(async () => { const m = await import('./a'); return m; }) } };",
				),
			);
			expect(bindings).toStrictEqual([named('A')]);
		});

		test.each([
			['a member read of a loader', "const l = React.lazy;\nconst A = l(() => import('./a'));"],
			['a destructured loader', "const { lazy: l } = React;\nconst A = l(() => import('./a'));"],
			[
				'a destructured loader of `require`',
				"const { lazy: l } = require('react');\nconst A = l(() => import('./a'));",
			],
			['`require` of `next/dynamic`', "const d = require('next/dynamic');\nconst A = d(() => import('./a'));"],
			[
				'the `default` of `require` of `next/dynamic`',
				"const d = require('next/dynamic').default;\nconst A = d(() => import('./a'));",
			],
			[
				'the destructured `default` of `require` of `@loadable/component`',
				"const { default: d } = require('@loadable/component');\nconst A = d(() => import('./a'));",
			],
			[
				'an `import = require` of `next/dynamic`',
				"import d = require('next/dynamic');\nconst A = d(() => import('./a'));",
			],
			[
				'`Loadable` imported as the default of another module',
				"import Loadable from 'react-loadable';\nconst A = Loadable({ loader: () => import('./a') });",
			],
			[
				'`Loadable` that `require` gives',
				"const Loadable = require('react-loadable');\nconst A = Loadable({ loader: () => import('./a') });",
			],
			[
				'a loader name that is the default import of another module',
				"import lazy from 'other-lib';\nconst A = lazy(() => import('./a'));",
			],
			[
				'an `import = require` under a loader name',
				"import dynamic = require('./helper');\nconst A = dynamic(() => import('./a'));",
			],
			[
				'a `var` of a `namespace` body, which is not the scope of the call',
				"namespace N {\n\tvar lazy = 1;\n}\nconst A = lazy(() => import('./a'));",
			],
			['an alias of an alias', "const l2 = React.lazy;\nconst l = l2;\nconst A = l(() => import('./a'));"],
			[
				'an alias of an imported loader',
				"import { lazy } from 'react';\nconst l = lazy;\nconst A = l(() => import('./a'));",
			],
			['a `let` alias', "let l = React.lazy;\nconst A = l(() => import('./a'));"],
			['an alias with a type assertion', "const l = React.lazy as Loader;\nconst A = l(() => import('./a'));"],
			[
				'an alias declared in the function that calls it',
				"function f() {\n\tconst l = React.lazy;\n\tconst A = l(() => import('./a'));\n}",
			],
			[
				'an alias of the file read in a function',
				"const l = React.lazy;\nfunction f() {\n\tconst A = l(() => import('./a'));\n}",
			],
		])('is the variable assigned to, for a loader aliased by an assignment: %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code))).toContainEqual(named('A'));
		});

		test.each([
			['a variable that is not a loader', "const l = helper;\nconst A = l(() => import('./a'));"],
			['`require` of another module', "const l = require('./load');\nconst A = l(() => import('./a'));"],
			['a destructured name that is not a loader', "const { x: l } = React;\nconst A = l(() => import('./a'));"],
			[
				'an alias that a parameter shadows',
				"const l = React.lazy;\nfunction f(l) {\n\tconst A = l(() => import('./a'));\n}",
			],
			[
				'an alias that a variable of the function shadows',
				"const l = React.lazy;\nfunction f() {\n\tconst l = other;\n\tconst A = l(() => import('./a'));\n}",
			],
			['a loader name that a parameter shadows', "function f(lazy) {\n\tconst A = lazy(() => import('./a'));\n}"],
			[
				'a function declared under a loader name in a function',
				"function f() {\n\tfunction dynamic(load) { return load(); }\n\tconst A = dynamic(() => import('./a'));\n}",
			],
			[
				'a function written under a loader name',
				"const lazy = load => load();\nconst A = lazy(() => import('./a'));",
			],
			['aliases that lead to each other', "const a = b;\nconst b = a;\nconst A = a(() => import('./a'));"],
			[
				'a variable named after a loader that the result of a call initializes',
				"const dynamic = useDynamic();\nconst A = dynamic(() => import('./a'));",
			],
			[
				'a class expression named after a loader, in its own body',
				"const K = class lazy {\n\tm() {\n\t\tconst A = lazy(() => import('./a'));\n\t}\n};",
			],
			[
				'a `var` that is hoisted out of its block',
				"const l = React.lazy;\nfunction f() {\n\tif (c) {\n\t\tvar l = other;\n\t}\n\tconst A = l(() => import('./a'));\n}",
			],
			[
				'a `catch` variable named after a loader',
				"try {\n\tinit();\n} catch (lazy) {\n\tconst A = lazy(() => import('./a'));\n}",
			],
			[
				'a `for…of` variable named after a loader',
				"for (const dynamic of xs) {\n\tconst A = dynamic(() => import('./a'));\n}",
			],
			[
				'a `case` clause that declares the alias again',
				"const l = React.lazy;\nswitch (x) {\n\tcase 1:\n\t\tconst l = other;\n\t\tconst A = l(() => import('./a'));\n}",
			],
			[
				'a `namespace` that declares the alias again with `var`',
				"const l = React.lazy;\nnamespace N {\n\tvar l = other;\n\tconst A = l(() => import('./a'));\n}",
			],
			[
				'a `.then` that reads an export and has a rejection handler',
				"const A = lazy(() => import('./a').then(m => m.B, () => fallback));",
			],
			[
				'a `.then` that returns the module and has a rejection handler',
				"const UI = await import('./a').then(m => m, () => fallback);",
			],
		])('is none for %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code))).toStrictEqual([unnamed]);
		});

		test.each([
			['a `.then` that returns the module', "const UI = await import('./a').then(m => m);"],
			['the whole module', "const UI = await import('./a');"],
			['the whole module with a type assertion', "const UI = (await import('./a')) as Mod;"],
			['the whole module in parentheses', "const UI = (await import('./a'));"],
			['the whole module in a function body', "async function f() {\n\tconst UI = await import('./a');\n}"],
		])('is a namespace under the variable the awaited import is read into, for %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code))).toStrictEqual([
				{ localName: 'UI', importedName: '*', source: './a', type: 'namespace' },
			]);
		});

		test('is a namespace for an awaited import in the head of a `for` in the loader function', () => {
			const bindings = collectImportBindings(
				sourceFile("const A = lazy(async () => {\n\tfor (const m = await import('./a'); ; ) {}\n});"),
			);
			expect(bindings).toStrictEqual([{ localName: 'm', importedName: '*', source: './a', type: 'namespace' }]);
		});

		test('names the loader variable A as the export B, not the awaited import B as B', () => {
			const bindings = collectImportBindings(
				sourceFile(
					"const A = lazy(async () => { const { B } = await import('./a'); return { default: B }; });",
				),
			);
			expect(bindings).toStrictEqual([named('A', 'B')]);
		});
	});

	describe('the name of a dynamic import in a loader function that is held by a name', () => {
		const named = (localName: string, importedName = 'default') => ({
			localName,
			importedName,
			source: './a',
			type: 'dynamic',
		});
		const unnamed = { localName: '*', importedName: '*', source: './a', type: 'dynamic' };

		test.each([
			['a variable of an arrow', "const load = () => import('./a');\nconst A = lazy(load);"],
			[
				'a variable of a function expression',
				"const load = function () { return import('./a'); };\nconst A = lazy(load);",
			],
			['a variable of an `async` arrow', "const load = async () => import('./a');\nconst A = lazy(load);"],
			['a function declaration', "function load() { return import('./a'); }\nconst A = lazy(load);"],
			[
				'an `async` function declaration',
				"async function load() { return await import('./a'); }\nconst A = lazy(load);",
			],
			[
				'a variable used before it is declared by a function',
				"const A = lazy(load);\nfunction load() { return import('./a'); }",
			],
			[
				'a variable typed with an annotation',
				"const load: () => Promise<never> = () => import('./a');\nconst A = lazy(load);",
			],
			[
				'a loader of an options object',
				"const load = () => import('./a');\nconst A = defineAsyncComponent({ loader: load });",
			],
			['a loader inside another call', "const load = () => import('./a');\nconst A = memo(lazy(load));"],
			['a member loader', "const load = () => import('./a');\nconst A = React.lazy(load);"],
			['a variable in parentheses', "const load = () => import('./a');\nconst A = lazy((load));"],
			[
				'a reference in a function body',
				"const load = () => import('./a');\nfunction f() {\n\tconst A = lazy(load);\n}",
			],
			[
				'a variable that is an alias of another',
				"const load = () => import('./a');\nconst again = load;\nconst A = lazy(again);",
			],
			[
				'a loader that reads the module in a statement',
				"const load = async () => { const m = await import('./a'); return m.default; };\nconst A = lazy(load);",
			],
		])('is the variable assigned to, for %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code))).toStrictEqual([named('A')]);
		});

		test('is the key of a component registered in a `components` option', () => {
			const bindings = collectImportBindings(
				sourceFile(
					"const load = () => import('./a');\nexport default { components: { Item: defineAsyncComponent(load) } };",
				),
			);
			expect(bindings).toStrictEqual([named('Item')]);
		});

		test('is the export `.then` reads', () => {
			const bindings = collectImportBindings(
				sourceFile("const load = () => import('./a').then(m => m.B);\nconst A = lazy(load);"),
			);
			expect(bindings).toStrictEqual([named('A', 'B')]);
		});

		test('names the import once under each variable of the loader calls that take the function', () => {
			const bindings = collectImportBindings(
				sourceFile("const load = () => import('./a');\nconst A = lazy(load);\nconst B = lazy(load);"),
			);
			expect(bindings).toStrictEqual([named('A'), named('B')]);
		});

		test('names the import under the variable of a wrapped loader call too, for a function declaration', () => {
			const bindings = collectImportBindings(
				sourceFile(
					"function load() { return import('./a'); }\nconst A = lazy(load);\nconst B = memo(lazy(load));",
				),
			);
			expect(bindings).toStrictEqual([named('A'), named('B')]);
		});

		test('names the import under the call that takes the function, and leaves another use of it', () => {
			const bindings = collectImportBindings(
				sourceFile("const load = () => import('./a');\nconst A = lazy(load);\nconst p = load();"),
			);
			expect(bindings).toStrictEqual([named('A')]);
		});

		test.each([
			[
				'a `let` that is assigned another function',
				"let load = () => import('./a');\nload = () => import('./b');\nconst A = lazy(load);",
			],
			[
				'a `var` that is assigned with an operator',
				"var load = () => import('./a');\nload ||= () => import('./b');\nconst A = lazy(load);",
			],
			[
				'a function declaration that is assigned another function',
				"function load() { return import('./a'); }\nload = () => import('./b');\nconst A = lazy(load);",
			],
		])('names neither import for %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code)).map(b => [b.localName, b.source])).toStrictEqual([
				['*', './a'],
				['*', './b'],
			]);
		});

		test('names the import of a `let` that is declared with the function and never assigned again', () => {
			const bindings = collectImportBindings(
				sourceFile("let load = () => import('./a');\nconst A = lazy(load);\nconst other = 1;"),
			);
			expect(bindings).toStrictEqual([named('A')]);
		});

		test.each([
			['a call that is not a loader', "const load = () => import('./a');\nconst A = useMemo(load, []);"],
			['a function that is not taken by any call', "const load = () => import('./a');"],
			['a call of the function', "const load = () => import('./a');\nconst A = lazy(load());"],
			[
				'a call that is not the initializer of a variable',
				"const load = () => import('./a');\nrender(lazy(load));",
			],
			[
				'a function that is not the first argument',
				"const load = () => import('./a');\nconst A = lazy(false, load);",
			],
			[
				'a name that is assigned later (it is not followed)',
				"let load;\nload = () => import('./a');\nconst A = lazy(load);",
			],
			[
				'a function that does more than return the import',
				"const load = () => { init(); return import('./a'); };\nconst A = lazy(load);",
			],
			[
				'a name that a function of the same name declares inside',
				"const load = () => import('./a');\nfunction f(load) {\n\tconst A = lazy(load);\n}",
			],
			[
				'a name that a block of the same name declares inside',
				"const load = () => import('./a');\n{\n\tconst load = other;\n\tconst A = lazy(load);\n}",
			],
		])('is not named for %s', (_, code) => {
			expect(collectImportBindings(sourceFile(code))).toStrictEqual([unnamed]);
		});
	});
});
