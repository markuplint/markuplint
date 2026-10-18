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
 * A component loaded with `React.lazy(() => import('./X'))` is a module reference
 * like a static `import`, so the file behind it is scanned.
 */
describe('pretenders.auto with a lazily loaded component', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-lazy-'));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test('a lazy component that pretends to be a void element is checked against its children', async () => {
		await writeFile(
			path.join(tmpDir, 'Item.tsx'),
			'export const Item = () => <img src="x.png" />;\nexport default Item;',
		);
		const wrapperPath = path.join(tmpDir, 'Wrapper.tsx');
		await writeFile(
			wrapperPath,
			[
				"import { lazy } from 'react';",
				"const Item = lazy(() => import('./Item'));",
				'export const Wrapper = () => <div><Item><span>c</span></Item></div>;',
			].join('\n'),
		);

		const { violations } = await mlTestFile(wrapperPath, {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});

		expect(violations).toStrictEqual([
			expect.objectContaining({ ruleId: 'permitted-contents', severity: 'error', raw: '<Item>' }),
		]);
	});

	test('a lazy component held in a variable of another name is checked against its children', async () => {
		await writeFile(
			path.join(tmpDir, 'Item.tsx'),
			'export const Item = () => <img src="x.png" />;\nexport default Item;',
		);
		const wrapperPath = path.join(tmpDir, 'Wrapper.tsx');
		await writeFile(
			wrapperPath,
			[
				"import { lazy } from 'react';",
				"const Foo = lazy(() => import('./Item'));",
				'export const Wrapper = () => <div><Foo><span>c</span></Foo></div>;',
			].join('\n'),
		);

		const { violations } = await mlTestFile(wrapperPath, {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});

		expect(violations).toStrictEqual([
			expect.objectContaining({ ruleId: 'permitted-contents', severity: 'error', raw: '<Foo>' }),
		]);
	});

	test('a member tag of a namespace import is checked against its children', async () => {
		await writeFile(path.join(tmpDir, 'Item.tsx'), 'export const Item = () => <img src="x.png" />;');
		const wrapperPath = path.join(tmpDir, 'Wrapper.tsx');
		await writeFile(
			wrapperPath,
			[
				"import * as UI from './Item';",
				'export const Wrapper = () => <div><UI.Item><span>c</span></UI.Item></div>;',
			].join('\n'),
		);

		const { violations } = await mlTestFile(wrapperPath, {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});

		expect(violations).toStrictEqual([
			expect.objectContaining({ ruleId: 'permitted-contents', severity: 'error', raw: '<UI.Item>' }),
		]);
	});

	test('a member tag of a namespace import that renders what its parent requires is not reported', async () => {
		await writeFile(path.join(tmpDir, 'Row.tsx'), 'export const Row = () => <li>row</li>;');
		const listPath = path.join(tmpDir, 'List.tsx');
		await writeFile(
			listPath,
			["import * as UI from './Row';", 'export const List = () => <ul><UI.Row /></ul>;'].join('\n'),
		);

		const { violations } = await mlTestFile(listPath, {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});

		expect(violations).toStrictEqual([]);
	});

	test('a lazy component that renders what its parent requires is not reported', async () => {
		await writeFile(path.join(tmpDir, 'Row.tsx'), 'export const Row = () => <li>row</li>;\nexport default Row;');
		const listPath = path.join(tmpDir, 'List.tsx');
		await writeFile(
			listPath,
			[
				"import { lazy } from 'react';",
				"const Row = lazy(() => import('./Row'));",
				'export const List = () => <ul><Row /></ul>;',
			].join('\n'),
		);

		const { violations } = await mlTestFile(listPath, {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});

		expect(violations).toStrictEqual([]);
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

describe('pretenders.auto with a component imported under another name', () => {
	let tmpDir: string;

	const parserConfig = {
		parser: {
			'\\.tsx$': '@markuplint/jsx-parser',
			'\\.vue$': '@markuplint/vue-parser',
			'\\.astro$': '@markuplint/astro-parser',
		},
	};

	async function lint(file: string) {
		const { violations } = await mlTestFile(path.join(tmpDir, file), {
			...parserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});
		return violations.map(v => `${v.ruleId}: ${v.raw}`);
	}

	async function write(files: Record<string, string>) {
		for (const [file, content] of Object.entries(files)) {
			await mkdir(path.dirname(path.join(tmpDir, file)), { recursive: true });
			await writeFile(path.join(tmpDir, file), content);
		}
	}

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-alias-'));
		await write({
			'Named.tsx': 'export const Named = () => <img src="x.png" />;',
			'DefNamed.tsx': 'const DefNamed = () => <img src="x.png" />;\nexport default DefNamed;',
			'Item.vue': '<template><img src="x.png" /></template>\n',
		});
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test('a named import under another name', async () => {
		await write({
			'Page.tsx':
				"import { Named as A } from './Named';\nexport const Page = () => <div><A><span>c</span></A></div>;",
		});

		expect(await lint('Page.tsx')).toStrictEqual(['permitted-contents: <A>']);
	});

	test('a default import under another name', async () => {
		await write({
			'Page.tsx': "import B from './DefNamed';\nexport const Page = () => <div><B><span>c</span></B></div>;",
		});

		expect(await lint('Page.tsx')).toStrictEqual(['permitted-contents: <B>']);
	});

	test('a Vue component imported under another name', async () => {
		await write({
			'Page.vue': `<script setup>
import Foo from './Item.vue';
</script>
<template><div><Foo><span>c</span></Foo></div></template>
`,
		});

		expect(await lint('Page.vue')).toStrictEqual(['permitted-contents: <Foo>']);
	});

	test('a component of a .tsx file imported by an Astro page under another name', async () => {
		await write({
			'Page.astro': `---
import { Named as A } from './Named';
---
<div><A><span>c</span></A></div>
`,
		});

		expect(await lint('Page.astro')).toStrictEqual(['permitted-contents: <A>']);
	});

	test('the component the import leads to is used, not a same-named one of the project', async () => {
		await write({
			'Item.tsx': 'export const Item = () => <div />;',
			'Card.tsx': "import { Item } from './Item';\nexport const Card = () => <Item />;",
			'Page.tsx': [
				"import { Card } from './Card';",
				"import { Named as Item } from './Named';",
				'export const Page = () => <div><Card /><Item><span>c</span></Item></div>;',
			].join('\n'),
		});

		expect(await lint('Page.tsx')).toStrictEqual(['permitted-contents: <Item>']);
	});

	test('the same, when the component it leads to wraps another one', async () => {
		await write({
			'Img.tsx': 'export const Img = () => <img src="x.png" />;',
			'Wrapped.tsx': "import { Img } from './Img';\nexport const Wrapped = () => <Img />;",
			'Item.tsx': 'export const Item = () => <div />;',
			'Card.tsx': "import { Item } from './Item';\nexport const Card = () => <Item />;",
			'Page.tsx': [
				"import { Card } from './Card';",
				"import { Wrapped as Item } from './Wrapped';",
				'export const Page = () => <div><Card /><Item><span>c</span></Item></div>;',
			].join('\n'),
		});

		expect(await lint('Page.tsx')).toStrictEqual(['permitted-contents: <Item>']);
	});

	test('an import of a package under another name is not resolved to a component of the project', async () => {
		await write({
			'node_modules/button-library/package.json': '{"name":"button-library","main":"index.js"}',
			'node_modules/button-library/index.js': 'export const Button = () => null;',
			'ui/Button.tsx': 'export const Button = () => <img src="x.png" />;',
			'Other.tsx': "import { Button } from './ui/Button';\nexport const Other = () => <Button />;",
			'Page.tsx': [
				"import { Button as B } from 'button-library';",
				"import { Other } from './Other';",
				'export const Page = () => <div><Other /><B><span>c</span></B></div>;',
			].join('\n'),
		});
		expect(await lint('Page.tsx')).toStrictEqual([]);
	});
});

describe('pretenders.auto with a component that is an anonymous default export', () => {
	let tmpDir: string;

	async function lint(file: string) {
		const { violations } = await mlTestFile(path.join(tmpDir, file), {
			...jsxParserConfig,
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});
		return violations.map(v => `${v.ruleId}: ${v.raw}`);
	}

	async function write(files: Record<string, string>) {
		for (const [file, content] of Object.entries(files)) {
			await writeFile(path.join(tmpDir, file), content);
		}
	}

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-anon-default-'));
		await write({
			'AnonArrow.tsx': 'export default () => <img src="x.png" />;',
			'AnonFn.tsx': 'export default function () { return <img src="x.png" />; }',
			'MemoAnon.tsx': 'import { memo } from \'react\';\nexport default memo(() => <img src="x.png" />);',
		});
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test.each(['AnonArrow', 'AnonFn', 'MemoAnon'])('%s imported under its file name', async name => {
		await write({
			'Page.tsx': `import ${name} from './${name}';\nexport const Page = () => <div><${name}><span>c</span></${name}></div>;`,
		});

		expect(await lint('Page.tsx')).toStrictEqual([`permitted-contents: <${name}>`]);
	});

	test('imported under another name', async () => {
		await write({
			'Page.tsx': "import X from './AnonArrow';\nexport const Page = () => <div><X><span>c</span></X></div>;",
		});

		expect(await lint('Page.tsx')).toStrictEqual(['permitted-contents: <X>']);
	});

	test('a named export of the same name in the same file is not taken for it', async () => {
		await write({
			'Button.tsx': 'export const Button = () => <div />;\nexport default () => <img src="x.png" />;',
			'Page.tsx': [
				"import Button from './Button';",
				'export const Page = () => <div><Button><span>c</span></Button></div>;',
			].join('\n'),
		});

		expect(await lint('Page.tsx')).toStrictEqual(['permitted-contents: <Button>']);
	});

	test('nor is it taken for a named export that has no component', async () => {
		await write({
			'Button.tsx': [
				'/** @pretends null */',
				'export function Button() { return <div />; }',
				'export default () => <img src="x.png" />;',
			].join('\n'),
			'Page.tsx': [
				"import B, { Button } from './Button';",
				'export const Page = () => <div><Button><span>c</span></Button><B><span>c</span></B></div>;',
			].join('\n'),
		});

		// `<B>` is the default export, which is resolved: the scan ran, and `<Button>` alone has none.
		expect(await lint('Page.tsx')).toStrictEqual(['permitted-contents: <B>']);
	});

	test('nor is it taken for the named export', async () => {
		await write({
			'Button.tsx': 'export const Button = () => <img src="x.png" />;\nexport default () => <div />;',
			'Page.tsx': [
				"import { Button } from './Button';",
				'export const Page = () => <div><Button><span>c</span></Button></div>;',
			].join('\n'),
		});

		expect(await lint('Page.tsx')).toStrictEqual(['permitted-contents: <Button>']);
	});
});
