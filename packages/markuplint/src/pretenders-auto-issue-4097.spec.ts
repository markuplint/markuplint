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
 * Components imported through a barrel file (`export ... from`) got no
 * pretender, because the import walk followed `import` declarations only and
 * stopped at the barrel.
 */

const config = {
	parser: { '\\.tsx$': '@markuplint/jsx-parser' },
	specs: { '\\.tsx$': '@markuplint/react-spec' },
	pretenders: { auto: true },
	rules: { 'permitted-contents': true },
};

const base = `
export const Link = ({ children }) => <a href="/">{children}</a>;
export const IconButton = ({ label }) => <button aria-label={label} />;
`;

const usage = `
export const App = () => (
	<Link>
		<IconButton label="close" />
	</Link>
);
`;

const expected = [
	'permitted-contents: The "a" element is a transparent model but also disallows the "button" element in this context',
];

describe('pretenders.auto: issue #4097', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-4097-'));
		await mkdir(path.join(tmpDir, 'ui'));
		await writeFile(path.join(tmpDir, 'ui', 'Base.tsx'), base);
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	async function lint(importLine: string) {
		const file = path.join(tmpDir, 'App.tsx');
		await writeFile(file, `${importLine}\n${usage}`);
		const { violations } = await mlTestFile(file, config);
		return violations.map(v => `${v.ruleId}: ${v.message}`);
	}

	test('a named re-export from a barrel gives the same result as a direct import', async () => {
		await writeFile(path.join(tmpDir, 'ui', 'index.ts'), "export { Link, IconButton } from './Base';");

		expect(await lint("import { Link, IconButton } from './ui';")).toStrictEqual(expected);
		expect(await lint("import { Link, IconButton } from './ui/Base';")).toStrictEqual(expected);
	});

	test('a star re-export from a barrel gives the same result as a direct import', async () => {
		await writeFile(path.join(tmpDir, 'ui', 'index.ts'), "export * from './Base';");

		expect(await lint("import { Link, IconButton } from './ui';")).toStrictEqual(expected);
	});

	test('a nested barrel chain gives the same result as a direct import', async () => {
		await mkdir(path.join(tmpDir, 'ui', 'base'));
		await writeFile(path.join(tmpDir, 'ui', 'base', 'index.ts'), "export { Link, IconButton } from '../Base';");
		await writeFile(path.join(tmpDir, 'ui', 'index.ts'), "export * from './base';");

		expect(await lint("import { Link, IconButton } from './ui';")).toStrictEqual(expected);
	});

	test('an MDX file that re-exports components from a barrel gets their pretenders', async () => {
		await writeFile(path.join(tmpDir, 'ui', 'index.ts'), "export { Link, IconButton } from './Base';");
		const file = path.join(tmpDir, 'page.mdx');
		await writeFile(
			file,
			[
				"export { Link, IconButton } from './ui';",
				'',
				'# Title',
				'',
				'<Link><IconButton label="close" /></Link>',
				'',
			].join('\n'),
		);

		const { violations } = await mlTestFile(file, {
			...config,
			parser: { '\\.mdx$': '@markuplint/mdx-parser' },
			specs: { '\\.mdx$': '@markuplint/react-spec' },
		});

		expect(violations.map(v => `${v.ruleId}: ${v.message}`)).toStrictEqual(expected);
	});

	test('a same-named component elsewhere in the graph does not shadow the one imported through a barrel', async () => {
		await writeFile(path.join(tmpDir, 'ui', 'index.ts'), "export * from './Base';");
		await writeFile(
			path.join(tmpDir, 'Other.tsx'),
			'const Link = ({ children }) => <span>{children}</span>;\nexport const Other = () => <Link />;',
		);

		expect(
			await lint("import { Other } from './Other';\nimport { Link, IconButton } from './ui/Base';"),
		).toStrictEqual(expected);
		expect(await lint("import { Other } from './Other';\nimport { Link, IconButton } from './ui';")).toStrictEqual(
			expected,
		);
	});
});
