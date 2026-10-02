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
 * Issue #4082: when a component renders an element with no attributes and does
 * not render its children (`slots: null`), scanners previously collapsed its
 * identity to a bare tag name. In ml-core, a bare tag name is read as rendering
 * its children (`as.resetChildren(this.childNodes)`), causing children passed
 * at the usage site to be treated as rendered.
 */

const config = {
	parser: {
		'\\.tsx$': '@markuplint/jsx-parser',
		'\\.vue$': '@markuplint/vue-parser',
	},
	specs: {
		'\\.tsx$': '@markuplint/react-spec',
		'\\.vue$': '@markuplint/vue-spec',
	},
	pretenders: { auto: true },
	rules: { 'require-accessible-name': true },
};

const components = {
	'Comp.tsx': `
export function Comp() {
	return <span></span>;
}`,
	'BareOption.tsx': `
export function BareOption() {
	return <option></option>;
}`,
	'BareTitle.tsx': `
export function BareTitle() {
	return <title></title>;
}`,
	'BareTextarea.tsx': `
export function BareTextarea() {
	return <textarea></textarea>;
}`,
	'Select.tsx': `
export function Select({ children }) {
	return <select>{children}</select>;
}`,
	'Bare.vue': `
<template><span></span></template>
`,
};

describe('pretenders.auto: issue #4082', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-4082-'));
		for (const [name, code] of Object.entries(components)) {
			await writeFile(path.join(tmpDir, name), code);
		}
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	async function lintTsx(body: string) {
		const imports = Object.keys(components)
			.filter(name => name.endsWith('.tsx'))
			.map(name => name.replace('.tsx', ''))
			.map(name => `import { ${name} } from './${name}';`)
			.join('\n');
		const file = path.join(tmpDir, 'usage.tsx');
		await writeFile(file, `${imports}\nexport function Example() {\n\treturn (\n${body}\n\t);\n}\n`);
		const { violations } = await mlTestFile(file, config);
		return violations.map(v => `${v.ruleId}: ${v.raw}`);
	}

	test('TSX: a component with no attributes and no children slot does not render its children', async () => {
		expect(await lintTsx('<button type="button"><Comp>Save</Comp></button>')).toStrictEqual([
			'require-accessible-name: <button type="button">',
		]);
	});

	test('TSX: text written inside an attribute-less option component is not the selected text', async () => {
		expect(
			await lintTsx('<button type="button"><Select><BareOption>Red</BareOption></Select></button>'),
		).toStrictEqual(['require-accessible-name: <button type="button">']);
	});

	test('TSX: text written inside an attribute-less title component does not name the svg', async () => {
		expect(await lintTsx('<button type="button"><svg><BareTitle>Logo</BareTitle></svg></button>')).toStrictEqual([
			'require-accessible-name: <button type="button">',
		]);
	});

	test('TSX: text written inside an attribute-less textarea component is not its value', async () => {
		expect(await lintTsx('<button type="button"><BareTextarea>Draft</BareTextarea></button>')).toStrictEqual([
			'require-accessible-name: <button type="button">',
		]);
	});

	test('Vue: an attribute-less component with no slot does not render its children', async () => {
		const file = path.join(tmpDir, 'Usage.vue');
		await writeFile(
			file,
			`<script setup>
import Bare from './Bare.vue';
</script>
<template><button type="button"><Bare>Save</Bare></button></template>
`,
		);
		const { violations } = await mlTestFile(file, config);
		expect(violations.map(v => `${v.ruleId}: ${v.raw}`)).toStrictEqual([
			'require-accessible-name: <button type="button">',
		]);
	});
});
