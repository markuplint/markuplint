import fs from 'node:fs';
import { writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

import { normalizePath } from './import-resolver/resolve-module-file.js';

import { autoScan, clearAutoScanCache } from './auto-scan.js';
import { disambiguatePretenders } from './disambiguate.js';

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

		// BREAKING CHANGE (#4082): `slots: null` is kept instead of collapsing to the bare tag name.
		// expect(result.find(p => p.selector === 'Child')).toMatchObject({ as: 'button' }); // pre-#4082 baseline
		expect(result.find(p => p.selector === 'Child')).toMatchObject({ as: { element: 'button', slots: null } });
	});

	test('a .tsx entry resolves a component it loads with `lazy(() => import(...))`', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		await writeFile(
			path.join(tmpDir, 'Item.tsx'),
			'export const Item = () => <img src="x.png" />;\nexport default Item;',
		);
		const entrySource = [
			"import { lazy } from 'react';",
			"const Item = lazy(() => import('./Item'));",
			'export const W = () => <div><Item><span>c</span></Item></div>;',
		].join('\n');

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Item')).toMatchObject({ as: { element: 'img', slots: null } });
	});

	test('a .tsx entry resolves a component it loads with `lazy()` into a variable of another name', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		await writeFile(
			path.join(tmpDir, 'Item.tsx'),
			'export const Item = () => <img src="x.png" />;\nexport default Item;',
		);
		const entrySource = [
			"import { lazy } from 'react';",
			"const Foo = lazy(() => import('./Item'));",
			'export const W = () => <div><Foo><span>c</span></Foo></div>;',
		].join('\n');

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Foo')).toMatchObject({ as: { element: 'img', slots: null } });
	});

	test('a .tsx entry resolves a component it loads with `memo(lazy(() => import(...)))`', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		await writeFile(
			path.join(tmpDir, 'Item.tsx'),
			'export const Item = () => <img src="x.png" />;\nexport default Item;',
		);
		const entrySource = [
			"import { lazy, memo } from 'react';",
			"const Foo = memo(lazy(() => import('./Item')));",
			'export const W = () => <div><Foo><span>c</span></Foo></div>;',
		].join('\n');

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Foo')).toMatchObject({ as: { element: 'img', slots: null } });
	});

	test('a .tsx entry resolves a component an awaited dynamic import is destructured into', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		await writeFile(path.join(tmpDir, 'Item.tsx'), 'export const Item = () => <img src="x.png" />;');
		const entrySource = [
			"const { Item } = await import('./Item');",
			'export const W = () => <div><Item><span>c</span></Item></div>;',
		].join('\n');

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Item')).toMatchObject({ as: { element: 'img', slots: null } });
	});

	test('a .tsx entry resolves a component loaded by a loader aliased with an assignment', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		await writeFile(
			path.join(tmpDir, 'Item.tsx'),
			'export const Item = () => <img src="x.png" />;\nexport default Item;',
		);
		const entrySource = [
			"import React from 'react';",
			'const l = React.lazy;',
			"const Foo = l(() => import('./Item'));",
			'export const W = () => <div><Foo><span>c</span></Foo></div>;',
		].join('\n');

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Foo')).toMatchObject({ as: { element: 'img', slots: null } });
	});

	test('a .tsx entry resolves a member tag of a module read whole with `await import(...)`', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		await writeFile(path.join(tmpDir, 'ui.tsx'), 'export const Button = () => <button type="button" />;');
		const entrySource = [
			"const UI = await import('./ui');",
			'export const W = () => <div><UI.Button><span>c</span></UI.Button></div>;',
		].join('\n');

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === String.raw`UI\.Button`)).toMatchObject({
			as: { element: 'button', slots: null },
		});
	});

	test('a .tsx entry resolves a component whose default export is a lazy component, under another name', async () => {
		const entryPath = path.join(tmpDir, 'Page.tsx');
		await mkdir(path.join(tmpDir, 'b'));
		await writeFile(path.join(tmpDir, 'b', 'Item.tsx'), 'export const Item = () => <div />;\nexport default Item;');
		await writeFile(
			path.join(tmpDir, 'Lazy.tsx'),
			"import { lazy } from 'react';\nexport default lazy(() => import('./b/Item'));",
		);
		const entrySource = ["import Foo from './Lazy';", 'export const Page = () => <Foo><span>c</span></Foo>;'].join(
			'\n',
		);

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Foo')).toMatchObject({ as: { element: 'div', slots: null } });
	});

	test('a .tsx entry gets no component for a lazy default export that loads a module of a package', async () => {
		const entryPath = path.join(tmpDir, 'Page.tsx');
		await writeFile(
			path.join(tmpDir, 'Lazy.tsx'),
			"import { lazy } from 'react';\nexport default lazy(() => import('some-package'));",
		);
		const entrySource = ["import Foo from './Lazy';", 'export const Page = () => <Foo><span>c</span></Foo>;'].join(
			'\n',
		);

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Foo')).toBeUndefined();
	});

	test('a .tsx entry ends the walk when two lazy default exports load each other', async () => {
		const entryPath = path.join(tmpDir, 'Page.tsx');
		await writeFile(
			path.join(tmpDir, 'A.tsx'),
			"import { lazy } from 'react';\nexport default lazy(() => import('./B'));",
		);
		await writeFile(
			path.join(tmpDir, 'B.tsx'),
			"import { lazy } from 'react';\nexport default lazy(() => import('./A'));",
		);
		const entrySource = ["import Foo from './A';", 'export const Page = () => <Foo><span>c</span></Foo>;'].join(
			'\n',
		);

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Foo')).toBeUndefined();
	});

	test('a .tsx entry resolves a component whose export is a variable of a lazy component', async () => {
		const entryPath = path.join(tmpDir, 'Page.tsx');
		await mkdir(path.join(tmpDir, 'b'));
		await writeFile(path.join(tmpDir, 'b', 'Item.tsx'), 'export const Item = () => <div />;\nexport default Item;');
		await writeFile(
			path.join(tmpDir, 'Lazy.tsx'),
			"import { lazy } from 'react';\nexport const Slow = lazy(() => import('./b/Item'));",
		);
		const entrySource = [
			"import { Slow as Foo } from './Lazy';",
			'export const Page = () => <Foo><span>c</span></Foo>;',
		].join('\n');

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Foo')).toMatchObject({ as: { element: 'div', slots: null } });
	});

	test('a .tsx entry resolves a member tag of a namespace import', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		await writeFile(path.join(tmpDir, 'Item.tsx'), 'export const Item = () => <img src="x.png" />;');
		const entrySource = [
			"import * as UI from './Item';",
			'export const W = () => <div><UI.Item><span>c</span></UI.Item></div>;',
		].join('\n');

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === String.raw`UI\.Item`)).toMatchObject({
			as: { element: 'img', slots: null },
		});
	});

	test('two entries that name different namespaces `UI` each get the member tag of their own', async () => {
		await mkdir(path.join(tmpDir, 'a'));
		await mkdir(path.join(tmpDir, 'b'));
		await writeFile(path.join(tmpDir, 'a', 'ui.tsx'), 'export const Item = () => <img src="x.png" />;');
		await writeFile(path.join(tmpDir, 'b', 'ui.tsx'), 'export const Item = () => <br />;');
		const source = "import * as UI from './ui';\nexport const W = () => <UI.Item />;";

		const forA = await autoScan(path.join(tmpDir, 'a', 'entry.tsx'), source);
		const forB = await autoScan(path.join(tmpDir, 'b', 'entry.tsx'), source);

		const members = (list: typeof forA) => list.filter(p => p.selector === String.raw`UI\.Item`);
		expect(members(forA)).toStrictEqual([
			expect.objectContaining({ as: expect.objectContaining({ element: 'img' }) }),
		]);
		expect(members(forB)).toStrictEqual([
			expect.objectContaining({ as: expect.objectContaining({ element: 'br' }) }),
		]);
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

		// BREAKING CHANGE (#4082): `slots: null` is kept instead of collapsing to the bare tag name.
		// expect(result.find(p => p.selector === 'Child')).toMatchObject({ as: 'em' }); // pre-#4082 baseline
		expect(result.find(p => p.selector === 'Child')).toMatchObject({ as: { element: 'em', slots: null } });
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

		// BREAKING CHANGE (#4082): `slots: null` is kept instead of collapsing to the bare tag name.
		// expect(result.find(p => p.selector === 'Helper')).toMatchObject({ as: 'span' }); // pre-#4082 baseline
		expect(result.find(p => p.selector === 'Helper')).toMatchObject({ as: { element: 'span', slots: null } });
		// expect(result.find(p => p.selector === 'Widget')).toMatchObject({ as: 'span' }); // pre-#4082 baseline
		expect(result.find(p => p.selector === 'Widget')).toMatchObject({ as: { element: 'span', slots: null } });
	});

	test('does not scan a .d.mts ambient declaration file reached during BFS', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		await writeFile(path.join(tmpDir, 'types.d.mts'), 'export const Ambient = () => <button>x</button>;');
		const entrySource = "import { Ambient } from './types.d.mts';\nexport const Entry = () => <Ambient />;";

		const result = await autoScan(entryPath, entrySource);

		expect(result.find(p => p.selector === 'Ambient')).toBeUndefined();
	});

	test('a component rendering a name imported from a package that is not installed does not resolve to a same-named component of the project', async () => {
		await mkdir(path.join(tmpDir, 'ui'));
		await writeFile(path.join(tmpDir, 'ui', 'Button.tsx'), 'export const Button = () => <section>text</section>;');
		await writeFile(
			path.join(tmpDir, 'Card.tsx'),
			"import { Button } from 'ui-lib';\nexport const Card = () => <Button />;",
		);
		const entrySource = [
			"import { Button } from './ui/Button';",
			"import { Card } from './Card';",
			'export const Page = () => <p><Button /><Card /></p>;',
		].join('\n');

		const result = await autoScan(path.join(tmpDir, 'Page.tsx'), entrySource);

		expect(result.find(p => p.selector === 'Button')).toMatchObject({
			as: expect.objectContaining({ element: 'section' }),
		});
		expect(result.find(p => p.selector === 'Card')).toMatchObject({ as: { element: 'Button', slots: null } });
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
		// entry). The .tsx-only counterpart is under 'import depth'.
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

	describe('import depth', () => {
		// entry -> Chain0.tsx -> Chain1.tsx -> ... -> Chain{length-1}.tsx
		const writeTsxChain = async (dir: string, length: number) => {
			for (let i = 0; i < length; i++) {
				const next = i === length - 1 ? null : `import { Chain${i + 1} } from './Chain${i + 1}';\n`;
				const body = next ? `<Chain${i + 1} />` : '<div />';
				await writeFile(
					path.join(dir, `Chain${i}.tsx`),
					`${next ?? ''}export const Chain${i} = () => ${body};`,
				);
			}
		};
		const entrySource = "import { Chain0 } from './Chain0';\nexport const Entry = () => <Chain0 />;";

		test('a .tsx-only chain stops at the default depth of 8', async () => {
			await writeTsxChain(tmpDir, 12);

			const result = await autoScan(path.join(tmpDir, 'entry.tsx'), entrySource);
			const selectors = new Set(result.map(p => p.selector));

			expect(selectors.has('Chain7')).toBe(true);
			expect(selectors.has('Chain8')).toBe(false);
			expect(selectors.has('Chain11')).toBe(false);
		});

		test('`depth` changes where the traversal stops', async () => {
			await writeTsxChain(tmpDir, 12);

			const result = await autoScan(path.join(tmpDir, 'entry.tsx'), entrySource, { depth: 2 });
			const selectors = new Set(result.map(p => p.selector));

			expect(selectors.has('Chain1')).toBe(true);
			expect(selectors.has('Chain2')).toBe(false);
		});

		test('`depth: 0` scans only the entry file', async () => {
			await writeTsxChain(tmpDir, 3);

			const result = await autoScan(path.join(tmpDir, 'entry.tsx'), entrySource, { depth: 0 });
			const selectors = result.map(p => p.selector);

			expect(selectors).toStrictEqual(['Entry']);
		});

		test('a different `depth` for the same entry source is not served from the cache', async () => {
			await writeTsxChain(tmpDir, 4);
			const entryPath = path.join(tmpDir, 'entry.tsx');

			const shallow = await autoScan(entryPath, entrySource, { depth: 1 });
			const deep = await autoScan(entryPath, entrySource);

			expect(shallow.some(p => p.selector === 'Chain1')).toBe(false);
			expect(deep.some(p => p.selector === 'Chain1')).toBe(true);
		});
	});

	test('a styled wrapper of a component declared in another file still resolves without TypeScript following imports', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		await writeFile(path.join(tmpDir, 'Button.tsx'), 'export const Button = () => <button>x</button>;');
		await writeFile(
			path.join(tmpDir, 'Wrapped.tsx'),
			"import { Button } from './Button';\nexport const Wrapped = styled(Button)`color: red;`;",
		);
		const entrySource = "import { Wrapped } from './Wrapped';\nexport const Entry = () => <Wrapped />;";

		const result = await autoScan(entryPath, entrySource);

		// BREAKING CHANGE (#4082): `slots: null` is kept instead of collapsing to the bare tag name.
		// expect(result.find(p => p.selector === 'Wrapped')).toMatchObject({ as: 'button' }); // pre-#4082 baseline
		expect(result.find(p => p.selector === 'Wrapped')).toMatchObject({ as: { element: 'button', slots: null } });
	});

	test('a .tsx entry resolves a .mjs import', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		await writeFile(path.join(tmpDir, 'Child.mjs'), 'export const Child = () => <button>x</button>;');
		const entrySource = "import { Child } from './Child.mjs';\nexport const Entry = () => <Child />;";

		const result = await autoScan(entryPath, entrySource);

		// BREAKING CHANGE (#4082): `slots: null` is kept instead of collapsing to the bare tag name.
		// expect(result.find(p => p.selector === 'Child')).toMatchObject({ as: 'button' }); // pre-#4082 baseline
		expect(result.find(p => p.selector === 'Child')).toMatchObject({ as: { element: 'button', slots: null } });
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
		// BREAKING CHANGE (#4082): `slots: null` is kept instead of collapsing to the bare tag name.
		// expect(second.find(p => p.selector === 'Child')).toMatchObject({ as: 'button' }); // pre-#4082 baseline
		expect(second.find(p => p.selector === 'Child')).toMatchObject({ as: { element: 'button', slots: null } });
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

		// BREAKING CHANGE (#4082): `slots: null` is kept instead of collapsing to the bare tag name.
		// expect(result.find(p => p.selector === 'Child')).toMatchObject({ as: 'span' }); // pre-#4082 baseline
		expect(result.find(p => p.selector === 'Child')).toMatchObject({ as: { element: 'span', slots: null } });
	});
	describe('re-exports (barrel files)', () => {
		const writeUiBarrel = async (dir: string, indexSource: string) => {
			const uiDir = path.join(dir, 'ui');
			await mkdir(uiDir, { recursive: true });
			await writeFile(
				path.join(uiDir, 'Base.tsx'),
				[
					'export type Props = { label: string };',
					'export const Link = ({ children }) => <a href="/">{children}</a>;',
					'export const IconButton = ({ label }) => <button aria-label={label} />;',
				].join('\n'),
			);
			await writeFile(path.join(uiDir, 'index.ts'), indexSource);
			return uiDir;
		};
		const entrySource =
			'import { Link, IconButton } from \'./ui\';\nexport const App = () => <Link><IconButton label="close" /></Link>;';

		test('a named re-export from a barrel resolves to the re-exported component', async () => {
			await writeUiBarrel(tmpDir, "export { Link, IconButton } from './Base';");

			const result = await autoScan(path.join(tmpDir, 'App.tsx'), entrySource);

			expect(result.find(p => p.selector === 'Link')).toMatchObject({
				as: expect.objectContaining({ element: 'a' }),
			});
			expect(result.find(p => p.selector === 'IconButton')).toMatchObject({
				as: expect.objectContaining({ element: 'button' }),
			});
		});

		test('a star re-export from a barrel resolves to the re-exported component', async () => {
			await writeUiBarrel(tmpDir, "export * from './Base';");

			const result = await autoScan(path.join(tmpDir, 'App.tsx'), entrySource);

			expect(result.find(p => p.selector === 'Link')).toMatchObject({
				as: expect.objectContaining({ element: 'a' }),
			});
		});

		test('the walk reaches the module behind a namespace re-export', async () => {
			// Only the walk is checked: the pretender of `<Base.Link>` is the next test's.
			await writeUiBarrel(tmpDir, "export * as Base from './Base';");

			const result = await autoScan(
				path.join(tmpDir, 'App.tsx'),
				"import { Base } from './ui';\nexport const App = () => <Base.Link />;",
			);

			expect(result.find(p => p.selector === 'Link')).toMatchObject({
				as: expect.objectContaining({ element: 'a' }),
			});
		});

		test('a member tag of a namespace re-exported by a barrel is resolved', async () => {
			await writeUiBarrel(tmpDir, "export * as Base from './Base';");

			const result = await autoScan(
				path.join(tmpDir, 'App.tsx'),
				"import { Base } from './ui';\nexport const App = () => <Base.Link />;",
			);

			expect(result.find(p => p.selector === String.raw`Base\.Link`)).toMatchObject({
				as: expect.objectContaining({ element: 'a' }),
			});
		});

		test('a nested barrel chain is followed', async () => {
			const uiDir = await writeUiBarrel(tmpDir, "export * from './buttons';");
			const buttonsDir = path.join(uiDir, 'buttons');
			await mkdir(buttonsDir);
			await writeFile(path.join(buttonsDir, 'index.ts'), "export { Button } from './Button';");
			await writeFile(path.join(buttonsDir, 'Button.tsx'), 'export const Button = () => <button>x</button>;');

			const result = await autoScan(
				path.join(tmpDir, 'App.tsx'),
				"import { Button } from './ui';\nexport const App = () => <Button />;",
			);

			expect(result.find(p => p.selector === 'Button')).toMatchObject({
				as: expect.objectContaining({ element: 'button' }),
			});
		});

		test('a .vue entry resolves a component through a barrel', async () => {
			await writeUiBarrel(tmpDir, "export { Link } from './Base';");

			const result = await autoScan(
				path.join(tmpDir, 'App.vue'),
				['<script setup>', "import { Link } from './ui';", '</script>', '<template><Link /></template>'].join(
					'\n',
				),
			);

			expect(result.find(p => p.selector === 'Link')).toMatchObject({
				as: expect.objectContaining({ element: 'a' }),
			});
		});

		test('an .mdx entry resolves a component it re-exports', async () => {
			await writeUiBarrel(tmpDir, "export { Link } from './Base';");

			const result = await autoScan(
				path.join(tmpDir, 'page.mdx'),
				["export { Link } from './ui';", '', '# Title', '', '<Link>x</Link>'].join('\n'),
			);

			expect(result.find(p => p.selector === 'Link')).toMatchObject({
				as: expect.objectContaining({ element: 'a' }),
			});
		});

		test('a type-only re-export is not followed', async () => {
			await writeUiBarrel(tmpDir, "export type { Props } from './Base';\nexport const version = 1;");

			const result = await autoScan(
				path.join(tmpDir, 'App.tsx'),
				"import { version } from './ui';\nexport const App = () => <div>{version}</div>;",
			);

			expect(result.find(p => p.selector === 'Link')).toBeUndefined();
		});

		test('the hop through a barrel counts towards `depth`', async () => {
			await writeUiBarrel(tmpDir, "export { Link, IconButton } from './Base';");
			const entryPath = path.join(tmpDir, 'App.tsx');

			const shallow = await autoScan(entryPath, entrySource, { depth: 1 });
			const deep = await autoScan(entryPath, entrySource, { depth: 2 });

			expect(shallow.find(p => p.selector === 'Link')).toBeUndefined();
			expect(deep.find(p => p.selector === 'Link')).toMatchObject({
				as: expect.objectContaining({ element: 'a' }),
			});
		});

		test('a component rendering a same-named import through a star barrel resolves to the re-exported one', async () => {
			await mkdir(path.join(tmpDir, 'ui'));
			await mkdir(path.join(tmpDir, 'other'));
			await writeFile(path.join(tmpDir, 'ui', 'index.ts'), "export * from './Item';");
			await writeFile(path.join(tmpDir, 'ui', 'Item.tsx'), 'export const Item = () => <li />;');
			await writeFile(path.join(tmpDir, 'other', 'Item.tsx'), 'export const Item = () => <span />;');
			await writeFile(
				path.join(tmpDir, 'Wrapper.tsx'),
				"import { Item } from './ui';\nexport const Wrapper = () => <Item />;",
			);
			// `other/Item.tsx` is reached first, so a fallback to the flat name
			// index would pick its `Item`.
			const entrySource = [
				"import { Item as OtherItem } from './other/Item';",
				"import { Wrapper } from './Wrapper';",
				'export const App = () => <><OtherItem /><Wrapper /></>;',
			].join('\n');

			const result = await autoScan(path.join(tmpDir, 'App.tsx'), entrySource);

			expect(result.find(p => p.selector === 'Wrapper')).toMatchObject({
				as: expect.objectContaining({ element: 'li' }),
			});
		});

		test('reports the re-exported file as a dependency', async () => {
			const uiDir = await writeUiBarrel(tmpDir, "export { Link, IconButton } from './Base';");
			const dependencies = new Set<string>();

			await autoScan(path.join(tmpDir, 'App.tsx'), entrySource, { dependencies });

			expect(dependencies).toContain(normalizePath(path.join(uiDir, 'Base.tsx')));
		});
	});
});

describe('autoScan: the names the entry file gives its imports', () => {
	let tmpDir: string;

	const img = { element: 'img', slots: null };

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'auto-scan-alias-'));
		await writeFile(path.join(tmpDir, 'Named.tsx'), 'export const Named = () => <img src="x.png" />;');
		await writeFile(
			path.join(tmpDir, 'DefNamed.tsx'),
			'const DefNamed = () => <img src="x.png" />;\nexport default DefNamed;',
		);
		await writeFile(path.join(tmpDir, 'Item.vue'), '<template><img src="x.png" /></template>');
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
		clearAutoScanCache();
	});

	test('a .tsx entry resolves a named import under the name it gives it', async () => {
		const entrySource = "import { Named as A } from './Named';\nexport const P = () => <div><A /></div>;";

		const result = await autoScan(path.join(tmpDir, 'entry.tsx'), entrySource);

		expect(result.find(p => p.selector === 'A')).toMatchObject({ as: img });
		expect(result.find(p => p.selector === 'Named')).toMatchObject({ as: img });
	});

	test('a .tsx entry resolves a default import under any name', async () => {
		const entrySource = "import B from './DefNamed';\nexport const P = () => <div><B /></div>;";

		const result = await autoScan(path.join(tmpDir, 'entry.tsx'), entrySource);

		expect(result.find(p => p.selector === 'B')).toMatchObject({ as: img });
	});

	test('a .tsx entry resolves a template component under the name it gives it', async () => {
		const entrySource = "import Foo from './Item.vue';\nexport const P = () => <div><Foo /></div>;";

		const result = await autoScan(path.join(tmpDir, 'entry.tsx'), entrySource);

		expect(result.find(p => p.selector === 'Foo')).toMatchObject({ as: img });
	});

	test('a .vue entry resolves a .tsx import under the name it gives it', async () => {
		const entrySource = [
			'<script setup>',
			"import { Named as A } from './Named';",
			'</script>',
			'<template><div><A /></div></template>',
		].join('\n');

		const result = await autoScan(path.join(tmpDir, 'Page.vue'), entrySource);

		expect(result.find(p => p.selector === 'A')).toMatchObject({ as: img });
	});

	test('a .vue entry with several roots resolves a renamed import as well', async () => {
		const entrySource = [
			'<script setup>',
			"import { Named as A } from './Named';",
			'</script>',
			'<template><A /><p>text</p></template>',
		].join('\n');

		const result = await autoScan(path.join(tmpDir, 'Page.vue'), entrySource);

		expect(result.find(p => p.selector === 'A')).toMatchObject({ as: img });
	});

	test('an .astro entry resolves a .tsx import under the name it gives it', async () => {
		const entrySource = ['---', "import { Named as A } from './Named';", '---', '<div><A /></div>'].join('\n');

		const result = await autoScan(path.join(tmpDir, 'Page.astro'), entrySource);

		expect(result.find(p => p.selector === 'A')).toMatchObject({ as: img });
	});

	test('an .mdx entry, which is not scanned itself, resolves a .tsx import under the name it gives it', async () => {
		const entrySource = "import { Named as A } from './Named'\n\n<A />\n";

		const result = await autoScan(path.join(tmpDir, 'Page.mdx'), entrySource);

		expect(result.find(p => p.selector === 'A')).toMatchObject({ as: img });
	});

	test('an import that is not renamed gives no second pretender', async () => {
		const entrySource = "import { Named } from './Named';\nexport const P = () => <div><Named /></div>;";

		const result = await autoScan(path.join(tmpDir, 'entry.tsx'), entrySource);

		expect(result.filter(p => p.selector === 'Named')).toHaveLength(1);
	});

	test('two components of the same name that wrap another one are told apart at lint time', async () => {
		for (const dir of ['x', 'y']) {
			await mkdir(path.join(tmpDir, dir));
			await writeFile(
				path.join(tmpDir, dir, 'Item.tsx'),
				"import { Base } from './Base';\nexport const Item = () => <Base />;",
			);
		}
		await writeFile(path.join(tmpDir, 'x', 'Base.tsx'), 'export const Base = () => <img src="x.png" />;');
		await writeFile(path.join(tmpDir, 'y', 'Base.tsx'), 'export const Base = () => <span />;');
		// `x/Item` is scanned first, so the first `Item` is not the one the entry uses.
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const entrySource = [
			"import { Item as Legacy } from './x/Item';",
			"import { Item } from './y/Item';",
			'export const P = () => <div><Legacy /><Item /></div>;',
		].join('\n');

		const scanned = await autoScan(entryPath, entrySource);
		// `autoScan` reports the `filePath` relative to `process.cwd()`.
		const absolute = scanned.map(p => (p.filePath ? { ...p, filePath: path.resolve(p.filePath) } : p));
		const picked = await disambiguatePretenders(absolute, { filePath: entryPath, sourceCode: entrySource });

		expect(picked.filter(p => p.selector === 'Item')).toMatchObject([{ as: { element: 'span' } }]);
	});

	test('the name the entry gives is part of the cached result', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const source = (name: string) =>
			`import { Named as ${name} } from './Named';\nexport const P = () => <div><${name} /></div>;`;

		await autoScan(entryPath, source('A'));
		const result = await autoScan(entryPath, source('Z'));

		expect(result.find(p => p.selector === 'Z')).toMatchObject({ as: img });
		expect(result.find(p => p.selector === 'A')).toBeUndefined();
	});
});
