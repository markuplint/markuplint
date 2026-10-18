import type { CollectResult } from './types.ts';

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { collectFromMarkdown, collectFromSource, collectFromText } from './collect.ts';

export type FileKind = 'readme' | 'source' | 'data' | 'doc';

const RULES = 'packages/@markuplint/rules/src';
const DOCS = ['website/docs', 'website/i18n/ja/docusaurus-plugin-content-docs'];

/**
 * Which files hold citations, and how they are read.
 *
 * `*.spec.ts` is left out: a test's title is part of the contract that
 * `.claude/rules/spec-files.md` forbids renaming, so a section number in one
 * cannot be fixed even when the check says it is stale.
 */
export function classify(path: string): FileKind | null {
	if (/^packages\/@markuplint\/rules\/src\/[^/]+\/README(?:\.ja)?\.md$/.test(path)) {
		return 'readme';
	}
	if (/^packages\/@markuplint\/rules\/src\/[^/]+\/schema\.json$/.test(path)) {
		return 'data';
	}
	if (path.startsWith(`${RULES}/`) && path.endsWith('.ts') && !path.endsWith('.spec.ts') && !path.endsWith('.d.ts')) {
		return 'source';
	}
	if (/^website\/(?:docs|i18n\/ja\/docusaurus-plugin-content-docs)\/.+\.mdx?$/.test(path)) {
		return 'doc';
	}
	return null;
}

/**
 * Lists the tracked files that hold citations. `git ls-files` rather than a
 * directory walk: the website build writes generated copies of the rule
 * READMEs into `website/docs`, and those must not be counted twice.
 */
export function listCitingFiles(root: string): { path: string; kind: FileKind }[] {
	const listed = execFileSync('git', ['ls-files', '-z', '--', RULES, ...DOCS], {
		cwd: root,
		encoding: 'utf8',
		maxBuffer: 64 * 1024 * 1024,
	});
	return listed
		.split('\0')
		.flatMap(path => {
			const kind = classify(path);
			return kind === null ? [] : [{ path, kind }];
		})
		.toSorted((a, b) => a.path.localeCompare(b.path));
}

export function collectFiles(root: string, files: readonly { path: string; kind: FileKind }[]): CollectResult {
	const results = files.map(({ path, kind }): CollectResult => {
		// The tracked-file list still names a file that was deleted or renamed in the working tree and not yet staged.
		if (!existsSync(join(root, path))) {
			return { citations: [], orphanQuotes: [], inlineQuotes: [] };
		}
		const text = readFileSync(join(root, path), 'utf8');
		switch (kind) {
			case 'readme': {
				return collectFromMarkdown(text, path);
			}
			case 'doc': {
				return collectFromMarkdown(text, path, { orphanQuotes: false });
			}
			case 'source': {
				return collectFromSource(text, path);
			}
			case 'data': {
				return collectFromText(text, path);
			}
		}
	});
	return {
		citations: results.flatMap(r => r.citations),
		orphanQuotes: results.flatMap(r => r.orphanQuotes),
		inlineQuotes: results.flatMap(r => r.inlineQuotes),
	};
}
