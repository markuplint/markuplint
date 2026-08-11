import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import { clearPretenderCaches, jsxScanner } from './index.js';

describe('clearPretenderCaches (long-running processes)', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-clear-cache-'));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test('picks up a renamed default export across a re-scan without needing clearPretenderCaches()', async () => {
		const targetFile = path.join(tmpDir, 'target.tsx');
		const importerFile = path.join(tmpDir, 'importer.tsx');
		await writeFile(targetFile, 'export default function Item() { return <button>x</button>; }');
		await writeFile(importerFile, "import Item from './target';\nexport const E = () => <Item>x</Item>;");

		const before = await jsxScanner([targetFile, importerFile], { cwd: tmpDir });
		expect(before.find(p => p.selector === 'E')?.as).toBe('button');

		// Both jsxScanner's parsed-SourceFile cache and dependency-mapper's
		// export-table cache are keyed on file content, not mtime — so a
		// renamed export is picked up on the very next scan, with no explicit
		// invalidation call needed for this kind of change. (Other caches —
		// module resolution, tsconfig parsing — are content-independent and
		// still require clearPretenderCaches(); see
		// resolve-module-file.spec.ts's "picks up a newly added tsconfig
		// `paths` alias" test for that contract.)
		await writeFile(targetFile, 'export default function Widget() { return <span>x</span>; }');
		const afterRename = await jsxScanner([targetFile, importerFile], { cwd: tmpDir });
		expect(afterRename.find(p => p.selector === 'E')?.as).toBe('span');

		// clearPretenderCaches() remains safe to call regardless — it must not
		// be required, but calling it anyway (e.g. from generic watch-mode
		// invalidation logic) must not break anything either.
		clearPretenderCaches();

		const fresh = await jsxScanner([targetFile, importerFile], { cwd: tmpDir });
		expect(fresh.find(p => p.selector === 'E')?.as).toBe('span');
	});
});
