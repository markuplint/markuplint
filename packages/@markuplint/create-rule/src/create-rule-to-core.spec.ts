import { rm, readdir } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

import { test, expect, afterAll, beforeAll } from 'vitest';

import { createRuleToCore, getRulesDir } from './create-rule-to-core.js';

const sandboxDirName = '__foo';

async function getTestDir(testDirName: string) {
	const rulesDir = await getRulesDir();
	return resolve(rulesDir, testDirName);
}

async function removeTestDir() {
	const sandboxDir = await getTestDir(sandboxDirName);
	const sandboxDirTest = sandboxDir.replace(`${sep}src${sep}`, `${sep}test${sep}`);
	await rm(sandboxDir, { recursive: true, force: true });
	await rm(sandboxDirTest, { recursive: true, force: true });
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
	await createRuleToCore({
		pluginName: '',
		ruleName: sandboxDirName,
		lang: 'TYPESCRIPT',
		needTest: true,
		core: { description: 'Desc', category: 'cat', severity: 'error' },
	});
	const testDir = await getTestDir(sandboxDirName);
	const fileList = await readdir(testDir, { encoding: 'utf8' });
	expect(fileList.sort()).toEqual(['README.ja.md', 'README.md', 'index.spec.ts', 'index.ts', 'schema.json']);
});
