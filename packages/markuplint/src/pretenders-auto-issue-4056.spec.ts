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
 * Issue #4056: `require-accessible-name` read only the children given at the
 * usage site, so a component that renders its own accessible content
 * (`contents` of the pretender) was reported as unnamed.
 */

const config = {
	parser: { '\\.tsx$': '@markuplint/jsx-parser' },
	specs: { '\\.tsx$': '@markuplint/react-spec' },
	pretenders: { auto: true },
	rules: { 'require-accessible-name': true },
};

const components = {
	'IconOnly.tsx': `
export function IconOnly() {
	return (
		<button type="button">
			<img src="a.png" alt="Save" />
		</button>
	);
}`,
	'Unnamed.tsx': `
export function Unnamed() {
	return (
		<button type="button">
			<img src="a.png" alt="" />
		</button>
	);
}`,
	'Action.tsx': `
export function Action({ children }) {
	return (
		<button type="button">
			<img src="a.png" alt="Save" />
			{children}
		</button>
	);
}`,
	'Plain.tsx': `
export function Plain({ children }) {
	return <button type="button">{children}</button>;
}`,
};

describe('pretenders.auto: issue #4056', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-4056-'));
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

	test('a component that renders an image with a text alternative has an accessible name', async () => {
		expect(await lint('<IconOnly />')).toStrictEqual([]);
	});

	test('an image without a text alternative does not name the component', async () => {
		expect(await lint('<Unnamed />')).toStrictEqual(['require-accessible-name: <Unnamed />']);
	});

	test('the name comes from the rendered image together with the children given at the usage site', async () => {
		expect(await lint('<Action />')).toStrictEqual([]);
		expect(await lint('<Action>Label</Action>')).toStrictEqual([]);
	});

	test('text written inside a component that never renders its children is not its name', async () => {
		expect(await lint('<Unnamed>Save</Unnamed>')).toStrictEqual(['require-accessible-name: <Unnamed>']);
	});

	test('the children given at the usage site still name a component that renders none itself', async () => {
		expect(await lint('<Plain>Label</Plain>')).toStrictEqual([]);
		expect(await lint('<Plain></Plain>')).toStrictEqual(['require-accessible-name: <Plain>']);
	});
});
