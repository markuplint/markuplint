import { mkdir, mkdtemp, readdir, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { test, expect, afterAll, beforeAll, vi } from 'vitest';

import { createRuleToCore, getRulesDir } from './create-rule-to-core.js';
import { fsExists } from './fs-exists.js';
import { searchCoreRepository } from './search-core-repository.js';

// The scaffold must not be written into the repository's own `packages/@markuplint/rules/src`:
// test files run in parallel, and a spec that enumerates the rules (`ja-locale-coverage.spec.ts`)
// would read the scaffold while it exists. `searchCoreRepository` resolves the root from
// `process.cwd()`, so it is the one seam that decides where the scaffold goes. It defaults to the real
// implementation: the `error` test relies on the real repository, where `wai-aria` already exists,
// and only the `create` test points it at the sandbox.
vi.mock('./search-core-repository.js', async importOriginal => {
	const original = await importOriginal<{ searchCoreRepository: typeof searchCoreRepository }>();
	return { searchCoreRepository: vi.fn(original.searchCoreRepository) };
});

const sandboxDirName = '__foo';

let sandboxRoot: string;

beforeAll(async () => {
	// `realpath` so that the sandbox path equals what `path.relative` sees (macOS `/var` -> `/private/var`)
	sandboxRoot = await realpath(await mkdtemp(path.join(os.tmpdir(), 'create-rule-to-core-')));
	await mkdir(path.resolve(sandboxRoot, 'packages', '@markuplint', 'rules', 'src'), { recursive: true });
});

afterAll(async () => {
	await rm(sandboxRoot, { recursive: true, force: true, maxRetries: 3 });
});

test('error', async () => {
	await expect(
		createRuleToCore({
			pluginName: '',
			ruleName: 'wai-aria',
			lang: 'JAVASCRIPT',
			needTest: true,
			core: { description: 'Desc', category: 'cat', severity: 'error' },
		}),
	).rejects.toThrow('A new rule "wai-aria" already exists');
});

test('create', async () => {
	const repositoryRulesDir = await getRulesDir();
	vi.mocked(searchCoreRepository).mockResolvedValue(sandboxRoot);
	try {
		await createRuleToCore({
			pluginName: '',
			ruleName: sandboxDirName,
			lang: 'TYPESCRIPT',
			needTest: true,
			core: { description: 'Desc', category: 'cat', severity: 'error' },
		});
		const testDir = path.resolve(sandboxRoot, 'packages', '@markuplint', 'rules', 'src', sandboxDirName);
		const fileList = await readdir(testDir, { encoding: 'utf8' });
		expect(fileList.toSorted()).toEqual([
			'README.ja.md',
			'README.md',
			'index.spec.ts',
			'index.ts',
			'meta.ts',
			'schema.json',
		]);
		expect(await fsExists(path.resolve(repositoryRulesDir, sandboxDirName))).toBe(false);
	} finally {
		vi.mocked(searchCoreRepository).mockReset();
	}
});
