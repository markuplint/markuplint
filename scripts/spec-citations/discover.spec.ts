import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import { classify, collectFiles, listCitingFiles } from './discover.ts';

describe('classify', () => {
	test('[discover-001] reads rule READMEs of both languages as READMEs', () => {
		expect(classify('packages/@markuplint/rules/src/no-duplicate-id/README.md')).toBe('readme');
		expect(classify('packages/@markuplint/rules/src/no-duplicate-id/README.ja.md')).toBe('readme');
		expect(classify('packages/@markuplint/rules/README.md')).toBeNull();
	});

	test('[discover-002] reads rule sources but not their specs or declarations', () => {
		expect(classify('packages/@markuplint/rules/src/wai-aria/checkings/tab-requires-tabpanel.ts')).toBe('source');
		expect(classify('packages/@markuplint/rules/src/no-duplicate-id/index.spec.ts')).toBeNull();
		expect(classify('packages/@markuplint/rules/src/types.d.ts')).toBeNull();
	});

	test('[discover-003] reads a rule schema as data and website prose as documentation', () => {
		expect(classify('packages/@markuplint/rules/src/no-input-file-value/schema.json')).toBe('data');
		expect(classify('website/docs/migration/v4-to-v5/rules/invalid-attr.md')).toBe('doc');
		expect(classify('website/i18n/ja/docusaurus-plugin-content-docs/current/guides/ai.mdx')).toBe('doc');
		expect(classify('website/src/pages/index.tsx')).toBeNull();
	});
});

describe('classify: the declarations of how a framework renders', () => {
	test('[discover-006] reads the declaration of a spec package and the table of a parser as sources', () => {
		expect(classify('packages/@markuplint/react-spec/src/index.ts')).toBe('source');
		expect(classify('packages/@markuplint/alpine-spec/src/index.ts')).toBe('source');
		expect(classify('packages/@markuplint/astro-parser/src/literal-values.ts')).toBe('source');
		expect(classify('packages/@markuplint/pug-parser/src/literal-values.ts')).toBe('source');
	});

	test('[discover-007] does not read the other files of those packages', () => {
		expect(classify('packages/@markuplint/react-spec/src/index.spec.ts')).toBeNull();
		expect(classify('packages/@markuplint/react-spec/README.md')).toBeNull();
		expect(classify('packages/@markuplint/astro-parser/src/parser.ts')).toBeNull();
	});
});

describe('classify: the spec data and the selector engine', () => {
	test('[discover-009] reads the spec data of html-spec and the sources of the selector engine as sources', () => {
		expect(classify('packages/@markuplint/html-spec/src/spec-common.contents.jsonc')).toBe('source');
		expect(classify('packages/@markuplint/html-spec/src/spec.style.jsonc')).toBe('source');
		expect(classify('packages/@markuplint/selector/src/content-model-first-child.ts')).toBe('source');
		expect(classify('packages/@markuplint/selector/src/extended-selector/content-model-pseudo-class.ts')).toBe(
			'source',
		);
	});

	test('[discover-010] does not read the other files of those packages', () => {
		expect(classify('packages/@markuplint/html-spec/index.json')).toBeNull();
		expect(classify('packages/@markuplint/html-spec/generator/scraping.ts')).toBeNull();
		expect(classify('packages/@markuplint/selector/src/selector.spec.ts')).toBeNull();
		expect(classify('packages/@markuplint/selector/src/types.d.ts')).toBeNull();
		expect(classify('packages/@markuplint/html-spec/src/nested/spec.a.jsonc')).toBeNull();
		expect(classify('packages/@markuplint/selector/README.md')).toBeNull();
	});
});

describe('listCitingFiles', () => {
	test('[discover-004] lists tracked files only, relative to the root with forward slashes', () => {
		const root = fileURLToPath(new URL('../../', import.meta.url));
		const paths = listCitingFiles(root).map(f => f.path);
		expect(paths).toContain('packages/@markuplint/rules/src/no-input-file-value/README.md');
		expect(paths.every(p => !p.includes('\\') && !p.startsWith('/'))).toBe(true);
	});
});

describe('listCitingFiles: the declarations of how a framework renders', () => {
	test('[discover-008] lists the declaration of a spec package', () => {
		const root = fileURLToPath(new URL('../../', import.meta.url));
		const found = listCitingFiles(root).find(f => f.path === 'packages/@markuplint/react-spec/src/index.ts');
		expect(found?.kind).toBe('source');
	});
});

describe('listCitingFiles: the spec data and the selector engine', () => {
	test('[discover-011] lists the spec data of html-spec and the sources of the selector engine', () => {
		const root = fileURLToPath(new URL('../../', import.meta.url));
		const files = listCitingFiles(root);
		expect(files.find(f => f.path === 'packages/@markuplint/html-spec/src/spec-common.contents.jsonc')?.kind).toBe(
			'source',
		);
		expect(files.find(f => f.path === 'packages/@markuplint/selector/src/selector.ts')?.kind).toBe('source');
	});
});

describe('the declarations that a spec package keeps beside its index', () => {
	test('[discover-012] reads a source file that a spec package declares its table in, but not its specs', () => {
		expect(classify('packages/@markuplint/react-spec/src/react-18.ts')).toBe('source');
		expect(classify('packages/@markuplint/react-spec/src/nested/other.ts')).toBeNull();
		expect(classify('packages/@markuplint/react-spec/src/react-18.spec.ts')).toBeNull();
		expect(classify('packages/@markuplint/react-spec/src/types.d.ts')).toBeNull();
	});

	test('[discover-013] lists the declaration of React that holds its table', () => {
		const root = fileURLToPath(new URL('../../', import.meta.url));
		const found = listCitingFiles(root).find(f => f.path === 'packages/@markuplint/react-spec/src/react-18.ts');
		expect(found?.kind).toBe('source');
	});
});

describe('collectFiles', () => {
	test('[discover-005] skips a tracked file that has been deleted from the working tree', () => {
		const root = fileURLToPath(new URL('../../', import.meta.url));
		const result = collectFiles(root, [
			{ path: 'packages/@markuplint/rules/src/deleted-rule/README.md', kind: 'readme' },
		]);
		expect(result).toStrictEqual({ citations: [], orphanQuotes: [], inlineQuotes: [] });
	});
});
