import { writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
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
});

/**
 * The chain of a wrapper ends at a component the scanner cannot resolve: it does
 * not traverse `node_modules`, so `Tabs.Root` of a package is the last name it
 * has. That name must not be checked as an HTML element.
 */
describe('pretenders.auto with a component that cannot be resolved', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-unresolved-'));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test('a wrapper of a member expression of a package is not reported as an unknown element', async () => {
		await writeFile(
			path.join(tmpDir, 'MyTabs.tsx'),
			"import { Tabs } from 'tabs-library';\nexport const MyTabs = ({ children }) => <Tabs.Root>{children}</Tabs.Root>;",
		);
		const pagePath = path.join(tmpDir, 'Page.tsx');
		await writeFile(
			pagePath,
			"import { MyTabs } from './MyTabs';\nexport const Page = () => <div><MyTabs>text</MyTabs></div>;",
		);

		const { violations } = await mlTestFile(pagePath, {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});

		expect(violations).toStrictEqual([]);
	});

	test('a wrapper of a component of a package is not reported as an unknown element', async () => {
		await writeFile(
			path.join(tmpDir, 'MyDialog.tsx'),
			"import { Dialog } from 'dialog-library';\nexport const MyDialog = ({ children }) => <Dialog>{children}</Dialog>;",
		);
		const pagePath = path.join(tmpDir, 'Page.tsx');
		await writeFile(
			pagePath,
			"import { MyDialog } from './MyDialog';\nexport const Page = () => <p><MyDialog>text</MyDialog></p>;",
		);

		const { violations } = await mlTestFile(pagePath, {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});

		expect(violations).toStrictEqual([]);
	});

	test('a wrapper of a component of an installed package is not resolved to a same-named component of the project', async () => {
		const libDir = path.join(tmpDir, 'node_modules', 'button-library');
		await mkdir(libDir, { recursive: true });
		await writeFile(path.join(libDir, 'package.json'), '{"name":"button-library","main":"index.js"}');
		await writeFile(path.join(libDir, 'index.js'), 'export const Button = () => null;');
		await mkdir(path.join(tmpDir, 'ui'));
		await writeFile(path.join(tmpDir, 'ui', 'Button.tsx'), 'export const Button = () => <section>text</section>;');
		await writeFile(
			path.join(tmpDir, 'Card.tsx'),
			"import { Button } from 'button-library';\nexport const Card = ({ children }) => <Button>{children}</Button>;",
		);
		const pagePath = path.join(tmpDir, 'Page.tsx');
		await writeFile(
			pagePath,
			"import { Card } from './Card';\nimport { Button } from './ui/Button';\nexport const Page = () => <p><Card>text</Card></p>;",
		);

		const { violations } = await mlTestFile(pagePath, {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});

		expect(violations).toStrictEqual([]);
	});

	test('the HTML written inside such a wrapper is still checked against what the wrapper renders around it', async () => {
		await writeFile(
			path.join(tmpDir, 'MyList.tsx'),
			"import { ScrollArea } from 'scroll-library';\nexport const MyList = ({ children }) => <ScrollArea.Root><ul>{children}</ul></ScrollArea.Root>;",
		);
		const pagePath = path.join(tmpDir, 'Page.tsx');
		await writeFile(
			pagePath,
			"import { MyList } from './MyList';\nexport const Page = () => <MyList><div /></MyList>;",
		);

		const { violations } = await mlTestFile(pagePath, {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});

		expect(violations).toStrictEqual([
			expect.objectContaining({
				ruleId: 'permitted-contents',
				severity: 'error',
				raw: '<div />',
				message: 'The "div" element is not allowed in the "ul" element in this context',
			}),
		]);
	});
});
