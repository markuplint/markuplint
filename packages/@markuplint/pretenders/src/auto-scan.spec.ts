import fs from 'node:fs';
import { writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

import { normalizePath } from './import-resolver/resolve-module-file.js';

import { autoScan, clearAutoScanCache } from './auto-scan.js';

describe('autoScan', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'auto-scan-'));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
		clearAutoScanCache();
	});

	test('a .tsx entry resolves a .tsx import', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const childPath = path.join(tmpDir, 'Child.tsx');
		await writeFile(childPath, 'export const Child = () => <button>x</button>;');
		const entrySource = "import { Child } from './Child';\nexport const Entry = () => <Child />;";

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Child')).toMatchObject({ as: 'button' });
	});

	test('a .tsx entry resolves a .vue import (BFS is extension-agnostic)', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const childPath = path.join(tmpDir, 'Child.vue');
		await writeFile(childPath, '<template><span class="child" /></template>');
		const entrySource = "import Child from './Child.vue';\nexport const Entry = () => <Child />;";

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Child')).toMatchObject({
			as: expect.objectContaining({ element: 'span' }),
		});
	});

	test('a .vue entry resolves a .tsx import', async () => {
		const entryPath = path.join(tmpDir, 'Entry.vue');
		const childPath = path.join(tmpDir, 'Child.tsx');
		await writeFile(childPath, 'export const Child = () => <em>x</em>;');
		const entrySource = [
			'<script setup>',
			"import Child from './Child';",
			'</script>',
			'<template><Child /></template>',
		].join('\n');

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Child')).toMatchObject({ as: 'em' });
	});

	test('a circular import pair does not loop forever', async () => {
		const entryPath = path.join(tmpDir, 'a.tsx');
		const bPath = path.join(tmpDir, 'b.tsx');
		await writeFile(bPath, "import { A } from './a';\nexport const B = () => <A />;");
		const entrySource = "import { B } from './b';\nexport const A = () => <B />;";

		await expect(autoScan(entryPath, entrySource)).resolves.toBeInstanceOf(Array);
	});

	test('resolves an entry-file export via its unsaved content, not a stale disk-backed export table or an unrelated same-named fallback', async () => {
		// Reproduces a real bug found in review: entry.tsx is reached back via a
		// circular import (helper.tsx imports from it), so dependency-mapper's
		// disambiguation needs entry.tsx's own export table to resolve `Item`.
		// entry.tsx's on-disk content doesn't have `Item` yet (only in the
		// unsaved `entrySource`), and an unrelated file also happens to define
		// an `Item`. Without `sources` wired into dependency-mapper, the
		// disk-backed export table can't confirm `Item` in entry.tsx, so
		// resolution falls back to the name index and silently grabs the
		// unrelated `Item` (button) instead of the correct one (span) — the
		// same class of bug as issue #3951, reachable via `sources` divergence.
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const helperPath = path.join(tmpDir, 'helper.tsx');
		const otherPath = path.join(tmpDir, 'other.tsx');

		// On-disk (stale/"saved") entry.tsx: no `Item` export yet.
		await writeFile(entryPath, 'export const SomethingElse = () => <div>x</div>;');
		await writeFile(
			helperPath,
			[
				"import { Item } from './entry';",
				"import { Other } from './other';",
				'export const Helper = () => <Item />;',
				'export const HelperUsesOther = () => <Other />;',
			].join('\n'),
		);
		// Unrelated file with its own, unrelated `Item` — this is what a
		// disk-blind fallback would wrongly grab.
		await writeFile(
			otherPath,
			'export const Item = () => <button>wrong</button>;\nexport const Other = () => <Item />;',
		);

		// Unsaved entry.tsx content: adds the real `Item` export.
		const entrySource = [
			"import { Helper } from './helper';",
			'export const Widget = () => <Helper />;',
			'export const Item = () => <span>right</span>;',
		].join('\n');

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Helper')).toMatchObject({ as: 'span' });
		expect(result.find(p => p.selector === 'Widget')).toMatchObject({ as: 'span' });
	});

	test('does not scan a .d.mts ambient declaration file reached during BFS', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		await writeFile(path.join(tmpDir, 'types.d.mts'), 'export const Ambient = () => <button>x</button>;');
		const entrySource = "import { Ambient } from './types.d.mts';\nexport const Entry = () => <Ambient />;";

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Ambient')).toBeUndefined();
	});

	test('does not traverse into node_modules', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const libDir = path.join(tmpDir, 'node_modules', 'some-lib');
		await mkdir(libDir, { recursive: true });
		await writeFile(path.join(libDir, 'index.js'), 'export const LibComponent = () => <button>x</button>;');
		const entrySource = "import { LibComponent } from 'some-lib';\nexport const Entry = () => <LibComponent />;";

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'LibComponent')).toBeUndefined();
	});

	test('does not traverse past the depth limit', async () => {
		// entry -> chain0.vue -> chain1.vue -> ... -> chain8.vue (9 hops from
		// entry). Uses .vue files (not .tsx) because jsxScanner's own
		// ts.Program transitively resolves imports on its own regardless of
		// what BFS collected, which would mask the traversal cap; templateScanner
		// has no such transitive resolution, so only files BFS actually visits
		// get scanned.
		const CHAIN_LENGTH = 9;
		for (let i = 0; i < CHAIN_LENGTH; i++) {
			const next = i === CHAIN_LENGTH - 1 ? null : `./chain${i + 1}.vue`;
			const script = next ? `<script setup>\nimport Chain${i + 1} from '${next}';\n</script>\n` : '';
			await writeFile(
				path.join(tmpDir, `chain${i}.vue`),
				`${script}<template><div class="c${i}"></div></template>`,
			);
		}
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const entrySource = "import Chain0 from './chain0.vue';\nexport const Entry = () => <Chain0 />;";

		const result = await autoScan(entryPath, entrySource);
		const selectors = new Set(result.map(p => p.selector));

		expect(selectors.has('Chain0')).toBe(true);
		expect(selectors.has(`Chain${CHAIN_LENGTH - 1}`)).toBe(false);
	});

	test('an unsupported entry extension returns an empty result', async () => {
		const entryPath = path.join(tmpDir, 'entry.html');

		const result = await autoScan(entryPath, '<div></div>');

		expect(result).toStrictEqual([]);
	});

	test('caches by entry source: identical source returns without rescanning disk', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const childPath = path.join(tmpDir, 'Child.tsx');
		await writeFile(childPath, 'export const Child = () => <button>x</button>;');
		const entrySource = "import { Child } from './Child';\nexport const Entry = () => <Child />;";

		const first = await autoScan(entryPath, entrySource);

		// Change the file on disk without changing the entry source passed in;
		// a cache hit must keep returning the original result.
		await writeFile(childPath, 'export const Child = () => <span>x</span>;');
		const second = await autoScan(entryPath, entrySource);

		expect(second).toStrictEqual(first);
		expect(second.find(p => p.selector === 'Child')).toMatchObject({ as: 'button' });
	});

	test('does not read a transitively-imported file from disk twice', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const childPath = path.join(tmpDir, 'Child.tsx');
		await writeFile(childPath, 'export const Child = () => <button>x</button>;');
		const entrySource = "import { Child } from './Child';\nexport const Entry = () => <Child />;";

		const readFileSyncSpy = vi.spyOn(fs, 'readFileSync');
		try {
			await autoScan(entryPath, entrySource);
			// BFS reads the file once to keep walking its imports; both
			// jsxScanner's own file read (via the caching CompilerHost) and its
			// dependency-mapper module (export-table construction for
			// same-selector disambiguation) now consult `sources` first, so
			// neither re-reads the same file from disk.
			//
			// Both sides go through normalizePath: the recorded call arguments come
			// from `resolveModuleFile`, which always returns `/`-delimited paths, so
			// comparing against a raw `path.join` result would match nothing on
			// Windows and silently assert 0.
			const childKey = normalizePath(childPath);
			const childReadCount = readFileSyncSpy.mock.calls.filter(
				call => typeof call[0] === 'string' && normalizePath(call[0]) === childKey,
			).length;
			expect(childReadCount).toBe(1);
		} finally {
			readFileSyncSpy.mockRestore();
		}
	});

	test('a changed entry source is a cache miss', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const childPath = path.join(tmpDir, 'Child.tsx');
		await writeFile(childPath, 'export const Child = () => <button>x</button>;');

		await autoScan(entryPath, "import { Child } from './Child';\nexport const Entry = () => <Child />;");
		const result = await autoScan(entryPath, 'export const Entry = () => <div>no import</div>;');

		expect(result.find(p => p.selector === 'Child')).toBeUndefined();
	});

	test('clearAutoScanCache forces a rescan even when the entry source is unchanged', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const childPath = path.join(tmpDir, 'Child.tsx');
		await writeFile(childPath, 'export const Child = () => <button>x</button>;');
		const entrySource = "import { Child } from './Child';\nexport const Entry = () => <Child />;";

		await autoScan(entryPath, entrySource);
		await writeFile(childPath, 'export const Child = () => <span>x</span>;');
		clearAutoScanCache();
		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Child')).toMatchObject({ as: 'span' });
	});
});
