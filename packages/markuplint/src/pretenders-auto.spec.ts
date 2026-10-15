import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import { setGlobal } from './global-settings.js';
import { mlTestFile } from './testing-tool/index.js';

setGlobal({
	locale: 'en',
});

/**
 * Full pipeline integration test for the `pretenders.auto` feature.
 *
 * @experimental `pretenders.auto` is experimental. These tests guard the
 * cross-package pipeline (config → file-resolver → pretenders' autoScan →
 * MLDOM pretender mapping → rule-based validation) while the feature retains
 * that status.
 *
 * Item.tsx pretends to be a void element (<img>, which forbids children).
 * Whether Item resolves at all is asserted via whether giving it children
 * triggers a permitted-contents violation: resolved → <img> → violation;
 * unresolved → unknown custom element (children permitted) → no violation.
 * This is more reliable than an interactive-content-in-<ul> check, because an
 * unresolved custom element can independently violate content-model rules
 * for reasons unrelated to whether pretender resolution ran.
 */

const jsxParserConfig = { parser: { '\\.tsx$': '@markuplint/jsx-parser' } };

async function writeVoidItemFixture(tmpDir: string) {
	await writeFile(path.join(tmpDir, 'Item.tsx'), 'export const Item = () => <img src="x.png" />;');
	const wrapperPath = path.join(tmpDir, 'Wrapper.tsx');
	await writeFile(
		wrapperPath,
		"import { Item } from './Item';\nexport const Wrapper = () => <div><Item><span>child</span></Item></div>;",
	);
	return wrapperPath;
}

describe('pretenders.auto integration', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-'));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test('auto resolves an imported component without any files/scan config', async () => {
		const wrapperPath = await writeVoidItemFixture(tmpDir);

		const { violations } = await mlTestFile(wrapperPath, {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});

		expect(violations).toStrictEqual([
			expect.objectContaining({
				ruleId: 'permitted-contents',
				severity: 'error',
				raw: '<Item>',
			}),
		]);
	});

	test('without auto (and no other pretenders source), the same import goes unresolved', async () => {
		const wrapperPath = await writeVoidItemFixture(tmpDir);

		const { violations } = await mlTestFile(wrapperPath, {
			...jsxParserConfig,
			rules: { 'permitted-contents': true },
		});

		expect(violations.filter(v => v.ruleId === 'permitted-contents' && v.raw === '<Item>')).toStrictEqual([]);
	});

	test('auto: false leaves the same import unresolved', async () => {
		const wrapperPath = await writeVoidItemFixture(tmpDir);

		const { violations } = await mlTestFile(wrapperPath, {
			...jsxParserConfig,
			pretenders: { auto: false },
			rules: { 'permitted-contents': true },
		});

		expect(violations.filter(v => v.ruleId === 'permitted-contents' && v.raw === '<Item>')).toStrictEqual([]);
	});

	test('auto: { depth: 1 } follows the one import hop to Item', async () => {
		const wrapperPath = await writeVoidItemFixture(tmpDir);

		const { violations } = await mlTestFile(wrapperPath, {
			...jsxParserConfig,
			pretenders: { auto: { depth: 1 } },
			rules: { 'permitted-contents': true },
		});

		expect(violations).toStrictEqual([expect.objectContaining({ ruleId: 'permitted-contents', raw: '<Item>' })]);
	});

	test('auto: { depth: 0 } stops before the imported Item, leaving it unresolved', async () => {
		const wrapperPath = await writeVoidItemFixture(tmpDir);

		const { violations } = await mlTestFile(wrapperPath, {
			...jsxParserConfig,
			pretenders: { auto: { depth: 0 } },
			rules: { 'permitted-contents': true },
		});

		expect(violations.filter(v => v.ruleId === 'permitted-contents' && v.raw === '<Item>')).toStrictEqual([]);
	});

	test('inline data for the same selector wins over the auto-resolved mapping', async () => {
		// data maps Item to <div> (children permitted), overriding the
		// auto-resolved <img> (void, children forbidden). A clean result here
		// can only mean data's mapping was used — if auto's <img> had won,
		// the child <span> would trigger a permitted-contents violation.
		const wrapperPath = await writeVoidItemFixture(tmpDir);

		const { violations } = await mlTestFile(wrapperPath, {
			...jsxParserConfig,
			pretenders: { auto: true, data: [{ selector: 'Item', as: 'div' }] },
			rules: { 'permitted-contents': true },
		});

		expect(violations.filter(v => v.ruleId === 'permitted-contents')).toStrictEqual([]);
	});

	test('unresolved member-expression component does not trigger false positive (issue #4231)', async () => {
		const appPath = path.join(tmpDir, 'App.tsx');
		await writeFile(
			appPath,
			[
				"import { Tabs } from '@base-ui/react';",
				'export const MyTabs = () => <Tabs.Root><div>Content</div></Tabs.Root>;',
				'export const App = () => <div><MyTabs /></div>;',
			].join('\n'),
		);

		const { violations } = await mlTestFile(appPath, {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});

		expect(violations.filter(v => v.ruleId === 'permitted-contents')).toStrictEqual([]);
	});

	test('unresolved motion.div member-expression component does not trigger false positive', async () => {
		const appPath = path.join(tmpDir, 'App.tsx');
		await writeFile(
			appPath,
			[
				"import { motion } from 'framer-motion';",
				'export const MyMotion = () => <motion.div><div>Content</div></motion.div>;',
				'export const App = () => <div><MyMotion /></div>;',
			].join('\n'),
		);

		const { violations } = await mlTestFile(appPath, {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});

		expect(violations.filter(v => v.ruleId === 'permitted-contents')).toStrictEqual([]);
	});

	test('unresolved standalone component identifier does not trigger false positive', async () => {
		const appPath = path.join(tmpDir, 'App.tsx');
		await writeFile(
			appPath,
			[
				"import { ExternalDialog } from 'external-dialog-lib';",
				'export const MyDialog = () => <ExternalDialog><div>Content</div></ExternalDialog>;',
				'export const App = () => <div><MyDialog /></div>;',
			].join('\n'),
		);

		const { violations } = await mlTestFile(appPath, {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});

		expect(violations.filter(v => v.ruleId === 'permitted-contents')).toStrictEqual([]);
	});

	test('invalid authored HTML inside children is still caught when wrapping unresolved components', async () => {
		const appPath = path.join(tmpDir, 'App.tsx');
		await writeFile(
			appPath,
			[
				"import { Tabs } from '@base-ui/react';",
				'export const MyTabs = () => <Tabs.Root><ul><div>Invalid child in ul</div></ul></Tabs.Root>;',
			].join('\n'),
		);

		const { violations } = await mlTestFile(appPath, {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});

		expect(violations).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					ruleId: 'permitted-contents',
					message: expect.stringContaining('The "div" element is not allowed in the "ul" element'),
				}),
			]),
		);
	});
});
