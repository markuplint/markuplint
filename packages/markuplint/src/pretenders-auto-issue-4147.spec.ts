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
 * A component rendering an SVG element was checked as an HTML element of the
 * same name, because the pretender element was always given the HTML namespace
 * unless the definition stated `namespace: 'svg'`, which `pretenders.auto`
 * never does.
 */

const config = {
	parser: { '\\.tsx$': '@markuplint/jsx-parser' },
	specs: { '\\.tsx$': '@markuplint/react-spec' },
	pretenders: { auto: true },
	rules: { 'permitted-contents': true },
};

const components = `
export const Icon = () => <svg viewBox="0 0 24 24"><path d="M0 0" /></svg>;
export const Path = () => <path d="M0 0" />;
export const Frame = ({ children }) => <svg viewBox="0 0 24 24">{children}</svg>;
export const Chart = ({ children }) => (
	<svg viewBox="0 0 24 24">
		<foreignObject width="24" height="24">
			<div>{children}</div>
		</foreignObject>
	</svg>
);
`;

describe('pretenders.auto: issue #4147', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-4147-'));
		await writeFile(path.join(tmpDir, 'Components.tsx'), components);
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	async function lint(body: string) {
		const file = path.join(tmpDir, 'App.tsx');
		await writeFile(
			file,
			`import { Icon, Path, Frame, Chart } from './Components';\nexport const App = () => (${body});`,
		);
		const { violations } = await mlTestFile(file, config);
		return violations.map(v => `${v.ruleId}: ${v.message}`);
	}

	test('a component rendering svg is permitted where an inline svg is', async () => {
		expect(await lint('<button type="button"><Icon /></button>')).toStrictEqual([]);
		expect(
			await lint('<button type="button"><svg viewBox="0 0 24 24"><path d="M0 0" /></svg></button>'),
		).toStrictEqual([]);
	});

	test('a component rendering svg is rejected where an inline svg is', async () => {
		const expected = ['permitted-contents: The "svg" element is not allowed in the "ul" element in this context'];
		expect(await lint('<ul><svg viewBox="0 0 24 24"><path d="M0 0" /></svg></ul>')).toStrictEqual(expected);
		expect(await lint('<ul><Icon /></ul>')).toStrictEqual(expected);
	});

	test('children given to a component rendering svg are SVG elements', async () => {
		expect(await lint('<Frame><path d="M0 0" /></Frame>')).toStrictEqual([]);
		expect(await lint('<Frame><g><path d="M0 0" /></g></Frame>')).toStrictEqual([]);
	});

	test('a component given to a component rendering svg is an SVG element', async () => {
		expect(await lint('<Frame><Path /></Frame>')).toStrictEqual([]);
	});

	test('children given to a component rendering them inside foreignObject are HTML elements', async () => {
		const expected = ['permitted-contents: The "div" element is not allowed in the "p" element in this context'];
		expect(
			await lint(
				'<svg viewBox="0 0 24 24"><foreignObject width="24" height="24"><div><p><div /></p></div></foreignObject></svg>',
			),
		).toStrictEqual(expected);
		expect(await lint('<Chart><p><div /></p></Chart>')).toStrictEqual(expected);
	});
});

describe('pretenders.auto: issue #4147 (Vue)', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-4147-vue-'));
		await writeFile(
			path.join(tmpDir, 'VueIcon.vue'),
			'<template><svg viewBox="0 0 24 24"><path d="M0 0" /></svg></template>',
		);
		await writeFile(
			path.join(tmpDir, 'VueChart.vue'),
			'<template><svg viewBox="0 0 24 24"><foreignObject width="24" height="24"><div><slot /></div></foreignObject></svg></template>',
		);
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	async function lint(body: string) {
		const file = path.join(tmpDir, 'App.vue');
		await writeFile(
			file,
			`<script setup>\nimport VueIcon from './VueIcon.vue';\nimport VueChart from './VueChart.vue';\n</script>\n<template>${body}</template>`,
		);
		const { violations } = await mlTestFile(file, {
			parser: { '\\.vue$': '@markuplint/vue-parser' },
			specs: { '\\.vue$': '@markuplint/vue-spec' },
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});
		return violations.map(v => `${v.ruleId}: ${v.message}`);
	}

	test('a component rendering svg is permitted in a button', async () => {
		expect(await lint('<button type="button"><VueIcon /></button>')).toStrictEqual([]);
	});

	test('children given to a component rendering them inside foreignObject are HTML elements', async () => {
		const expected = ['permitted-contents: The "span" element is not allowed in the "ul" element in this context'];
		expect(
			await lint(
				'<svg viewBox="0 0 24 24"><foreignObject width="24" height="24"><div><ul><span></span></ul></div></foreignObject></svg>',
			),
		).toStrictEqual(expected);
		expect(await lint('<VueChart><ul><span></span></ul></VueChart>')).toStrictEqual(expected);
	});
});
