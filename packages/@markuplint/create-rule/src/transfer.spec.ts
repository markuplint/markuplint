import { rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { test, expect, afterAll, beforeAll } from 'vitest';

import { glob } from './glob.js';
import { transfer } from './transfer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCAFFOLD = path.resolve(__dirname, '..', 'scaffold');
const TEST_SANDBOX = path.resolve(__dirname, '..', '__test_sandbox__');

async function removeTestDir() {
	await rm(TEST_SANDBOX, { recursive: true, force: true });
}

async function delay(ms: number) {
	await new Promise(r => setTimeout(r, ms));
}

beforeAll(async () => {
	await removeTestDir();
	await delay(500);
});

afterAll(async () => {
	await delay(500);
	await removeTestDir();
});

test('transfer', async () => {
	await transfer('package', SCAFFOLD, TEST_SANDBOX, {
		replacer: {
			pluginName: 'apple',
			ruleName: 'banana',
		},
	});
	const fileList = await glob(path.resolve(TEST_SANDBOX, '**', '*'));
	expect(fileList.toSorted().map(file => path.relative(TEST_SANDBOX, file).split(path.sep).join('/'))).toEqual([
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
