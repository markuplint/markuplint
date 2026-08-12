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

	test('picks up a renamed default export across a re-scan', async () => {
		const targetFile = path.join(tmpDir, 'target.tsx');
		const importerFile = path.join(tmpDir, 'importer.tsx');
		await writeFile(targetFile, 'export default function Item() { return <button>x</button>; }');
		await writeFile(importerFile, "import Item from './target';\nexport const E = () => <Item>x</Item>;");

		const before = await jsxScanner([targetFile, importerFile], { cwd: tmpDir });
		expect(before.find(p => p.selector === 'E')?.as).toBe('button');

		// Rename the default-exported declaration. Without cache invalidation,
		// resolution keeps looking up the map key for the old local name
		// ("Item"), which no longer exists after the rename, leaving `E`
		// unresolved instead of picking up the new declaration.
		await writeFile(targetFile, 'export default function Widget() { return <span>x</span>; }');
		const stale = await jsxScanner([targetFile, importerFile], { cwd: tmpDir });
		expect(stale.find(p => p.selector === 'E')?.as).toBe('Item');

		clearPretenderCaches();

		const fresh = await jsxScanner([targetFile, importerFile], { cwd: tmpDir });
		expect(fresh.find(p => p.selector === 'E')?.as).toBe('span');
	});
});
