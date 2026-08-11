import type { PretenderDirectorMap } from './pretender-director.js';

import fs from 'node:fs';
import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, afterEach, beforeEach, vi } from 'vitest';

import { clearExportTableCache, dependencyMapper } from './dependency-mapper.js';

const fixtureDir = path.resolve(import.meta.dirname, '..', 'test', 'fixtures', 'dependency-mapper');

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

	describe('exportTableCache invalidation (long-running processes)', () => {
		let tmpDir: string;

		beforeEach(async () => {
			tmpDir = await mkdtemp(path.join(os.tmpdir(), 'dependency-mapper-cache-'));
		});

		afterEach(async () => {
			await rm(tmpDir, { recursive: true, force: true });
		});

		test('picks up a renamed export on the very next resolve, without needing clearExportTableCache()', async () => {
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

			// getExportTableForFile()'s cache is keyed on file content, not mtime,
			// so a renamed export is picked up on the very next resolve — no
			// explicit clearExportTableCache() call needed for this kind of
			// change.
			await writeFile(targetFile, 'export default function Widget() { return null; }');
			const mapAfter: PretenderDirectorMap = new Map([
				['target.tsx#Widget', ['Widget', 'span', undefined, 'target.tsx']],
				['importer.tsx#E', ['E', 'Item', undefined, 'importer.tsx']],
			]);

			const resultAfterRename = dependencyMapper(mapAfter, undefined, { importsByFile, cwd: tmpDir });
			expect(resultAfterRename.find(p => p.selector === 'E')?.as).toBe('span');

			// clearExportTableCache() remains safe to call regardless.
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
