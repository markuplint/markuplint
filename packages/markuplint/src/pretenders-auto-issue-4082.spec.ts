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
 * Issue #4082: a component that renders an element with no attributes and does
 * not render its children was described by the bare tag name, which reads as
 * rendering them, so the children written at the usage site named the control.
 */

const rules = { 'require-accessible-name': true };

describe('pretenders.auto: issue #4082 (TSX)', () => {
	const config = {
		parser: { '\\.tsx$': '@markuplint/jsx-parser' },
		specs: { '\\.tsx$': '@markuplint/react-spec' },
		pretenders: { auto: true },
		rules,
	};

	const components = {
		'Bare.tsx': `
export function Bare() {
	return <span></span>;
}`,
		'Labelled.tsx': `
export function Labelled({ children }) {
	return <span>{children}</span>;
}`,
		'Outer.tsx': `
import { Labelled } from './Labelled';
export function Outer() {
	return <Labelled />;
}`,
		'Option.tsx': `
export function Option() {
	return <option></option>;
}`,
		'Select.tsx': `
export function Select({ children }) {
	return <select>{children}</select>;
}`,
		'Title.tsx': `
export function Title() {
	return <title></title>;
}`,
		'Textarea.tsx': `
export function Textarea() {
	return <textarea></textarea>;
}`,
	};

	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-4082-tsx-'));
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

	test('text written inside an attribute-less component that never renders it does not name the button', async () => {
		expect(await lint('<button type="button"><Bare>Save</Bare></button>')).toStrictEqual([
			'require-accessible-name: <button type="button">',
		]);
	});

	test('text written inside a component that renders it names the button', async () => {
		expect(await lint('<button type="button"><Labelled>Save</Labelled></button>')).toStrictEqual([]);
	});

	test('text written inside a component whose root component gets no children does not name the button', async () => {
		expect(await lint('<button type="button"><Outer>Save</Outer></button>')).toStrictEqual([
			'require-accessible-name: <button type="button">',
		]);
	});

	test('text written inside an attribute-less option component that never renders it is not the selected text', async () => {
		expect(await lint('<button type="button"><Select><Option>Red</Option></Select></button>')).toStrictEqual([
			'require-accessible-name: <button type="button">',
		]);
	});

	test('text written inside an attribute-less title component that never renders it does not name the svg', async () => {
		expect(await lint('<button type="button"><svg><Title>Logo</Title></svg></button>')).toStrictEqual([
			'require-accessible-name: <button type="button">',
		]);
	});

	test('text written inside an attribute-less textarea component that never renders it is not its value', async () => {
		expect(await lint('<button type="button"><Textarea>Draft</Textarea></button>')).toStrictEqual([
			'require-accessible-name: <button type="button">',
		]);
	});
});

describe('pretenders.auto: issue #4082 (template)', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-4082-template-'));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	async function lint(files: Readonly<Record<string, string>>, entry: string, parser: string) {
		for (const [name, code] of Object.entries(files)) {
			await writeFile(path.join(tmpDir, name), code);
		}
		const { violations } = await mlTestFile(path.join(tmpDir, entry), {
			parser: { '.*': parser },
			pretenders: { auto: true },
			rules,
		});
		return violations.map(v => `${v.ruleId}: ${v.raw}`);
	}

	test('Vue: text written inside an attribute-less component that never renders it does not name the button', async () => {
		expect(
			await lint(
				{
					'Bare.vue': '<template><span></span></template>\n',
					'Usage.vue': `<script setup>
import Bare from './Bare.vue';
</script>
<template><button type="button"><Bare>Save</Bare></button></template>
`,
				},
				'Usage.vue',
				'@markuplint/vue-parser',
			),
		).toStrictEqual(['require-accessible-name: <button type="button">']);
	});

	test('Svelte: text written inside an attribute-less component that never renders it does not name the button', async () => {
		expect(
			await lint(
				{
					'Bare.svelte': '<span></span>\n',
					'Usage.svelte': `<script>
import Bare from './Bare.svelte';
</script>
<button type="button"><Bare>Save</Bare></button>
`,
				},
				'Usage.svelte',
				'@markuplint/svelte-parser',
			),
		).toStrictEqual(['require-accessible-name: <button type="button">']);
	});

	test('Astro: text written inside an attribute-less component that never renders it does not name the button', async () => {
		expect(
			await lint(
				{
					'Bare.astro': '<span></span>\n',
					'Usage.astro': `---
import Bare from './Bare.astro';
---
<button type="button"><Bare>Save</Bare></button>
`,
				},
				'Usage.astro',
				'@markuplint/astro-parser',
			),
		).toStrictEqual(['require-accessible-name: <button type="button">']);
	});

	test('Vue: the component with an attribute is already described as not rendering the text', async () => {
		expect(
			await lint(
				{
					'Bare.vue': '<template><span class="x"></span></template>\n',
					'Usage.vue': `<script setup>
import Bare from './Bare.vue';
</script>
<template><button type="button"><Bare>Save</Bare></button></template>
`,
				},
				'Usage.vue',
				'@markuplint/vue-parser',
			),
		).toStrictEqual(['require-accessible-name: <button type="button">']);
	});

	test('Svelte: the component with an attribute is already described as not rendering the text', async () => {
		expect(
			await lint(
				{
					'Bare.svelte': '<span class="x"></span>\n',
					'Usage.svelte': `<script>
import Bare from './Bare.svelte';
</script>
<button type="button"><Bare>Save</Bare></button>
`,
				},
				'Usage.svelte',
				'@markuplint/svelte-parser',
			),
		).toStrictEqual(['require-accessible-name: <button type="button">']);
	});

	test('Astro: the component with an attribute is already described as not rendering the text', async () => {
		expect(
			await lint(
				{
					'Bare.astro': '<span class="x"></span>\n',
					'Usage.astro': `---
import Bare from './Bare.astro';
---
<button type="button"><Bare>Save</Bare></button>
`,
				},
				'Usage.astro',
				'@markuplint/astro-parser',
			),
		).toStrictEqual(['require-accessible-name: <button type="button">']);
	});
});
