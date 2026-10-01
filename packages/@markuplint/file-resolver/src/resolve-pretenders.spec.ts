import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { test, expect, describe, beforeEach, afterEach } from 'vitest';

import {
	createPretenderResolver,
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

	test('`auto: { depth }` limits how far the import graph is walked', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		await writeFile(path.join(tmpDir, 'Inner.tsx'), 'export const Inner = () => <button>x</button>;');
		await writeFile(
			path.join(tmpDir, 'Outer.tsx'),
			"import { Inner } from './Inner';\nexport const Outer = () => <Inner />;",
		);
		const sourceCode = "import { Outer } from './Outer';\nexport const Entry = () => <Outer />;";

		const shallow = await resolvePretenders({ auto: { depth: 1 } }, { filePath: entryPath, sourceCode });
		const deep = await resolvePretenders({ auto: {} }, { filePath: entryPath, sourceCode });

		expect(shallow.some(p => p.selector === 'Outer')).toBe(true);
		expect(shallow.some(p => p.selector === 'Inner')).toBe(false);
		expect(deep.some(p => p.selector === 'Inner')).toBe(true);
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

	test('dedupe does not collide across a differently-split (selector, filePath) pair that joins to the same string', async () => {
		// A filename containing a space gives the auto-resolved entry's joined
		// "selector filePath" string a second space to split on, besides the
		// one dedupe itself inserts. A plain-string-delimited key (the bug this
		// pins down: `${selector} ${filePath}`) would treat a `data` entry
		// split at that other space as the SAME key as the real Child entry
		// and silently drop Child — even though the two pairs are genuinely
		// different. `JSON.stringify([selector, filePath])` can't collide this
		// way because the delimiter is never a literal character either side
		// could contain.
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const childPath = path.join(tmpDir, 'My Child.tsx');
		await writeFile(childPath, 'export const Child = () => <button>x</button>;');
		const sourceCode = "import { Child } from './My Child';\nexport const Entry = () => <Child />;";

		const autoOnly = await resolvePretenders({ auto: true }, { filePath: entryPath, sourceCode });
		const childEntry = autoOnly.find(p => p.selector === 'Child')!;
		const joined = `Child ${childEntry.filePath}`; // 'Child <tmpDir>/My Child.tsx:1:13'
		const secondSpaceIndex = joined.indexOf(' ', joined.indexOf(' ') + 1);
		const altSelector = joined.slice(0, secondSpaceIndex); // 'Child <tmpDir>/My'
		const altFilePath = joined.slice(secondSpaceIndex + 1); // 'Child.tsx:1:13'

		const pretenders = await resolvePretenders(
			{ auto: true, data: [{ selector: altSelector, as: 'span', filePath: altFilePath }] },
			{ filePath: entryPath, sourceCode },
		);

		expect(pretenders.filter(p => p.selector === 'Child')).toHaveLength(1);
		expect(pretenders.filter(p => p.selector === altSelector)).toHaveLength(1);
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

describe('createPretenderResolver (one lint target across edits)', () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(path.join(os.tmpdir(), 'file-resolver-pretenders-resolver-'));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test('re-runs auto against each resolve()’s source, but reads the target-independent sources once', async () => {
		const entryPath = path.join(tmpDir, 'entry.tsx');
		const childPath = path.join(tmpDir, 'Child.tsx');
		const scannedPath = path.join(tmpDir, 'Scanned.tsx');
		await writeFile(childPath, 'export const Child = () => <button>x</button>;');
		await writeFile(scannedPath, 'export const Scanned = () => <button>x</button>;');

		const resolver = createPretenderResolver({ scan: [{ files: [scannedPath] }], auto: true });

		const withImport = await resolver.resolve({
			filePath: entryPath,
			sourceCode: "import { Child } from './Child';\nexport const Entry = () => <Child />;",
		});
		expect(withImport.find(p => p.selector === 'Child')).toMatchObject({ as: 'button' });
		expect(withImport.find(p => p.selector === 'Scanned')).toMatchObject({ as: 'button' });

		// The scanned file changes on disk, and the entry drops its import. The
		// resolver follows the entry (auto) but not the disk (scan): what the
		// `scan` section yields is a function of the config and the filesystem,
		// not of the target's source, so it is read when the resolver is
		// created and nowhere else.
		await writeFile(scannedPath, 'export const Scanned = () => <span>x</span>;');
		const withoutImport = await resolver.resolve({
			filePath: entryPath,
			sourceCode: 'export const Entry = () => <div />;',
		});
		expect(withoutImport.find(p => p.selector === 'Child')).toBeUndefined();
		expect(withoutImport.find(p => p.selector === 'Scanned')).toMatchObject({ as: 'button' });

		// A new resolver (what a host creates on every config resolution) does
		// read the disk again.
		const fresh = await createPretenderResolver({ scan: [{ files: [scannedPath] }], auto: true }).resolve({
			filePath: entryPath,
			sourceCode: 'export const Entry = () => <div />;',
		});
		expect(fresh.find(p => p.selector === 'Scanned')).toMatchObject({ as: 'span' });
	});

	test('yields the files section on every resolve(), the same as resolvePretenders() does', async () => {
		const reactDir = path.resolve(import.meta.dirname, '..', '..', '..', '@markuplint-test', 'react');
		const resolver = createPretenderResolver({ files: [path.resolve(reactDir, 'pretenders.json')] });
		const expected = [
			{
				selector: 'Sample',
				as: 'div',
				filePath: `${path.resolve(reactDir, 'sample.jsx')}:1:16`,
			},
		];

		expect(await resolver.resolve()).toStrictEqual(expected);
		expect(await resolver.resolve()).toStrictEqual(expected);
	});

	test('returns a fresh array on every resolve(), so a caller cannot mutate the retained sources', async () => {
		const resolver = createPretenderResolver({ data: [{ selector: 'Foo', as: 'div' }] });
		const entryPath = path.join(tmpDir, 'entry.tsx');

		const first = await resolver.resolve({ filePath: entryPath, sourceCode: '' });
		first.push({ selector: 'Injected', as: 'span' });

		const second = await resolver.resolve({ filePath: entryPath, sourceCode: '' });
		expect(second).toStrictEqual([{ selector: 'Foo', as: 'div' }]);
	});

	test('skips auto when resolve() is called without a context, like resolvePretenders()', async () => {
		const childPath = path.join(tmpDir, 'Child.tsx');
		await writeFile(childPath, 'export const Child = () => <button>x</button>;');

		const resolver = createPretenderResolver({ data: [{ selector: 'Foo', as: 'div' }], auto: true });

		expect(await resolver.resolve()).toStrictEqual([{ selector: 'Foo', as: 'div' }]);
	});

	test('resolves to nothing when the pretenders section is absent', async () => {
		const resolver = createPretenderResolver();

		expect(await resolver.resolve({ filePath: path.join(tmpDir, 'entry.tsx'), sourceCode: '' })).toStrictEqual([]);
	});
});
