import type { CollectResult } from './types.ts';

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { collectAriaCitations, GENERATED_DATA } from './aria.ts';
import { collectFromMarkdown, collectFromSource, collectFromText } from './collect.ts';
import { elementSourcePath, SPEC_DATA } from './definition.ts';
import { collectElementCitations } from './elements.ts';

export type FileKind = 'readme' | 'source' | 'data' | 'doc';

const DOCS = ['website/docs', 'website/i18n/ja/docusaurus-plugin-content-docs'];
/**
 * The packages whose sources are read. A citation travels with the code it justifies: an algorithm that moves
 * from a rule into `@markuplint/ml-spec` (`select-display-size.ts`, #4558) still depends on the same passage,
 * and a monitor that read only some packages would drop the section from the lock, without a report, the day
 * the citation crosses the boundary. So the whole of every package's `src` is read, not a list of the places
 * that cite today: the declarations of how a framework renders a literal (`*-spec`, `*-parser`), the
 * algorithms and the value grammars (`ml-spec`, `types`), the DOM (`ml-core`), the selector engine and the
 * rules.
 */
const PACKAGES = ['packages/@markuplint', 'packages/markuplint'];

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
	if (
		/^packages\/(?:@markuplint\/[^/]+|markuplint)\/src\/.+\.ts$/.test(path) &&
		!path.endsWith('.spec.ts') &&
		!path.endsWith('.d.ts')
	) {
		return 'source';
	}
	// The spec data sits directly in the directory.
	if (
		path.startsWith(`${SPEC_DATA}/`) &&
		path.endsWith('.jsonc') &&
		!path.slice(SPEC_DATA.length + 1).includes('/')
	) {
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
	const listed = execFileSync('git', ['ls-files', '-z', '--', ...PACKAGES, ...DOCS], {
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

/**
 * Every citation that the monitor reads: those written in the tracked files, and the ones that the generated
 * data stands for. The second kind is not part of `collectFiles`: nobody writes it, so the conventions of how a
 * citation is written (`citations-policy.spec.ts`) do not apply to it, and a dated edition of WAI-ARIA is
 * right for it where the READMEs cite the edition-less one.
 */
export function collectAll(root: string): CollectResult {
	const listed = listCitingFiles(root);
	const files = collectFiles(root, listed);
	// Not skipped when missing: the watch of what the data stands for would shrink without a report saying so.
	const text = readFileSync(join(root, GENERATED_DATA), 'utf8');
	// The file that `collectFiles` reads: tracked, and still in the working tree. A file that is not (a new one that
	// is not added yet, or one that is deleted and not staged) cites nothing, so its element is read from its `cite`.
	const tracked = new Set(listed.map(f => f.path));
	const hasSource = (name: string) => {
		const path = elementSourcePath(name);
		return tracked.has(path) && existsSync(join(root, path));
	};
	return {
		...files,
		citations: [
			...files.citations,
			...collectAriaCitations(text, GENERATED_DATA),
			...collectElementCitations(text, GENERATED_DATA, hasSource),
		],
	};
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
