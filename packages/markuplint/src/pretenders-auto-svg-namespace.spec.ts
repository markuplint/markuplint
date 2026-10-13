import { writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { describe, test, expect, beforeEach, afterEach } from 'vitest';

import { setGlobal } from './global-settings.js';
import { mlTestFile } from './testing-tool/index.js';

setGlobal({ locale: 'en' });

const config = {
	parser: { '\\.tsx$': '@markuplint/jsx-parser' },
	specs: { '\\.tsx$': '@markuplint/react-spec' },
	pretenders: { auto: true },
	rules: { 'permitted-contents': true },
};

describe('pretenders.auto: issue #4147', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'pretenders-auto-svg-'));
		await writeFile(
			path.join(tmpDir, 'Icon.tsx'),
			'export function Icon() { return <svg><path d="M0 0" /></svg>; }',
		);
		await writeFile(path.join(tmpDir, 'Path.tsx'), 'export const Path = () => <path d="M0 0" />;');
		await writeFile(path.join(tmpDir, 'Svg.tsx'), 'export const Svg = ({ children }) => <svg>{children}</svg>;');
		await writeFile(path.join(tmpDir, 'Group.tsx'), 'export const Group = ({ children }) => <g>{children}</g>;');
		await writeFile(
			path.join(tmpDir, 'ForeignObject.tsx'),
			'export const ForeignObject = ({ children }) => <foreignObject>{children}</foreignObject>;',
		);
		await writeFile(path.join(tmpDir, 'HtmlSpan.tsx'), 'export const HtmlSpan = () => <span>Label</span>;');
		await writeFile(
			path.join(tmpDir, 'StyledIcon.tsx'),
			'declare const styled: any; export const StyledIcon = styled.svg`color: red`;',
		);
		await writeFile(
			path.join(tmpDir, 'SvgSlot.tsx'),
			'export const SvgSlot = ({ children }) => <div><svg><path d="M0 0" />{children}</svg></div>;',
		);
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	async function lint(body: string) {
		const file = path.join(tmpDir, 'usage.tsx');
		await writeFile(
			file,
			`import { Icon } from './Icon';
import { Path } from './Path';
import { Svg } from './Svg';
import { Group } from './Group';
import { ForeignObject } from './ForeignObject';
import { HtmlSpan } from './HtmlSpan';
import { StyledIcon } from './StyledIcon';
import { SvgSlot } from './SvgSlot';
export function Example() { return (${body}); }`,
		);
		const { violations } = await mlTestFile(file, config);
		return violations.map(v => `${v.ruleId}: ${v.raw}`);
	}

	test('a component rendering svg is permitted in a button', async () => {
		expect(await lint('<button type="button"><Icon /></button>')).toStrictEqual([]);
	});

	test('a component rendering svg is still not permitted directly in a ul', async () => {
		expect(await lint('<ul><Icon /></ul>')).toStrictEqual(['permitted-contents: <Icon />']);
	});
	test('a path component inherits the namespace of a native svg parent', async () => {
		expect(await lint('<svg><Path /></svg>')).toStrictEqual([]);
	});
	test('a styled SVG root is permitted in a button', async () => {
		expect(await lint('<button type="button"><StyledIcon /></button>')).toStrictEqual([]);
	});
	test('components inherit the namespace of a pretended SVG parent', async () => {
		expect(await lint('<Svg><Group><Path /></Group></Svg>')).toStrictEqual([]);
	});
	test('native descendants inherit the namespace of a pretended SVG parent', async () => {
		expect(await lint('<Svg><g><Path /><path d="M0 0" /></g><defs><linearGradient /></defs></Svg>')).toStrictEqual(
			[],
		);
	});
	test('foreignObject switches its component children back to HTML', async () => {
		expect(await lint('<Svg><ForeignObject><HtmlSpan /></ForeignObject></Svg>')).toStrictEqual([]);
	});
	test('a native foreignObject inside a pretended SVG switches its children back to HTML', async () => {
		expect(await lint('<Svg><foreignObject><HtmlSpan /></foreignObject></Svg>')).toStrictEqual([]);
	});
	test('a component child inherits the namespace of an SVG slot wrapper', async () => {
		expect(await lint('<SvgSlot><Path /></SvgSlot>')).toStrictEqual([]);
	});
	test('a Vue SVG root uses the same namespace resolution as a JSX SVG root', async () => {
		await writeFile(path.join(tmpDir, 'VueIcon.vue'), '<template><svg><path d="M0 0" /></svg></template>');
		const file = path.join(tmpDir, 'usage.vue');
		await writeFile(
			file,
			`<script setup>import VueIcon from './VueIcon.vue';</script>
<template><button type="button"><VueIcon /></button></template>`,
		);
		const { violations } = await mlTestFile(file, {
			parser: { '\\.vue$': '@markuplint/vue-parser' },
			pretenders: { auto: true },
			rules: { 'permitted-contents': true },
		});
		expect(violations).toStrictEqual([]);
	});
});
