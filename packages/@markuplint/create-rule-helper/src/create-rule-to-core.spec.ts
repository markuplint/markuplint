import { promises as fs } from 'fs';
import path from 'path';

import { promises as fse } from 'fs-extra'; // for v12

import { createRuleToCore, getRulesDir } from './create-rule-to-core';

const rm =
	'rm' in fs && fs.rm && typeof fs.rm === 'function'
		? // for v14 or later
		  fs.rm || fse.rm
		: // for v12
		  fse.rmdir;

const testDirName1 = '__foo';
const testDirName2 = '__bar';

async function getTestDir(testDirName: string) {
	const rulesDir = await getRulesDir();
	return path.resolve(rulesDir, testDirName);
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
	await expect(createRuleToCore({ name: 'wai-aria', lang: 'JAVASCRIPT', needTest: true })).rejects.toThrow(
		'A new rule "wai-aria" already exists',
	);
});

test('TS', async () => {
	await createRuleToCore({ name: testDirName1, lang: 'TYPESCRIPT', needTest: true });
	const testDir = await getTestDir(testDirName1);
	const fileList = await fs.readdir(testDir, { encoding: 'utf-8' });
	expect(fileList.sort()).toEqual(['README.md', 'index.spec.ts', 'index.ts', 'schema.json']);
});

test('JS', async () => {
	await createRuleToCore({ name: testDirName2, lang: 'JAVASCRIPT', needTest: false });
	const testDir = await getTestDir(testDirName2);
	const fileList = await fs.readdir(testDir, { encoding: 'utf-8' });
	expect(fileList.sort()).toEqual(['README.md', 'index.js', 'schema.json']);
});
