import type { PretenderDirectorMap } from './pretender-director.js';

import fs from 'node:fs';
import { mkdir, writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';

import { clearExportTableCache, dependencyMapper } from './dependency-mapper.js';
import { normalizePath } from './import-resolver/resolve-module-file.js';

const fixtureDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures', 'dependency-mapper');

describe('dependencyMapper: attributes through a chain', () => {
	const iconButton = {
		element: 'button',
		attrs: [{ name: 'aria-label', value: { fromAttr: 'label', omitIfMissing: true as const } }],
		slots: true as const,
	};

	test('Fancy -> IconButton -> button: the prop that Fancy passes on is the prop of the result', () => {
		const map: PretenderDirectorMap = new Map([
			['IconButton', ['IconButton', iconButton]],
			[
				'Fancy',
				[
					'Fancy',
					{
						element: 'IconButton',
						attrs: [{ name: 'label', value: { fromAttr: 'title', omitIfMissing: true } }],
						slots: true,
					},
				],
			],
		]);

		expect(dependencyMapper(map).find(pretender => pretender.selector === 'Fancy')).toStrictEqual({
			selector: 'Fancy',
			_via: ['IconButton'],
			as: {
				element: 'button',
				attrs: [{ name: 'aria-label', value: { fromAttr: 'title', omitIfMissing: true } }],
				slots: true,
			},
		});
	});

	test('Page -> Fancy -> IconButton -> button: it composes one hop at a time', () => {
		const map: PretenderDirectorMap = new Map([
			['IconButton', ['IconButton', iconButton]],
			[
				'Fancy',
				[
					'Fancy',
					{
						element: 'IconButton',
						attrs: [{ name: 'label', value: { fromAttr: 'title', omitIfMissing: true } }],
						slots: true,
					},
				],
			],
			['Page', ['Page', { element: 'Fancy', attrs: [{ name: 'title', value: 'Save' }], slots: true }]],
		]);

		expect(dependencyMapper(map).find(pretender => pretender.selector === 'Page')).toStrictEqual({
			selector: 'Page',
			_via: ['Fancy', 'IconButton'],
			as: {
				element: 'button',
				attrs: [{ name: 'aria-label', value: 'Save' }],
				slots: true,
			},
		});
	});

	test('a component that does not pass the prop on gives no attribute', () => {
		const map: PretenderDirectorMap = new Map([
			['IconButton', ['IconButton', iconButton]],
			['Plain', ['Plain', { element: 'IconButton', slots: true }]],
		]);

		expect(dependencyMapper(map).find(pretender => pretender.selector === 'Plain')).toStrictEqual({
			selector: 'Plain',
			_via: ['IconButton'],
			as: { element: 'button', slots: true },
		});
	});
});

describe('dependencyMapper', () => {
	test('B -> A', () => {
		expect(
			dependencyMapper(
				new Map([
					//
					['A', ['A', 'div']],
					['B', ['B', 'A']],
				]),
			),
		).toStrictEqual([
			{
				selector: 'A',
				as: 'div',
			},
			{
				selector: 'B',
				_via: ['A'],
				as: 'div',
			},
		]);
	});

	test('E -> D -> C -> B -> A', () => {
		expect(
			dependencyMapper(
				new Map([
					//
					['A', ['A', 'div']],
					['B', ['B', 'A']],
					['C', ['C', 'B']],
					['D', ['D', 'C']],
					['E', ['E', 'D']],
				]),
			),
		).toStrictEqual([
			{
				selector: 'A',
				as: 'div',
			},
			{
				selector: 'B',
				_via: ['A'],
				as: 'div',
			},
			{
				selector: 'C',
				_via: ['B', 'A'],
				as: 'div',
			},
			{
				selector: 'D',
				_via: ['C', 'B', 'A'],
				as: 'div',
			},
			{
				selector: 'E',
				_via: ['D', 'C', 'B', 'A'],
				as: 'div',
			},
		]);
	});

	test('Reverse Defined: E -> D -> C -> B -> A', () => {
		expect(
			dependencyMapper(
				new Map([
					//
					['E', ['E', 'D']],
					['D', ['D', 'C']],
					['C', ['C', 'B']],
					['B', ['B', 'A']],
					['A', ['A', 'div']],
				]),
			),
		).toStrictEqual([
			{
				selector: 'A',
				as: 'div',
			},
			{
				selector: 'B',
				_via: ['A'],
				as: 'div',
			},
			{
				selector: 'C',
				_via: ['B', 'A'],
				as: 'div',
			},
			{
				selector: 'D',
				_via: ['C', 'B', 'A'],
				as: 'div',
			},
			{
				selector: 'E',
				_via: ['D', 'C', 'B', 'A'],
				as: 'div',
			},
		]);
	});

	test('Intermediate Recursive: A -> B -> C -> B', () => {
		expect(
			dependencyMapper(
				new Map([
					//
					['A', ['A', 'B']],
					['B', ['B', 'C']],
					['C', ['C', 'B']],
				]),
			),
		).toStrictEqual([
			{
				selector: 'A',
				as: 'C',
				_via: ['B', 'C', '...[Recursive]'],
			},
			{
				selector: 'B',
				as: 'C',
				_via: ['C', '...[Recursive]'],
			},
			{
				selector: 'C',
				as: 'B',
				_via: ['B', '...[Recursive]'],
			},
		]);
	});

	test('Recursive', () => {
		expect(
			dependencyMapper(
				new Map([
					//
					['A', ['A', 'B']],
					['B', ['B', 'C']],
					['C', ['C', 'D']],
					['D', ['D', 'A']],
				]),
			),
		).toStrictEqual([
			{
				selector: 'A',
				as: 'B',
				_via: ['B', 'C', 'D', '...[Recursive]'],
			},
			{
				selector: 'B',
				as: 'C',
				_via: ['C', 'D', 'A', '...[Recursive]'],
			},
			{
				selector: 'C',
				as: 'D',
				_via: ['D', 'A', 'B', '...[Recursive]'],
			},
			{
				selector: 'D',
				as: 'A',
				_via: ['A', 'B', 'C', '...[Recursive]'],
			},
		]);
	});

	test('Import-path-based resolution with nameIndex', () => {
		const map: PretenderDirectorMap = new Map([
			['./components/A/Button', ['Button', 'button']],
			['./components/B/Button', ['Button', 'div']],
			['./components/MyButton', ['MyButton', 'Button']],
		]);

		const nameIndex = new Map([
			['Button', './components/A/Button'],
			['MyButton', './components/MyButton'],
		]);

		expect(dependencyMapper(map, nameIndex)).toStrictEqual([
			{
				selector: 'Button',
				as: 'button',
			},
			{
				selector: 'Button',
				as: 'div',
			},
			{
				selector: 'MyButton',
				_via: ['Button'],
				as: 'button',
			},
		]);
	});

	test('Import-path-based resolution avoids name collision', () => {
		const map: PretenderDirectorMap = new Map([
			['./lib/Button', ['Button', 'button']],
			['./app/MyButton', ['MyButton', { element: 'Button', slots: true, inheritAttrs: true }]],
		]);

		const nameIndex = new Map([
			['Button', './lib/Button'],
			['MyButton', './app/MyButton'],
		]);

		expect(dependencyMapper(map, nameIndex)).toStrictEqual([
			{
				selector: 'Button',
				as: 'button',
			},
			{
				selector: 'MyButton',
				_via: ['Button'],
				as: 'button',
			},
		]);
	});

	test('buildNameIndex fallback: import-path keys without explicit nameIndex', () => {
		const map: PretenderDirectorMap = new Map([
			['./lib/Button', ['Button', 'button']],
			['./app/MyButton', ['MyButton', 'Button']],
		]);

		// No nameIndex provided → buildNameIndex derives it from the map
		expect(dependencyMapper(map)).toStrictEqual([
			{
				selector: 'Button',
				as: 'button',
			},
			{
				selector: 'MyButton',
				_via: ['Button'],
				as: 'button',
			},
		]);
	});

	test('cycle detection with import-path keys', () => {
		const map: PretenderDirectorMap = new Map([
			['./a', ['A', 'B']],
			['./b', ['B', 'A']],
		]);

		const nameIndex = new Map([
			['A', './a'],
			['B', './b'],
		]);

		// identity is updated before cycle check, so 'as' reflects the cyclic entry's identity
		expect(dependencyMapper(map, nameIndex)).toStrictEqual([
			{
				selector: 'A',
				as: 'B',
				_via: ['B', '...[Recursive]'],
			},
			{
				selector: 'B',
				as: 'A',
				_via: ['A', '...[Recursive]'],
			},
		]);
	});

	test('nameIndex miss falls through to direct key lookup', () => {
		const map: PretenderDirectorMap = new Map([
			['./Button', ['Button', 'button']],
			['Card', ['Card', 'Button']],
		]);

		// nameIndex only has Button, not Card
		const nameIndex = new Map([['Button', './Button']]);

		// Card's identity is 'Button' → nameIndex resolves to './Button' → 'button'
		expect(dependencyMapper(map, nameIndex)).toStrictEqual([
			{
				selector: 'Button',
				as: 'button',
			},
			{
				selector: 'Card',
				_via: ['Button'],
				as: 'button',
			},
		]);
	});

	describe('file-context resolution (issue #3951)', () => {
		test('same-file local declaration takes priority over the name index', () => {
			const map: PretenderDirectorMap = new Map([
				['a.tsx#Item', ['Item', 'button', undefined, 'a.tsx']],
				['b.tsx#Item', ['Item', 'li', undefined, 'b.tsx']],
				['b.tsx#B', ['B', 'Item', undefined, 'b.tsx']],
			]);
			// Name-index-only resolution (no file context) would map 'Item' to whichever
			// file registered it first — here that's a.tsx, which is the wrong answer for B.
			const nameIndex = new Map([['Item', 'a.tsx#Item']]);

			const result = dependencyMapper(map, nameIndex);
			const b = result.find(p => p.selector === 'B');
			expect(b).toStrictEqual({ selector: 'B', as: 'li', _via: ['Item'] });
		});

		test('resolves a named import to the actual declaration file, even when a same-named collision exists', () => {
			const map: PretenderDirectorMap = new Map([
				['a.tsx#Item', ['Item', 'button', undefined, 'a.tsx']],
				// Colliding name registered elsewhere; the name index (used without file context)
				// would point here, which is the wrong file for what c.tsx actually imports.
				['other.tsx#Item', ['Item', 'li', undefined, 'other.tsx']],
				['c.tsx#C', ['C', 'Item', undefined, 'c.tsx']],
			]);
			const nameIndex = new Map([['Item', 'other.tsx#Item']]);
			const importsByFile = new Map([
				['c.tsx', [{ localName: 'Item', importedName: 'Item', source: './a', type: 'named' as const }]],
			]);

			const result = dependencyMapper(map, nameIndex, { importsByFile, cwd: fixtureDir });
			const c = result.find(p => p.selector === 'C');
			expect(c).toStrictEqual({ selector: 'C', as: 'button', _via: ['Item'] });
		});

		test('resolves a default import via the target file export table, even when a same-named collision exists', () => {
			const map: PretenderDirectorMap = new Map([
				['d.tsx#Item', ['Item', 'button', undefined, 'd.tsx']],
				['other.tsx#Item', ['Item', 'li', undefined, 'other.tsx']],
				['e.tsx#E', ['E', 'Item', undefined, 'e.tsx']],
			]);
			const nameIndex = new Map([['Item', 'other.tsx#Item']]);
			const importsByFile = new Map([
				['e.tsx', [{ localName: 'Item', importedName: 'default', source: './d', type: 'default' as const }]],
			]);

			const result = dependencyMapper(map, nameIndex, { importsByFile, cwd: fixtureDir });
			const e = result.find(p => p.selector === 'E');
			expect(e).toStrictEqual({ selector: 'E', as: 'button', _via: ['Item'] });
		});

		test('carries the resolved file forward across multiple hops, even when a same-named collision exists', () => {
			const map: PretenderDirectorMap = new Map([
				['wrapper-a.tsx#Base', ['Base', 'div', undefined, 'wrapper-a.tsx']],
				['wrapper-a.tsx#Wrapper', ['Wrapper', 'Base', undefined, 'wrapper-a.tsx']],
				// Colliding name registered elsewhere with a different target.
				['other.tsx#Base', ['Base', 'span', undefined, 'other.tsx']],
				['wrapper-b.tsx#Outer', ['Outer', 'Wrapper', undefined, 'wrapper-b.tsx']],
			]);
			const nameIndex = new Map([
				['Base', 'other.tsx#Base'],
				['Wrapper', 'wrapper-a.tsx#Wrapper'],
			]);
			const importsByFile = new Map([
				[
					'wrapper-b.tsx',
					[{ localName: 'Wrapper', importedName: 'Wrapper', source: './wrapper-a', type: 'named' as const }],
				],
			]);

			const result = dependencyMapper(map, nameIndex, { importsByFile, cwd: fixtureDir });
			const outer = result.find(p => p.selector === 'Outer');
			// Outer -> Wrapper (resolved via import into wrapper-a.tsx) -> Base
			// (must resolve within wrapper-a.tsx, not fall through to other.tsx's Base)
			expect(outer).toStrictEqual({ selector: 'Outer', as: 'div', _via: ['Wrapper', 'Base'] });
		});

		test('falls back to name-index resolution when no context is provided (full backward compat)', () => {
			const map: PretenderDirectorMap = new Map([
				['a.tsx#Item', ['Item', 'button', undefined, 'a.tsx']],
				['c.tsx#C', ['C', 'Item', undefined, 'c.tsx']],
			]);
			const nameIndex = new Map([['Item', 'a.tsx#Item']]);

			// No importsByFile/cwd context at all — must behave exactly like the pre-existing algorithm
			const result = dependencyMapper(map, nameIndex);
			const c = result.find(p => p.selector === 'C');
			expect(c).toStrictEqual({ selector: 'C', as: 'button', _via: ['Item'] });
		});
	});

	describe('star re-exports', () => {
		let tmpDir: string;

		beforeEach(async () => {
			tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dependency-mapper-star-'));
		});

		afterEach(async () => {
			await rm(tmpDir, { recursive: true, force: true });
			clearExportTableCache();
		});

		// `c.tsx` renders `Item` imported from `./barrel`; the name index points
		// at `other.tsx#Item`, which is what an unconfirmed lookup falls back to.
		const resolveC = (importedName: string, type: 'named' | 'default') => {
			const map: PretenderDirectorMap = new Map([
				['a.tsx#Item', ['Item', 'button', undefined, 'a.tsx']],
				['b.tsx#Item', ['Item', 'em', undefined, 'b.tsx']],
				['other.tsx#Item', ['Item', 'li', undefined, 'other.tsx']],
				['c.tsx#C', ['C', 'Item', undefined, 'c.tsx']],
			]);
			const nameIndex = new Map([['Item', 'other.tsx#Item']]);
			const importsByFile = new Map([['c.tsx', [{ localName: 'Item', importedName, source: './barrel', type }]]]);
			const result = dependencyMapper(map, nameIndex, { importsByFile, cwd: tmpDir });
			return result.find(p => p.selector === 'C');
		};

		test('resolves a name through `export * from`', async () => {
			await writeFile(path.join(tmpDir, 'a.tsx'), 'export const Item = () => <button />;');
			await writeFile(path.join(tmpDir, 'barrel.ts'), "export * from './a';");

			expect(resolveC('Item', 'named')).toStrictEqual({ selector: 'C', as: 'button', _via: ['Item'] });
		});

		test('a name supplied by two star re-exports is ambiguous and not picked', async () => {
			await writeFile(path.join(tmpDir, 'a.tsx'), 'export const Item = () => <button />;');
			await writeFile(path.join(tmpDir, 'b.tsx'), 'export const Item = () => <em />;');
			await writeFile(path.join(tmpDir, 'barrel.ts'), "export * from './a';\nexport * from './b';");

			expect(resolveC('Item', 'named')).toStrictEqual({ selector: 'C', as: 'li', _via: ['Item'] });
		});

		test('`default` does not pass through `export *`', async () => {
			await writeFile(path.join(tmpDir, 'a.tsx'), 'const Item = () => <button />;\nexport default Item;');
			await writeFile(path.join(tmpDir, 'barrel.ts'), "export * from './a';");

			expect(resolveC('default', 'default')).toStrictEqual({ selector: 'C', as: 'li', _via: ['Item'] });
		});

		test('does not look behind a star re-export of a package in node_modules', async () => {
			const libDir = path.join(tmpDir, 'node_modules', 'some-lib');
			await mkdir(libDir, { recursive: true });
			await writeFile(path.join(libDir, 'package.json'), '{"name":"some-lib","main":"index.js"}');
			await writeFile(path.join(libDir, 'index.js'), 'export const Other = () => null;');
			await writeFile(path.join(tmpDir, 'a.tsx'), 'export const Item = () => <button />;');
			await writeFile(path.join(tmpDir, 'barrel.ts'), "export * from 'some-lib';\nexport * from './a';");

			const readFileSyncSpy = vi.spyOn(fs, 'readFileSync');
			try {
				expect(resolveC('Item', 'named')).toStrictEqual({ selector: 'C', as: 'button', _via: ['Item'] });
				// Module resolution reads the package's `package.json`; its export table
				// is what must not be built.
				const libReads = readFileSyncSpy.mock.calls.filter(
					call =>
						typeof call[0] === 'string' &&
						normalizePath(call[0]).endsWith('/node_modules/some-lib/index.js'),
				);
				expect(libReads).toStrictEqual([]);
			} finally {
				readFileSyncSpy.mockRestore();
			}
		});

		test('the depth limit counts one chain, not the number of star re-exports in a barrel', async () => {
			const STAR_COUNT = 12;
			const lines: string[] = [];
			for (let i = 0; i < STAR_COUNT - 1; i++) {
				await writeFile(path.join(tmpDir, `x${i}.tsx`), `export const X${i} = () => <i />;`);
				lines.push(`export * from './x${i}';`);
			}
			await writeFile(path.join(tmpDir, 'a.tsx'), 'export const Item = () => <button />;');
			lines.push("export * from './a';");
			await writeFile(path.join(tmpDir, 'barrel.ts'), lines.join('\n'));

			expect(resolveC('Item', 'named')).toStrictEqual({ selector: 'C', as: 'button', _via: ['Item'] });
		});
	});

	describe('exportTableCache invalidation (long-running processes)', () => {
		let tmpDir: string;

		beforeEach(async () => {
			tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dependency-mapper-cache-'));
		});

		afterEach(async () => {
			await rm(tmpDir, { recursive: true, force: true });
		});

		test('clearExportTableCache() picks up a renamed export after re-resolving', async () => {
			const targetFile = path.join(tmpDir, 'target.tsx');
			await writeFile(targetFile, 'export default function Item() { return null; }');

			const importsByFile = new Map([
				[
					'importer.tsx',
					[{ localName: 'Item', importedName: 'default', source: './target', type: 'default' as const }],
				],
			]);

			const mapBefore: PretenderDirectorMap = new Map([
				['target.tsx#Item', ['Item', 'button', undefined, 'target.tsx']],
				['importer.tsx#E', ['E', 'Item', undefined, 'importer.tsx']],
			]);
			const resultBefore = dependencyMapper(mapBefore, undefined, { importsByFile, cwd: tmpDir });
			expect(resultBefore.find(p => p.selector === 'E')?.as).toBe('button');

			// Rename the exported declaration. Without cache invalidation, the resolver
			// keeps using the pre-rename export table and looks up a map key that no
			// longer exists, leaving `E` unresolved instead of picking up the new one.
			await writeFile(targetFile, 'export default function Widget() { return null; }');
			const mapAfter: PretenderDirectorMap = new Map([
				['target.tsx#Widget', ['Widget', 'span', undefined, 'target.tsx']],
				['importer.tsx#E', ['E', 'Item', undefined, 'importer.tsx']],
			]);

			const resultStale = dependencyMapper(mapAfter, undefined, { importsByFile, cwd: tmpDir });
			expect(resultStale.find(p => p.selector === 'E')?.as).toBe('Item');

			clearExportTableCache();

			const resultFresh = dependencyMapper(mapAfter, undefined, { importsByFile, cwd: tmpDir });
			expect(resultFresh.find(p => p.selector === 'E')?.as).toBe('span');
		});
	});

	describe('Tier 1 (fatal) errors during export table resolution', () => {
		test('rethrows instead of swallowing a fatal error into a null export table', () => {
			clearExportTableCache();

			const map: PretenderDirectorMap = new Map([
				['a.tsx#Item', ['Item', 'button', undefined, 'a.tsx']],
				['c.tsx#C', ['C', 'Item', undefined, 'c.tsx']],
			]);
			const importsByFile = new Map([
				['c.tsx', [{ localName: 'Item', importedName: 'Item', source: './a', type: 'named' as const }]],
			]);

			const spy = vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
				throw new TypeError('boom: implementation bug, not a missing file');
			});
			try {
				expect(() => dependencyMapper(map, undefined, { importsByFile, cwd: fixtureDir })).toThrow(TypeError);
			} finally {
				spy.mockRestore();
				clearExportTableCache();
			}
		});
	});
});
