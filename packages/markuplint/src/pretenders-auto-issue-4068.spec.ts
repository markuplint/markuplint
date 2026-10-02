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
 * Issue #4068: `require-owned-elements` read only the children given at the
 * usage site, so a component that renders its own owned elements (`contents`
 * or a slot wrapper of the pretender) was reported as missing them.
 */

const config = {
	parser: { '\\.tsx$': '@markuplint/jsx-parser' },
	specs: { '\\.tsx$': '@markuplint/react-spec' },
	pretenders: { auto: true },
	rules: { 'require-owned-elements': true },
};

const components = {
	'Items.tsx': `
export function Items() {
	return (
		<ul role="list">
			<li>one</li>
			<li>two</li>
		</ul>
	);
}`,
	'Tabs.tsx': `
export function Tabs() {
	return (
		<div role="tablist">
			<button type="button" role="tab">A</button>
		</div>
	);
}`,
	'Menu.tsx': `
export function Menu({ children }) {
	return (
		<nav>
			<ul>{children}</ul>
		</nav>
	);
}`,
	'Plain.tsx': `
export function Plain({ children }) {
	return <ul>{children}</ul>;
}`,
	'Rows.tsx': `
export function Rows() {
	return (
		<ul role="list">
			<div>not an item</div>
		</ul>
	);
}`,
};

describe('pretenders.auto: issue #4068', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-4068-'));
		for (const [name, code] of Object.entries(components)) {
			await writeFile(path.join(tmpDir, name), code);
		}
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	async function lint(body: string) {
		const imports = Object.keys(components)
			.map(name => name.replace('.tsx', ''))
			.map(name => `import { ${name} } from './${name}';`)
			.join('\n');
		const file = path.join(tmpDir, 'usage.tsx');
		await writeFile(file, `${imports}\nexport function Example() {\n\treturn (\n${body}\n\t);\n}\n`);
		const { violations } = await mlTestFile(file, config);
		return violations.map(v => `${v.ruleId}: ${v.raw}`);
	}

	test('a component that renders the list items itself owns them', async () => {
		expect(await lint('<Items />')).toStrictEqual([]);
	});

	test('a component that renders the tabs itself owns them', async () => {
		expect(await lint('<Tabs />')).toStrictEqual([]);
	});

	test('a component that renders something other than list items does not own them', async () => {
		expect(await lint('<Rows />')).toStrictEqual(['require-owned-elements: <Rows />']);
	});

	test('the children given to a component that renders them inside its list are its list items', async () => {
		expect(await lint('<Menu><li>a</li></Menu>')).toStrictEqual([]);
		expect(await lint('<Menu></Menu>')).toStrictEqual(['require-owned-elements: <Menu>']);
	});

	test('the children given at the usage site still decide for a component that renders none itself', async () => {
		expect(await lint('<Plain><li>a</li></Plain>')).toStrictEqual([]);
		expect(await lint('<Plain></Plain>')).toStrictEqual(['require-owned-elements: <Plain>']);
	});
});
