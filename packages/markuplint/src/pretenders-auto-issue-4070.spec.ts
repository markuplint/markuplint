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
 * An attribute that a component passes on to another component reaches the element
 * only through the props that the inner component passes on: a prop that is passed
 * as it is (`aria-label={label}`) takes what the usage site writes, and a component
 * that renders another one passes on its own prop, or none.
 */

const config = {
	parser: { '\\.tsx$': '@markuplint/jsx-parser' },
	specs: { '\\.tsx$': '@markuplint/react-spec' },
	pretenders: { auto: true },
	rules: { 'require-accessible-name': true },
};

const components = {
	'IconButton.tsx': `
export function IconButton({ label }) {
	return <button aria-label={label} />;
}`,
	'Fancy.tsx': `
import { IconButton } from './IconButton';

export function Fancy({ title }) {
	return <IconButton label={title} />;
}`,
	'Fixed.tsx': `
import { IconButton } from './IconButton';

export function Fixed() {
	return <IconButton label="Fixed" />;
}`,
	'Forgetful.tsx': `
import { IconButton } from './IconButton';

export function Forgetful() {
	return <IconButton />;
}`,
	'Forwarder.tsx': `
import { IconButton } from './IconButton';

export function Forwarder(props) {
	return <IconButton {...props} />;
}`,
	'Banner.tsx': `
import { Fancy } from './Fancy';

export function Banner({ heading }) {
	return <Fancy title={heading} />;
}`,
};

describe('pretenders.auto: a prop passed on through a chain of components', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-4070-'));
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

	test('the prop that the usage site writes is the name', async () => {
		expect(await lint('<IconButton label="Save" />')).toStrictEqual([]);
	});

	test('a prop that the usage site does not write gives no name', async () => {
		expect(await lint('<IconButton />')).toStrictEqual(['require-accessible-name: <IconButton />']);
	});

	test('an expression at the usage site may be the name', async () => {
		expect(await lint('<IconButton label={text} />')).toStrictEqual([]);
	});

	test('a component that passes its own prop on gives the name through it', async () => {
		expect(await lint('<Fancy title="Save" />')).toStrictEqual([]);
		expect(await lint('<Fancy />')).toStrictEqual(['require-accessible-name: <Fancy />']);
	});

	test('it follows a chain of three components', async () => {
		expect(await lint('<Banner heading="Save" />')).toStrictEqual([]);
		expect(await lint('<Banner />')).toStrictEqual(['require-accessible-name: <Banner />']);
	});

	test('a component that writes the value itself has the name whatever the usage site writes', async () => {
		expect(await lint('<Fixed />')).toStrictEqual([]);
	});

	test('a component that does not pass the prop on gives no name, even if the usage site writes it', async () => {
		expect(await lint('<Forgetful label="Save" />')).toStrictEqual([
			'require-accessible-name: <Forgetful label="Save" />',
		]);
	});

	test('a component that spreads its props hands over what the usage site writes', async () => {
		expect(await lint('<Forwarder label="Save" />')).toStrictEqual([]);
		expect(await lint('<Forwarder />')).toStrictEqual(['require-accessible-name: <Forwarder />']);
	});
});
