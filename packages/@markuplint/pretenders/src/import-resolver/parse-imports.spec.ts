import type * as esModuleLexer from 'es-module-lexer';

import { afterEach, describe, test, expect, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	initMock: vi.fn(),
	parseMock: vi.fn(),
	actualInit: null as unknown as typeof esModuleLexer.init,
	actualParse: null as unknown as typeof esModuleLexer.parse,
}));

vi.mock('es-module-lexer', async importOriginal => {
	const actual = await importOriginal<typeof esModuleLexer>();
	mocks.actualInit = actual.init;
	mocks.actualParse = actual.parse;
	mocks.initMock.mockImplementation(actual.init);
	mocks.parseMock.mockImplementation(actual.parse);
	return {
		...actual,
		init: (...args: unknown[]) => mocks.initMock(...args),
		parse: (...args: unknown[]) => mocks.parseMock(...args),
	};
});

import { parseImports } from './parse-imports.js';

afterEach(() => {
	mocks.initMock.mockReset();
	mocks.parseMock.mockReset();
	mocks.initMock.mockImplementation(mocks.actualInit);
	mocks.parseMock.mockImplementation(mocks.actualParse);
});

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

		test('concurrent calls do not cause double initialization', async () => {
			const results = await Promise.all([
				parseImports("import { A } from './a'"),
				parseImports("import { B } from './b'"),
			]);
			expect(results[0]).toHaveLength(1);
			expect(results[1]).toHaveLength(1);
		});
	});

	describe('error handling (issue #4215)', () => {
		describe('initialization retry (Behavior A)', () => {
			test('surfaces initialization failure on first call and retries on subsequent call', async () => {
				vi.resetModules();
				const { parseImports: freshParseImports } = await import('./parse-imports.js');

				const initError = new Error('WASM initialization failed');
				mocks.initMock.mockRejectedValueOnce(initError);

				// First call should fail and surface the initialization rejection
				await expect(freshParseImports("import Button from './Button.vue'")).rejects.toThrow(
					'WASM initialization failed',
				);

				// Subsequent call should retry initialization rather than reusing the rejected promise
				const result = await freshParseImports("import Button from './Button.vue'");
				expect(result).toStrictEqual([
					{
						localName: 'Button',
						importedName: 'default',
						source: './Button.vue',
						type: 'default',
					},
				]);
				expect(mocks.initMock).toHaveBeenCalledTimes(2);
			});

			test('concurrent in-flight calls share initialization, and later call retries after failure', async () => {
				vi.resetModules();
				const { parseImports: freshParseImports } = await import('./parse-imports.js');

				const initError = new Error('WASM initialization failed');
				mocks.initMock.mockRejectedValueOnce(initError);

				// Concurrent calls share the in-flight initialization attempt
				await expect(
					Promise.all([
						freshParseImports("import { A } from './a'"),
						freshParseImports("import { B } from './b'"),
					]),
				).rejects.toThrow('WASM initialization failed');
				expect(mocks.initMock).toHaveBeenCalledTimes(1);

				// Later call retries initialization
				const result = await freshParseImports("import { A } from './a'");
				expect(result).toStrictEqual([
					{
						localName: 'A',
						importedName: 'A',
						source: './a',
						type: 'named',
					},
				]);
				expect(mocks.initMock).toHaveBeenCalledTimes(2);
			});
		});

		describe('fatal-error handling (Behavior B)', () => {
			test('re-throws Tier 1 fatal TypeError from parse()', async () => {
				mocks.parseMock.mockImplementationOnce(() => {
					throw new TypeError('Fatal type error');
				});

				await expect(parseImports("import Button from './Button.vue'")).rejects.toThrow(TypeError);
			});

			test('re-throws Tier 1 fatal SyntaxError from parse()', async () => {
				mocks.parseMock.mockImplementationOnce(() => {
					throw new SyntaxError('Fatal syntax error');
				});

				await expect(parseImports("import Button from './Button.vue'")).rejects.toThrow(SyntaxError);
			});

			test('re-throws non-Error throws from parse()', async () => {
				mocks.parseMock.mockImplementationOnce(() => {
					// eslint-disable-next-line @typescript-eslint/only-throw-error
					throw 'string error';
				});

				await expect(parseImports("import Button from './Button.vue'")).rejects.toBe('string error');
			});

			test('preserves tolerance for non-fatal parse errors (returns empty bindings)', async () => {
				mocks.parseMock.mockImplementationOnce(() => {
					throw new Error('Parse error @:1:9');
				});

				const result = await parseImports('import {');
				expect(result).toStrictEqual([]);
			});
		});
	});
});
