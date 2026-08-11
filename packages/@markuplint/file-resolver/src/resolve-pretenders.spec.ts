import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { test, expect, describe, beforeEach, afterEach } from 'vitest';

import {
	disambiguatePretendersForFile,
	hasResolvableCollision,
	invalidatePretenderResolutionCaches,
	resolvePretenders,
} from './resolve-pretenders.js';

const readFileForTest = (filePath: string) => readFile(filePath, 'utf8');

test('files — filePath is rebased to be absolute, relative to the pretenders JSON file itself', async () => {
	const reactDir = path.resolve(import.meta.dirname, '..', '..', '..', '@markuplint-test', 'react');
	const pretenders = await resolvePretenders({
		files: [path.resolve(reactDir, 'pretenders.json')],
	});
	expect(pretenders).toStrictEqual([
		{
			selector: 'Sample',
			as: 'div',
			filePath: `${path.resolve(reactDir, 'sample.jsx')}:1:16`,
		},
	]);
});

test('imports — falls back to pretenders.json when package.json has no pretenders field', async () => {
	// @markuplint-test/react has no "pretenders" field in package.json,
	// so the resolver falls back to reading pretenders.json
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

test('scan — filePath is rebased to be absolute, relative to the scan cwd', async () => {
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
	const target = path.resolve(fixtureDir, 'template', 'SimpleButton.vue');
	const pretenders = await resolvePretenders({
		scan: [{ files: target }],
	});
	expect(pretenders).toHaveLength(1);
	expect(pretenders[0]!.filePath?.startsWith(`${target}:`)).toBe(true);
});

const collisionDir = path.resolve(
	import.meta.dirname,
	'..',
	'..',
	'..',
	'@markuplint',
	'pretenders',
	'test',
	'fixtures',
	'collision',
);

test('disambiguatePretendersForFile leaves an unambiguous list untouched (same reference — fast path)', async () => {
	const pretenders = [{ selector: 'Solo', as: 'div', filePath: `${path.resolve(collisionDir, 'a.tsx')}:1:1` }];
	const result = await disambiguatePretendersForFile(
		path.resolve(collisionDir, 'whatever.tsx'),
		'export {};',
		pretenders,
	);
	expect(result).toBe(pretenders);
});

test('hasResolvableCollision does not filter by selector name shape (must stay a superset of the real disambiguation filter)', () => {
	// `disambiguatePretenders` (the real logic) only resolves plain-identifier
	// selectors, but this fast-path gate must trigger regardless of shape — see
	// the JSDoc on `hasResolvableCollision` for why the two must not be kept in sync.
	const pretenders = [
		{ selector: '123-not-a-plain-identifier', as: 'div', filePath: '/a.tsx:1:1' },
		{ selector: '123-not-a-plain-identifier', as: 'span', filePath: '/b.tsx:1:1' },
	];
	expect(hasResolvableCollision(pretenders)).toBe(true);
});

test('disambiguatePretendersForFile resolves a collision via the target file import', async () => {
	const cFile = path.resolve(collisionDir, 'c.tsx');
	const sourceCode = await readFileForTest(cFile);
	const pretenders = [
		{
			selector: 'Item',
			as: { element: 'button', slots: true, inheritAttrs: true },
			filePath: `${path.resolve(collisionDir, 'a.tsx')}:2:14`,
		},
		{
			selector: 'Item',
			as: { element: 'li', slots: true, inheritAttrs: true },
			filePath: `${path.resolve(collisionDir, 'b.tsx')}:2:14`,
		},
	];
	const result = await disambiguatePretendersForFile(cFile, sourceCode, pretenders);
	expect(result).toHaveLength(1);
	expect(result[0]!.as).toStrictEqual({ element: 'button', slots: true, inheritAttrs: true });
});

describe('auto (on-demand import-graph resolution)', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'file-resolver-pretenders-auto-'));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test('resolves via the entry file import graph when auto is on and context is given', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const childPath = path.join(tmpDir, 'Child.tsx');
		await writeFile(childPath, 'export const Child = () => <button>x</button>;');
		const sourceCode = "import { Child } from './Child';\nexport const Entry = () => <Child />;";

		const pretenders = await resolvePretenders({ auto: true }, { filePath: entryPath, sourceCode });

		expect(pretenders.find(p => p.selector === 'Child')).toMatchObject({ as: 'button' });
	});

	test('is a no-op when context is not given, even if auto is on', async () => {
		const pretenders = await resolvePretenders({ auto: true });
		expect(pretenders).toStrictEqual([]);
	});

	test('is a no-op when auto is off, even if context is given', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const childPath = path.join(tmpDir, 'Child.tsx');
		await writeFile(childPath, 'export const Child = () => <button>x</button>;');
		const sourceCode = "import { Child } from './Child';\nexport const Entry = () => <Child />;";

		const pretenders = await resolvePretenders({ auto: false }, { filePath: entryPath, sourceCode });

		expect(pretenders).toStrictEqual([]);
	});

	test('inline data for the same selector is kept, not replaced by the auto-scanned entry', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const childPath = path.join(tmpDir, 'Child.tsx');
		await writeFile(childPath, 'export const Child = () => <button>x</button>;');
		const sourceCode = "import { Child } from './Child';\nexport const Entry = () => <Child />;";

		const pretenders = await resolvePretenders(
			{ auto: true, data: [{ selector: 'Child', as: 'span' }] },
			{ filePath: entryPath, sourceCode },
		);

		const childEntries = pretenders.filter(p => p.selector === 'Child');
		expect(childEntries[0]).toStrictEqual({ selector: 'Child', as: 'span' });
		expect(childEntries).toHaveLength(2);
	});

	test('does not duplicate an entry that scan and auto both discover for the same file', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const childPath = path.join(tmpDir, 'Child.tsx');
		await writeFile(childPath, 'export const Child = () => <button>x</button>;');
		const sourceCode = "import { Child } from './Child';\nexport const Entry = () => <Child />;";

		const pretenders = await resolvePretenders(
			{ auto: true, scan: [{ files: childPath }] },
			{ filePath: entryPath, sourceCode },
		);

		expect(pretenders.filter(p => p.selector === 'Child')).toHaveLength(1);
	});
});

describe('invalidatePretenderResolutionCaches (long-running processes)', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'file-resolver-pretenders-cache-'));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test('picks up a renamed default export across a re-resolve of config.scan', async () => {
		const targetFile = path.join(tmpDir, 'target.tsx');
		const importerFile = path.join(tmpDir, 'importer.tsx');
		await writeFile(targetFile, 'export default function Item() { return <button>x</button>; }');
		await writeFile(importerFile, "import Item from './target';\nexport const E = () => <Item>x</Item>;");

		const before = await resolvePretenders({ scan: [{ files: [targetFile, importerFile] }] });
		expect(before.find(p => p.selector === 'E')?.as).toBe('button');

		// Rename the default-exported declaration without invalidating caches: the
		// stale export table still says the default export's local name is "Item",
		// which no longer exists after the rename, leaving `E` unresolved.
		await writeFile(targetFile, 'export default function Widget() { return <span>x</span>; }');
		const stale = await resolvePretenders({ scan: [{ files: [targetFile, importerFile] }] });
		expect(stale.find(p => p.selector === 'E')?.as).toBe('Item');

		await invalidatePretenderResolutionCaches();

		const fresh = await resolvePretenders({ scan: [{ files: [targetFile, importerFile] }] });
		expect(fresh.find(p => p.selector === 'E')?.as).toBe('span');
	});
});
