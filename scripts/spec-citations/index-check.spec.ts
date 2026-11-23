import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import type { CliDeps } from './cli.ts';
import type { Citation, PageResult } from './types.ts';

import { check } from './check.ts';
import { run, parseCliArgs } from './cli.ts';
import { collectIndexCitations, INDEX_PAGE, INDEX_SECTIONS, INDEX_SOURCE } from './indices.ts';
import { EMPTY_LOCK } from './lockfile.ts';
import { renderReport } from './report.ts';

const SOURCE = readFileSync(new URL('indices.ts', import.meta.url), 'utf8');
const citations = collectIndexCitations(SOURCE, INDEX_SOURCE);

/** A page of the index that has its heading and every section, and none of the four tables. */
const PAGE_HTML = `<body><h2 id="index">Index</h2>${INDEX_SECTIONS.map(id => `<h3 id="${id}">Section</h3><p>text</p>`).join('')}</body>`;
const OK: PageResult = { status: 'ok', html: PAGE_HTML };
const INDEX_JSON = JSON.stringify({ def: {}, specs: [] });

const input = (pages: Record<string, PageResult>, indexJson?: string | null) => ({
	citations,
	orphanQuotes: [],
	inlineQuotes: [],
	pages: new Map(Object.entries(pages)),
	lock: EMPTY_LOCK,
	now: '2026-11-23T00:00:00.000Z',
	...(indexJson === undefined ? {} : { indexJson }),
});

describe('check with the index of the HTML Standard', () => {
	test('[index-check-001] puts what the tables say against the section that holds them', () => {
		const { problems } = check(input({ [INDEX_PAGE]: OK }, INDEX_JSON));
		const unreadable = problems.filter(p => p.kind === 'index-table-unreadable');
		expect(unreadable).toHaveLength(4);
		expect(unreadable.map(p => p.citation?.fragment).toSorted()).toStrictEqual([
			'attributes-3',
			'attributes-3',
			'element-content-categories',
			'elements-3',
		]);
		expect(unreadable[0]?.citation?.file).toBe(INDEX_SOURCE);
	});

	test('[index-check-002] puts a section that the list lacks against the first section of the index', () => {
		const html = PAGE_HTML.replace('</body>', '<h3 id="new-table">New</h3></body>');
		const { problems } = check(input({ [INDEX_PAGE]: { status: 'ok', html } }, INDEX_JSON));
		const unlisted = problems.find(p => p.kind === 'index-section-unlisted');
		expect(unlisted?.citation?.fragment).toBe(INDEX_SECTIONS[0]);
		expect(unlisted?.message).toContain('#new-table');
	});

	test('[index-check-003] compares nothing for a caller that gives no data', () => {
		const { problems } = check(input({ [INDEX_PAGE]: OK }));
		expect(problems.filter(p => p.kind.startsWith('index-'))).toStrictEqual([]);
	});

	test('[index-check-004] says that the data is not there, rather than comparing nothing without a word', () => {
		const { problems } = check(input({ [INDEX_PAGE]: OK }, null));
		expect(problems.filter(p => p.kind.startsWith('index-')).map(p => [p.kind, p.message])).toStrictEqual([
			[
				'index-table-unreadable',
				'The data of `@markuplint/html-spec` (`index.json`) is not there, so the index cannot be compared with it',
			],
		]);
	});

	test('[index-check-005] leaves a page that is a ReSpec source that has not been rendered to the check of its anchors', () => {
		const html = `<html><head><script src="https://example.com/respec.js"></script></head>${PAGE_HTML}`;
		const { problems } = check(input({ [INDEX_PAGE]: { status: 'ok', html } }, INDEX_JSON));
		expect(problems.map(p => p.kind)).toStrictEqual(['unprocessed-source']);
	});

	test('[index-check-006] says only that the page could not be fetched when it could not', () => {
		const { problems } = check(input({ [INDEX_PAGE]: { status: 'failed', message: 'HTTP 503' } }, INDEX_JSON));
		expect(problems.map(p => p.kind)).toStrictEqual(['fetch-failed']);
	});

	test('[index-check-007] lists the findings of the index before a page that could not be fetched', () => {
		const other = 'https://example.com/spec';
		const { problems } = check(
			input({ [INDEX_PAGE]: OK, [other]: { status: 'failed', message: 'HTTP 503' } }, INDEX_JSON),
		);
		expect(problems.at(-1)?.kind).toBe('fetch-failed');
		expect(problems[0]?.kind).toBe('index-table-unreadable');
	});
});

describe('the pull request job of the workflow', () => {
	test('[index-check-008] fails on the heading that the report gives a table of the index that cannot be read', () => {
		const { summary } = renderReport([{ kind: 'index-table-unreadable', citation: null, message: 'x' }], [], {
			date: '2026-11-23',
		});
		const heading = /^### (.+) \(1\)$/m.exec(summary)?.[1];
		expect(heading).toBeDefined();
		const workflow = readFileSync(
			new URL('../../.github/workflows/spec-citation-watch.yml', import.meta.url),
			'utf8',
		);
		expect(workflow).toContain(`grep -q "${heading}" report.md`);
	});
});

describe('where a finding of the index is put', () => {
	/** A JSDoc of `@markuplint/ml-spec` that cites the same section, and comes first in the files. */
	const algorithm: Citation = {
		file: 'packages/@markuplint/ml-spec/src/algorithm/html/is-nothing-content-model.ts',
		line: 9,
		url: `${INDEX_PAGE}#elements-3`,
		page: INDEX_PAGE,
		fragment: 'elements-3',
		textDirective: null,
		secno: null,
		quotes: [],
	};

	test('[index-check-009] is the citation of the script, not another file that cites the same section', () => {
		const { problems } = check({
			...input({ [INDEX_PAGE]: OK }, INDEX_JSON),
			citations: [algorithm, ...citations],
		});
		const unreadable = problems.find(
			p => p.kind === 'index-table-unreadable' && p.citation?.fragment === 'elements-3',
		);
		expect(unreadable?.citation?.file).toBe(INDEX_SOURCE);
	});

	test('[index-check-010] falls back to a citation of another file when the script cites nothing', () => {
		const { problems } = check({ ...input({ [INDEX_PAGE]: OK }, INDEX_JSON), citations: [algorithm] });
		expect(problems.find(p => p.kind === 'index-table-unreadable')?.citation).toBe(algorithm);
	});
});

describe('run with the index of the HTML Standard', () => {
	const deps = (files: Record<string, string>): { deps: CliDeps; written: Map<string, string> } => {
		const written = new Map<string, string>();
		return {
			written,
			deps: {
				collect: () => ({ citations, orphanQuotes: [], inlineQuotes: [] }),
				fetchPages: urls => Promise.resolve(new Map([...urls].map(url => [url, OK]))),
				readText: path => files[path] ?? null,
				writeText: (path, text) => void written.set(path, text),
				write: () => {},
				now: () => '2026-11-23T00:00:00.000Z',
			},
		};
	};
	const options = { ...parseCliArgs([], '/repo'), report: 'r.md' };

	test('[index-check-011] reads the data of html-spec and exits 1 on a difference', async () => {
		const h = deps({ '/repo/packages/@markuplint/html-spec/index.json': INDEX_JSON });
		await expect(run(options, h.deps)).resolves.toBe(1);
		expect(h.written.get('r.md')).toContain('Table of the index that cannot be read (4)');
	});

	test('[index-check-012] exits 1 when the data is not there, since the index cannot be compared with it', async () => {
		const h = deps({});
		await expect(run(options, h.deps)).resolves.toBe(1);
		expect(h.written.get('r.md')).toContain('is not there');
	});
});
