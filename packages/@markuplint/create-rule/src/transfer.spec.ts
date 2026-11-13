import { mkdtemp, realpath, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { test, expect, afterAll, beforeAll } from 'vitest';

import { glob } from './glob.js';
import { transfer } from './transfer.js';

const SCAFFOLD = path.resolve(import.meta.dirname, '..', 'scaffold');

let testSandbox: string;

beforeAll(async () => {
	// `realpath` so that `path.relative` against the glob results matches (macOS `/var` -> `/private/var`)
	testSandbox = await realpath(await mkdtemp(path.join(os.tmpdir(), 'transfer-')));
});

afterAll(async () => {
	await rm(testSandbox, { recursive: true, force: true, maxRetries: 3 });
});

test('transfer', async () => {
	await transfer('package', SCAFFOLD, testSandbox, {
		replacer: {
			pluginName: 'apple',
			ruleName: 'banana',
		},
	});
	const fileList = await glob(path.resolve(testSandbox, '**', '*'));
	expect(fileList.toSorted().map(file => path.relative(testSandbox, file).split(path.sep).join('/'))).toEqual([
		'core',
		'core/README.ja.md',
		'core/README.md',
		'core/index.ts',
		'core/meta.ts',
		'core/schema.json',
		'package',
		'package/README.md',
		'package/src',
		'package/src/index.ts',
		'package/src/rules',
		'package/src/rules/banana.ts',
		'package/tsconfig.json',
		'project',
		'project/index.ts',
		'project/rules',
		'project/rules/banana.ts',
	]);
});
