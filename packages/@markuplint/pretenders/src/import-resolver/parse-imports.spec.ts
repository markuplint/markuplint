import { describe, test, expect } from 'vitest';

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

		test('multiple dynamic imports', async () => {
			const source = ["const A = import('./A.vue')", "const B = import('./B.vue')"].join('\n');
			const result = await parseImports(source);
			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({ source: './A.vue', type: 'dynamic' });
			expect(result[1]).toMatchObject({ source: './B.vue', type: 'dynamic' });
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
	});
});
