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

describe('listCitingFiles', () => {
	test('[discover-004] lists tracked files only, relative to the root with forward slashes', () => {
		const root = fileURLToPath(new URL('../../', import.meta.url));
		const paths = listCitingFiles(root).map(f => f.path);
		expect(paths).toContain('packages/@markuplint/rules/src/no-input-file-value/README.md');
		expect(paths.every(p => !p.includes('\\') && !p.startsWith('/'))).toBe(true);
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
