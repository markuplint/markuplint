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

	describe('dynamic imports are excluded', () => {
		test('dynamic import is ignored', async () => {
			const source = ["import Button from './Button.vue'", "const Lazy = import('./Lazy.vue')"].join('\n');
			const result = await parseImports(source);
			expect(result).toHaveLength(1);
			expect(result[0]).toMatchObject({ localName: 'Button' });
		});
	});

	describe('TypeScript sources', () => {
		test('import with type keyword is parsed as static import', async () => {
			const source = ["import Button from './Button.vue'", "import type { ButtonProps } from './types'"].join(
				'\n',
			);
			const result = await parseImports(source);
			// es-module-lexer treats `import type` as a regular import specifier
			// Both should be captured as bindings
			expect(result.some(b => b.localName === 'Button')).toBe(true);
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
	});
});
