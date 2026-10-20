import { describe, test, expect } from 'vitest';

import ts from 'typescript';

import { parseImports } from './parse-imports.js';

describe('parseImports', () => {
	describe('default imports', () => {
		test('basic default import', async () => {
			const result = await parseImports("import Button from './Button.vue'");
			expect(result).toStrictEqual([
				{
					localName: 'Button',
					importedName: 'default',
					source: './Button.vue',
					type: 'default',
				},
			]);
		});

		test('default import with different local name', async () => {
			const result = await parseImports("import MyBtn from '../components/Button.vue'");
			expect(result).toStrictEqual([
				{
					localName: 'MyBtn',
					importedName: 'default',
					source: '../components/Button.vue',
					type: 'default',
				},
			]);
		});
	});

	describe('named imports', () => {
		test('single named import', async () => {
			const result = await parseImports("import { Button } from './components'");
			expect(result).toStrictEqual([
				{
					localName: 'Button',
					importedName: 'Button',
					source: './components',
					type: 'named',
				},
			]);
		});

		test('multiple named imports', async () => {
			const result = await parseImports("import { Button, Card, Input } from './components'");
			expect(result).toHaveLength(3);
			expect(result[0]).toStrictEqual({
				localName: 'Button',
				importedName: 'Button',
				source: './components',
				type: 'named',
			});
			expect(result[1]).toStrictEqual({
				localName: 'Card',
				importedName: 'Card',
				source: './components',
				type: 'named',
			});
			expect(result[2]).toStrictEqual({
				localName: 'Input',
				importedName: 'Input',
				source: './components',
				type: 'named',
			});
		});

		test('named import with alias', async () => {
			const result = await parseImports("import { Button as MyButton } from './components'");
			expect(result).toStrictEqual([
				{
					localName: 'MyButton',
					importedName: 'Button',
					source: './components',
					type: 'named',
				},
			]);
		});

		test('mixed named imports with and without aliases', async () => {
			const result = await parseImports("import { Button, Card as MyCard } from './ui'");
			expect(result).toHaveLength(2);
			expect(result[0]).toStrictEqual({
				localName: 'Button',
				importedName: 'Button',
				source: './ui',
				type: 'named',
			});
			expect(result[1]).toStrictEqual({
				localName: 'MyCard',
				importedName: 'Card',
				source: './ui',
				type: 'named',
			});
		});
	});

	describe('namespace imports', () => {
		test('namespace import', async () => {
			const result = await parseImports("import * as Icons from './icons'");
			expect(result).toStrictEqual([
				{
					localName: 'Icons',
					importedName: '*',
					source: './icons',
					type: 'namespace',
				},
			]);
		});
	});

	describe('combined imports', () => {
		test('default + named imports', async () => {
			const result = await parseImports("import Button, { Card } from './components'");
			expect(result).toHaveLength(2);
			expect(result[0]).toStrictEqual({
				localName: 'Button',
				importedName: 'default',
				source: './components',
				type: 'default',
			});
			expect(result[1]).toStrictEqual({
				localName: 'Card',
				importedName: 'Card',
				source: './components',
				type: 'named',
			});
		});

		test('default + namespace imports', async () => {
			const result = await parseImports("import React, * as ReactAll from 'react'");
			expect(result).toHaveLength(2);
			expect(result[0]).toStrictEqual({
				localName: 'React',
				importedName: 'default',
				source: 'react',
				type: 'default',
			});
			expect(result[1]).toStrictEqual({
				localName: 'ReactAll',
				importedName: '*',
				source: 'react',
				type: 'namespace',
			});
		});
	});

	describe('multiple import statements', () => {
		test('multiple imports from different sources', async () => {
			const source = [
				"import Button from './Button.vue'",
				"import { ref, computed } from 'vue'",
				"import * as utils from './utils'",
			].join('\n');
			const result = await parseImports(source);
			expect(result).toHaveLength(4);
			expect(result[0]).toMatchObject({ localName: 'Button', source: './Button.vue' });
			expect(result[1]).toMatchObject({ localName: 'ref', source: 'vue' });
			expect(result[2]).toMatchObject({ localName: 'computed', source: 'vue' });
			expect(result[3]).toMatchObject({ localName: 'utils', source: './utils' });
		});
	});

	describe('side-effect imports', () => {
		test('side-effect import produces no bindings', async () => {
			const result = await parseImports("import './styles.css'");
			expect(result).toStrictEqual([]);
		});
	});

	describe('dynamic imports', () => {
		test('dynamic import with string literal is resolved', async () => {
			const source = ["import Button from './Button.vue'", "const Lazy = import('./Lazy.vue')"].join('\n');
			const result = await parseImports(source);
			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({ localName: 'Button' });
			expect(result[1]).toStrictEqual({
				localName: '*',
				importedName: '*',
				source: './Lazy.vue',
				type: 'dynamic',
			});
		});

		test('dynamic import with double-quoted string literal', async () => {
			const source = 'const Lazy = import("./Lazy.vue")';
			const result = await parseImports(source);
			expect(result).toHaveLength(1);
			expect(result[0]).toStrictEqual({
				localName: '*',
				importedName: '*',
				source: './Lazy.vue',
				type: 'dynamic',
			});
		});

		test('import.meta is still ignored', async () => {
			const source = ["import Button from './B.vue'", 'const url = import.meta.env.BASE_URL'].join('\n');
			const result = await parseImports(source);
			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({ localName: 'Button' });
		});

		test('dynamic import with template literal is excluded', async () => {
			const source = 'const Lazy = import(`./components/${name}.vue`)';
			const result = await parseImports(source);
			expect(result).toStrictEqual([]);
		});

		test('dynamic import whose whole argument is a template literal is excluded even when the glob looks like a path', async () => {
			const source = 'const Lazy = import(`./Lazy${suffix}.vue`)';
			const result = await parseImports(source);
			expect(result).toStrictEqual([]);
		});

		test('type-position dynamic import is excluded', async () => {
			const source = ["import Button from './Button.vue'", "type Heavy = typeof import('./Heavy.vue')"].join(
				'\n',
			);
			const result = await parseImports(source);
			expect(result).toStrictEqual([
				{ localName: 'Button', importedName: 'default', source: './Button.vue', type: 'default' },
			]);
		});

		test('dynamic import used only through a member access in a type is excluded', async () => {
			const source = ["import Button from './Button.vue'", "type Heavy = import('./Heavy.vue').Props"].join('\n');
			const result = await parseImports(source);
			expect(result).toStrictEqual([
				{ localName: 'Button', importedName: 'default', source: './Button.vue', type: 'default' },
			]);
		});

		test('dynamic import with concatenated specifier is excluded', async () => {
			const source = "const Lazy = import('./components/' + name + '.vue')";
			const result = await parseImports(source);
			expect(result).toStrictEqual([]);
		});

		test('export-star re-export produces no bindings', async () => {
			const source = ["import Button from './Button.vue'", "export * from './utils'"].join('\n');
			const result = await parseImports(source);
			expect(result).toStrictEqual([
				{ localName: 'Button', importedName: 'default', source: './Button.vue', type: 'default' },
			]);
		});

		test('a dynamic import assigned by `defineAsyncComponent` is named after the variable', async () => {
			const source = [
				"import { defineAsyncComponent } from 'vue'",
				"const Item = defineAsyncComponent(() => import('./Item.vue'))",
				"const Other = defineAsyncComponent({ loader: () => import('./Other.vue'), delay: 200 })",
				"const bare = import('./Bare.vue')",
			].join('\n');
			const result = await parseImports(source);
			expect(result.slice(1)).toStrictEqual([
				{ localName: 'Item', importedName: 'default', source: './Item.vue', type: 'dynamic' },
				{ localName: 'Other', importedName: 'default', source: './Other.vue', type: 'dynamic' },
				{ localName: '*', importedName: '*', source: './Bare.vue', type: 'dynamic' },
			]);
		});

		test('a `.then` that reads one export names the binding after that export', async () => {
			const source = "const Item = defineAsyncComponent(() => import('./Item.vue').then(m => m.Named))";
			expect(await parseImports(source)).toStrictEqual([
				{ localName: 'Item', importedName: 'Named', source: './Item.vue', type: 'dynamic' },
			]);
		});

		test('an awaited import destructured into a variable names the binding after the export', async () => {
			const source = [
				"const { default: Item } = await import('./Item.vue')",
				"const { Named: Other } = await import('./Other.vue')",
				"const Whole = await import('./Whole.vue')",
			].join('\n');
			expect(await parseImports(source)).toStrictEqual([
				{ localName: 'Item', importedName: 'default', source: './Item.vue', type: 'dynamic' },
				{ localName: 'Other', importedName: 'Named', source: './Other.vue', type: 'dynamic' },
				// Behavior change: the whole module read into a variable is bound as a namespace under that variable
				{ localName: 'Whole', importedName: '*', source: './Whole.vue', type: 'namespace' },
				// { localName: '*', importedName: '*', source: './Whole.vue', type: 'dynamic' }, // previous
			]);
		});

		test('a loader aliased by an assignment names the import after the variable', async () => {
			const source = [
				"import { lazy } from 'react'",
				'const l = lazy',
				"const A = l(() => import('./A'))",
				'const { defineAsyncComponent: define } = Vue',
				"const B = define(() => import('./B.vue'))",
				"const d = require('next/dynamic')",
				"const C = d(() => import('./C'))",
			].join('\n');
			expect((await parseImports(source)).map(b => [b.localName, b.source])).toStrictEqual([
				['lazy', 'react'],
				['A', './A'],
				['B', './B.vue'],
				['C', './C'],
			]);
		});

		test('an alias that a parameter shadows names nothing', async () => {
			const source = ['const l = React.lazy', "function f(l) { return l(() => import('./A')) }"].join('\n');
			expect(await parseImports(source)).toStrictEqual([
				{ localName: '*', importedName: '*', source: './A', type: 'dynamic' },
			]);
		});

		test('an awaited import read into a variable as a whole is a namespace', async () => {
			const source = [
				"const UI = await import('./ui')",
				"const Other = await import('./other').then(m => m)",
			].join('\n');
			expect(await parseImports(source)).toStrictEqual([
				{ localName: 'UI', importedName: '*', source: './ui', type: 'namespace' },
				{ localName: 'Other', importedName: '*', source: './other', type: 'namespace' },
			]);
		});

		test('a call that is not a component loader does not name the import', async () => {
			const source = "const Item = useMemo(() => import('./Item.vue'), [])";
			expect(await parseImports(source)).toStrictEqual([
				{ localName: '*', importedName: '*', source: './Item.vue', type: 'dynamic' },
			]);
		});

		test('names are matched to the imports by position, whatever precedes them', async () => {
			const source = [
				"import A from './A.vue'",
				'const text = "import(\'./Fake.vue\')"',
				"const B = defineAsyncComponent(() => import('./B.vue'))",
				"const C = defineAsyncComponent(() => import('./C.vue'))",
			].join('\n');
			const result = await parseImports(source);
			expect(result.map(b => [b.localName, b.source])).toStrictEqual([
				['A', './A.vue'],
				['B', './B.vue'],
				['C', './C.vue'],
			]);
		});

		test('names are matched when a comment precedes the import and two share a line', async () => {
			const source =
				"const A = lazy(() => /* c */ import('./A.vue')), B = lazy(() => import('./B.vue')), C = import('./C.vue')";
			const result = await parseImports(source);
			expect(result.map(b => [b.localName, b.source])).toStrictEqual([
				['A', './A.vue'],
				['B', './B.vue'],
				['*', './C.vue'],
			]);
		});

		test('TypeScript syntax is read, and JSX only as TSX', async () => {
			const typed = "const Item: Component = defineAsyncComponent((): Promise<unknown> => import('./Item.vue'))";
			expect(await parseImports(typed)).toMatchObject([{ localName: 'Item', type: 'dynamic' }]);

			const jsx = "export const meta = <X />;\nconst Item = lazy(() => import('./Item'))";
			expect(await parseImports(jsx, ts.ScriptKind.TSX)).toMatchObject([{ localName: 'Item', type: 'dynamic' }]);
		});

		test('multiple dynamic imports', async () => {
			const source = ["const A = import('./A.vue')", "const B = import('./B.vue')"].join('\n');
			const result = await parseImports(source);
			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({ source: './A.vue', type: 'dynamic' });
			expect(result[1]).toMatchObject({ source: './B.vue', type: 'dynamic' });
		});
	});

	describe('import phases', () => {
		test('deferred namespace import keeps its namespace binding', async () => {
			const result = await parseImports("import defer * as ns from './Lazy.vue'");
			expect(result).toStrictEqual([
				{ localName: 'ns', importedName: '*', source: './Lazy.vue', type: 'namespace' },
			]);
		});

		test('default import named defer is not mistaken for the defer phase', async () => {
			const result = await parseImports("import defer from './defer.js'");
			expect(result).toStrictEqual([
				{ localName: 'defer', importedName: 'default', source: './defer.js', type: 'default' },
			]);
		});

		test('source phase import is excluded because it binds a module source, not an export', async () => {
			const result = await parseImports("import source mod from './Lazy.vue'");
			expect(result).toStrictEqual([]);
		});

		test('source phase dynamic import is excluded', async () => {
			const result = await parseImports("const mod = import.source('./Lazy.vue')");
			expect(result).toStrictEqual([]);
		});
	});

	// The lexer throws on JSX it cannot tokenize (the real one, not a mock), so the source is read with the
	// TypeScript parser, as the script kind the caller gives
	describe('a source the lexer rejects', () => {
		const item = { localName: 'Item', importedName: 'default', source: './Item.vue', type: 'default' };

		test.each([
			[
				'a `.map` with an arrow function in children',
				'const r = () => <ul>{items.map(i => <li key={i}>{i}</li>)}</ul>',
			],
			['a fragment', 'const r = () => <><A /></>'],
			['an apostrophe in the text', "const r = () => <p>it's</p>"],
		])('is read as TSX when the script kind says so, for %s', async (_, jsx) => {
			expect(await parseImports(`import Item from './Item.vue'\n${jsx}`, ts.ScriptKind.TSX)).toStrictEqual([
				item,
			]);
		});

		test('is read as TSX, whatever the JSX is before the import', async () => {
			const source = `const r = () => <><A /></>\nimport Item from './Item.vue'`;
			expect(await parseImports(source, ts.ScriptKind.TSX)).toStrictEqual([item]);
		});

		test('has no bindings when it is JSX and is read as TypeScript, which is not JSX', async () => {
			expect(await parseImports(`import Item from './Item.vue'\nconst r = () => <><A /></>`)).toStrictEqual([]);
		});

		test('has no bindings when the TypeScript parser finds a syntax error too', async () => {
			expect(
				await parseImports(
					`import Item from './Item.vue'\nconst r = () => <><A /></>\nconst = ;`,
					ts.ScriptKind.TSX,
				),
			).toStrictEqual([]);
		});
	});

	describe('TypeScript type-only imports', () => {
		test('import type statement is excluded from bindings', async () => {
			const source = ["import Button from './Button.vue'", "import type { ButtonProps } from './types'"].join(
				'\n',
			);
			const result = await parseImports(source);
			expect(result).toHaveLength(1);
			expect(result[0]).toStrictEqual({
				localName: 'Button',
				importedName: 'default',
				source: './Button.vue',
				type: 'default',
			});
		});

		test('import type default is excluded', async () => {
			const result = await parseImports("import type Foo from './types'");
			expect(result).toStrictEqual([]);
		});

		test('inline type keyword in named imports is excluded', async () => {
			const source = "import { type ButtonProps, Card } from './ui'";
			const result = await parseImports(source);
			expect(result).toHaveLength(1);
			expect(result[0]).toStrictEqual({
				localName: 'Card',
				importedName: 'Card',
				source: './ui',
				type: 'named',
			});
		});

		test('all inline type-only named imports produce no bindings', async () => {
			const result = await parseImports("import { type Foo, type Bar } from './types'");
			expect(result).toStrictEqual([]);
		});
	});

	describe('edge cases', () => {
		test('empty source returns empty bindings', async () => {
			const result = await parseImports('');
			expect(result).toStrictEqual([]);
		});

		test('source with no imports returns empty bindings', async () => {
			const result = await parseImports('const x = 1;\nconsole.log(x);');
			expect(result).toStrictEqual([]);
		});

		test('handles trailing comma in named imports', async () => {
			const result = await parseImports("import { Button, } from './components'");
			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({ localName: 'Button' });
		});

		test('non-JS content returns empty bindings without throwing', async () => {
			const result = await parseImports('# Hello World\nSome markdown content');
			expect(result).toStrictEqual([]);
		});

		test.each([
			['an invalid unicode escape in a static specifier', String.raw`import A from '\u{zz}'`],
			['an invalid hex escape in a dynamic specifier', String.raw`import('\xZZ')`],
			['an out-of-range code point escape', String.raw`import('\u{110000}')`],
			['an unterminated dynamic import', "import('./a"],
		])('malformed JS (%s) returns empty bindings without throwing', async (_name, source) => {
			const result = await parseImports(source);
			expect(result).toStrictEqual([]);
		});

		test('concurrent calls do not cause double initialization', async () => {
			const results = await Promise.all([
				parseImports("import { A } from './a'"),
				parseImports("import { B } from './b'"),
			]);
			expect(results[0]).toHaveLength(1);
			expect(results[1]).toHaveLength(1);
		});
	});
});
