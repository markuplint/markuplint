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
 * Issue #4067: the `<select>` options were read from the children written at
 * the usage site instead of the ones the component renders, so options written
 * inside a component that never renders its children still named the control.
 */

const config = {
	parser: { '\\.tsx$': '@markuplint/jsx-parser' },
	specs: { '\\.tsx$': '@markuplint/react-spec' },
	pretenders: { auto: true },
	rules: { 'require-accessible-name': true },
};

const components = {
	'Select.tsx': `
export function Select({ children }) {
	return <select>{children}</select>;
}`,
	'Placeholder.tsx': `
export function Placeholder() {
	return (
		<select>
			<option disabled></option>
		</select>
	);
}`,
};

describe('pretenders.auto: issue #4067', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-4067-'));
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

	test('the options a component renders from its children give the selected option text', async () => {
		expect(
			await lint(
				'<button type="button"><Select><option>Red</option><option selected>Blue</option></Select></button>',
			),
		).toStrictEqual([]);
	});

	test('options written inside a component that never renders its children are not read', async () => {
		expect(
			await lint('<button type="button"><Placeholder><option>Red</option></Placeholder></button>'),
		).toStrictEqual(['require-accessible-name: <button type="button">']);
	});
});
