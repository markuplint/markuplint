import { rm, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import { createRuleToCore, getRulesDir } from './create-rule-to-core';

const testDirName1 = '__foo';
const testDirName2 = '__bar';

async function getTestDir(testDirName: string) {
	const rulesDir = await getRulesDir();
	return resolve(rulesDir, testDirName);
}

async function removeTestDir() {
	const testDir1 = await getTestDir(testDirName1);
	const testDir2 = await getTestDir(testDirName2);
	await rm(testDir1, { recursive: true, force: true });
	await rm(testDir2, { recursive: true, force: true });
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

test('TS', async () => {
	await createRuleToCore({
		pluginName: '',
		ruleName: testDirName1,
		lang: 'TYPESCRIPT',
		needTest: true,
		core: { description: 'Desc', category: 'cat', severity: 'error' },
	});
	const testDir = await getTestDir(testDirName1);
	const fileList = await readdir(testDir, { encoding: 'utf-8' });
	expect(fileList.sort()).toEqual(['README.ja.md', 'README.md', 'index.spec.ts', 'index.ts', 'schema.json']);
});

test('JS', async () => {
	await createRuleToCore({
		pluginName: '',
		ruleName: testDirName2,
		lang: 'JAVASCRIPT',
		needTest: false,
		core: { description: 'Desc', category: 'cat', severity: 'error' },
	});
	const testDir = await getTestDir(testDirName2);
	const fileList = await readdir(testDir, { encoding: 'utf-8' });
	expect(fileList.sort()).toEqual(['README.ja.md', 'README.md', 'index.js', 'schema.json']);
});
