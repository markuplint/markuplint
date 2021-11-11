import fs from 'fs/promises';
import path from 'path';

import { craeteRuleToCore, getRulesDir } from './create-rule-to-core';

const testDirName1 = '__foo';
const testDirName2 = '__bar';

async function getTestDir(testDirName: string) {
	const rulesDir = await getRulesDir();
	return path.resolve(rulesDir, testDirName);
}

async function removeTestDir() {
	const testDir1 = await getTestDir(testDirName1);
	const testDir2 = await getTestDir(testDirName2);
	await fs.rm(testDir1, { recursive: true, force: true });
	await fs.rm(testDir2, { recursive: true, force: true });
}

beforeAll(async () => {
	await removeTestDir();
});

afterAll(async () => {
	await removeTestDir();
});

test('error', async () => {
	await expect(craeteRuleToCore({ name: 'wai-aria', lang: 'JAVASCRIPT', needTest: true })).rejects.toThrow(
		'A new rule "wai-aria" already exists',
	);
});

test('TS', async () => {
	await craeteRuleToCore({ name: testDirName1, lang: 'TYPESCRIPT', needTest: false });
	const testDir = await getTestDir(testDirName1);
	const fileList = await fs.readdir(testDir, { encoding: 'utf-8' });
	expect(fileList).toEqual(['README.md', 'index.spec.ts', 'index.ts']);
});

test('JS', async () => {
	await craeteRuleToCore({ name: testDirName2, lang: 'JAVASCRIPT', needTest: false });
	const testDir = await getTestDir(testDirName2);
	const fileList = await fs.readdir(testDir, { encoding: 'utf-8' });
	expect(fileList).toEqual(['README.md', 'index.js', 'index.spec.js']);
});
