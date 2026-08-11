import { writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

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
