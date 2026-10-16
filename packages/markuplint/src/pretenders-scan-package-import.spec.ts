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
 * A component of the project that shares its name with one imported from a package was
 * taken for the package's: `<Button>` of `ui-lib` was checked as the `<button>` that the
 * project's own `Button` renders, so `<a><Button /></a>` was rejected for the interactive
 * content it did not hold. Only one `Button` is scanned here, so there is no collision to resolve.
 */

describe('pretenders.scan: a name imported from a package', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-scan-package-'));
		await writeFile(path.join(tmpDir, 'Button.tsx'), 'export const Button = () => <button type="button" />;');
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	async function lint(importLine: string) {
		const file = path.join(tmpDir, 'App.tsx');
		await writeFile(file, `${importLine}\nexport const App = () => (<a href="/"><Button /></a>);`);
		const { violations } = await mlTestFile(file, {
			parser: { '\\.tsx$': '@markuplint/jsx-parser' },
			specs: { '\\.tsx$': '@markuplint/react-spec' },
			pretenders: { scan: [{ files: path.join(tmpDir, 'Button.tsx') }] },
			rules: { 'permitted-contents': true },
		});
		return violations.map(v => v.ruleId);
	}

	test('the component of the project is checked as what it renders', async () => {
		expect(await lint("import { Button } from './Button';")).toStrictEqual(['permitted-contents']);
	});

	test('a package that is not installed is not taken for the component of the project', async () => {
		expect(await lint("import { Button } from 'ui-lib';")).toStrictEqual([]);
	});

	test('a default import of the package is not taken for the component of the project', async () => {
		expect(await lint("import Button from 'ui-lib';")).toStrictEqual([]);
	});
});
