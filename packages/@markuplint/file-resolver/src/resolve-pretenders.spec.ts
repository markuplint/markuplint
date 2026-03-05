import path from 'node:path';

import { test, expect } from 'vitest';

import { resolvePretenders } from './resolve-pretenders.js';

test('files', async () => {
	const pretenders = await resolvePretenders({
		files: [path.resolve(import.meta.dirname, '..', '..', '..', '@markuplint-test', 'react', 'pretenders.json')],
	});
	expect(pretenders).toStrictEqual([
		{
			selector: 'Sample',
			as: 'div',
			filePath: 'sample.jsx:1:16',
		},
	]);
});

test('imports', async () => {
	const pretenders = await resolvePretenders({
		imports: ['@markuplint-test/react'],
	});
	expect(pretenders).toStrictEqual([
		{
			selector: 'Sample',
			as: 'div',
			filePath: 'sample.jsx:1:16',
		},
	]);
});

test('scan with file path', async () => {
	const fixtureDir = path.resolve(
		import.meta.dirname,
		'..',
		'..',
		'..',
		'@markuplint',
		'pretenders',
		'test',
		'fixtures',
	);
	const pretenders = await resolvePretenders({
		scan: [
			{
				files: path.resolve(fixtureDir, 'template', 'SimpleButton.vue'),
			},
		],
	});
	expect(pretenders).toStrictEqual([expect.objectContaining({ selector: 'SimpleButton' })]);
});

test('scan with ignoreComponentNames', async () => {
	const fixtureDir = path.resolve(
		import.meta.dirname,
		'..',
		'..',
		'..',
		'@markuplint',
		'pretenders',
		'test',
		'fixtures',
	);
	const pretenders = await resolvePretenders({
		scan: [
			{
				files: path.resolve(fixtureDir, 'template', 'SimpleButton.vue'),
				ignoreComponentNames: ['SimpleButton'],
			},
		],
	});
	expect(pretenders).toStrictEqual([]);
});

test('scan combined with inline data', async () => {
	const fixtureDir = path.resolve(
		import.meta.dirname,
		'..',
		'..',
		'..',
		'@markuplint',
		'pretenders',
		'test',
		'fixtures',
	);
	const pretenders = await resolvePretenders({
		data: [{ selector: 'InlineComp', as: 'span' }],
		scan: [
			{
				files: path.resolve(fixtureDir, 'template', 'SimpleButton.vue'),
			},
		],
	});
	const selectors = pretenders.map(p => p.selector);
	expect(selectors).toContain('InlineComp');
	expect(selectors).toContain('SimpleButton');
});

test('scan with empty glob match', async () => {
	const pretenders = await resolvePretenders({
		scan: [
			{
				files: '/nonexistent-path/**/*.vue',
			},
		],
	});
	expect(pretenders).toStrictEqual([]);
});

test('scan with files as string[] (array of patterns)', async () => {
	const fixtureDir = path.resolve(
		import.meta.dirname,
		'..',
		'..',
		'..',
		'@markuplint',
		'pretenders',
		'test',
		'fixtures',
	);
	const pretenders = await resolvePretenders({
		scan: [
			{
				files: [path.resolve(fixtureDir, 'template', 'SimpleButton.vue'), path.resolve(fixtureDir, '002.tsx')],
			},
		],
	});
	const selectors = pretenders.map(p => p.selector);
	expect(selectors).toContain('SimpleButton');
	expect(selectors).toContain('FooBar');
});

test('imports fallback: reads pretenders field from package.json', async () => {
	const pretenders = await resolvePretenders({
		imports: ['@markuplint-test/react-pkg-pretenders'],
	});
	expect(pretenders).toStrictEqual([
		{
			selector: 'PkgButton',
			as: 'button',
			filePath: 'pkg-button.jsx:1:10',
		},
	]);
});

test('imports fallback: falls back to pretenders.json when package.json has no pretenders field', async () => {
	// @markuplint-test/react has no "pretenders" field in package.json
	// but has a separate pretenders.json file — this tests the fallback
	const pretenders = await resolvePretenders({
		imports: ['@markuplint-test/react'],
	});
	expect(pretenders).toStrictEqual([
		{
			selector: 'Sample',
			as: 'div',
			filePath: 'sample.jsx:1:16',
		},
	]);
});
