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
 * Issue #4057: a component that renders another component took the pretender of
 * the latter wholesale, so what it renders around the children was lost and
 * `permitted-contents` reported a child that the component always renders.
 */

const config = {
	parser: { '\\.tsx$': '@markuplint/jsx-parser' },
	specs: { '\\.tsx$': '@markuplint/react-spec' },
	pretenders: { auto: true },
	rules: { 'permitted-contents': true },
};

const components = {
	'Pic.tsx': `
export function Pic({ children }) {
	return <picture>{children}</picture>;
}`,
	'Hero.tsx': `
import { Pic } from './Pic';

export function Hero() {
	return (
		<Pic>
			<img src="a.gif" alt="Example" />
		</Pic>
	);
}`,
	'Wrapped.tsx': `
import { Pic } from './Pic';

export function Wrapped({ children }) {
	return (
		<Pic>
			{children}
			<img src="a.gif" alt="Example" />
		</Pic>
	);
}`,
	'Direct.tsx': `
export function Direct({ children }) {
	return (
		<picture>
			{children}
			<img src="a.gif" alt="Example" />
		</picture>
	);
}`,
	'Banner.tsx': `
import { Wrapped } from './Wrapped';

export function Banner() {
	return (
		<Wrapped>
			<source srcSet="a.webp" />
		</Wrapped>
	);
}`,
	'Details.tsx': `
export function Details({ children }) {
	return <details>{children}</details>;
}`,
	'Box.tsx': `
import { Details } from './Details';

export function Box({ children }) {
	return <Details>{children}</Details>;
}`,
};

describe('pretenders.auto: issue #4057', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-4057-'));
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

	test('a child that the outer component always renders in the inner one is not reported as missing', async () => {
		expect(await lint('<Hero />')).toStrictEqual([]);
	});

	test('the children given to the outer component are placed where the inner one renders its slot', async () => {
		expect(await lint('<Wrapped><source srcSet="a.webp" /></Wrapped>')).toStrictEqual([]);
		// Reported where the component is used, exactly as for a component that renders the `picture` itself.
		expect(await lint('<Direct><div>text</div></Direct>')).toStrictEqual(['permitted-contents: <Direct>']);
		expect(await lint('<Wrapped><div>text</div></Wrapped>')).toStrictEqual(['permitted-contents: <Wrapped>']);
	});

	test('it composes through a chain of three components', async () => {
		expect(await lint('<Banner />')).toStrictEqual([]);
	});

	test('passing the children through keeps requiring what only the usage site can provide', async () => {
		expect(await lint('<Box></Box>')).toStrictEqual(['permitted-contents: <Box>']);
	});
});
