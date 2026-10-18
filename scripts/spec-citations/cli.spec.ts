import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { describe, expect, test } from 'vitest';

import type { CliDeps } from './cli.ts';
import type { CollectResult, Citation, PageResult } from './types.ts';

import { parseCliArgs, run } from './cli.ts';
import { serializeLock } from './lockfile.ts';
import { hashText, normalizeSpecText } from './normalize.ts';
import { splitSentences } from './diff.ts';

const PAGE = 'https://html.spec.whatwg.org/multipage/input.html';
const HTML =
	'<body><h4 id="sec"><span class="secno">4.10.5.1.17</span> File Upload state</h4><p>The value attribute must be omitted.</p></body>';
const UNIT = normalizeSpecText('File Upload state The value attribute must be omitted.');

const cite = (overrides: Partial<Citation> = {}): Citation => ({
	file: 'packages/@markuplint/rules/src/r/README.md',
	line: 8,
	url: `${PAGE}#sec`,
	page: PAGE,
	fragment: 'sec',
	textDirective: null,
	secno: null,
	quotes: [],
	...overrides,
});

type Harness = { deps: CliDeps; written: Map<string, string>; out: string[]; fetched: string[][] };

const harness = (
	collected: Partial<CollectResult>,
	pages: Record<string, PageResult>,
	files: Record<string, string> = {},
): Harness => {
	const written = new Map<string, string>();
	const out: string[] = [];
	const fetched: string[][] = [];
	const deps: CliDeps = {
		collect: () => ({ citations: [], orphanQuotes: [], inlineQuotes: [], ...collected }),
		fetchPages: urls => {
			const list = [...urls];
			fetched.push(list);
			return Promise.resolve(
				new Map(list.map(url => [url, pages[url] ?? { status: 'failed', message: 'unexpected' }])),
			);
		},
		readText: path => files[path] ?? null,
		writeText: (path, text) => void written.set(path, text),
		write: line => void out.push(line),
		now: () => '2026-10-18T00:00:00.000Z',
	};
	return { deps, written, out, fetched };
};

const options = (overrides: Partial<ReturnType<typeof parseCliArgs>> = {}) => ({
	...parseCliArgs([], '/repo'),
	...overrides,
});

describe('parseCliArgs', () => {
	test('[cli-001] defaults the lock next to the script and reads no flag', () => {
		expect(parseCliArgs([], '/repo')).toStrictEqual({
			update: false,
			help: false,
			root: '/repo',
			lock: '/repo/scripts/spec-citations/spec-citations.lock.json',
		});
	});

	test('[cli-002] reads each flag', () => {
		expect(
			parseCliArgs(['--update', '--report', 'r.md', '--report-full', 'f.md', '--lock', 'l.json'], '/repo'),
		).toMatchObject({
			update: true,
			report: 'r.md',
			reportFull: 'f.md',
			lock: 'l.json',
		});
	});

	test('[cli-003] rejects a flag it does not know', () => {
		expect(() => parseCliArgs(['--nope'], '/repo')).toThrow();
	});
});

describe('run', () => {
	test('[cli-004] exits 0 and writes nothing when every citation holds', async () => {
		const h = harness({ citations: [cite()] }, { [PAGE]: { status: 'ok', html: HTML } });
		await expect(run(options(), h.deps)).resolves.toBe(0);
		expect(h.written.size).toBe(0);
	});

	test('[cli-005] exits 1 on a finding, prints it, and writes both reports', async () => {
		const h = harness(
			{ citations: [cite({ fragment: 'gone', url: `${PAGE}#gone` })] },
			{ [PAGE]: { status: 'ok', html: HTML } },
		);
		await expect(run(options({ report: 'r.md', reportFull: 'f.md' }), h.deps)).resolves.toBe(1);
		expect(h.out.join('\n')).toContain('anchor-missing');
		expect(h.written.get('r.md')).toContain('<!-- spec-citation-watch -->');
		expect(h.written.get('f.md')).toContain('Anchor not found');
	});

	test('[cli-006] exits 2 when the only trouble is a page that could not be fetched', async () => {
		const h = harness({ citations: [cite()] }, { [PAGE]: { status: 'failed', message: 'HTTP 503' } });
		await expect(run(options({ report: 'r.md' }), h.deps)).resolves.toBe(2);
		expect(h.written.get('r.md')).toContain('could not be fetched');
	});

	test('[cli-007] writes the lock only with --update, and only when it changed', async () => {
		const files = {};
		const first = harness({ citations: [cite()] }, { [PAGE]: { status: 'ok', html: HTML } }, files);
		await run(options(), first.deps);
		expect(first.written.size).toBe(0);

		const updating = harness({ citations: [cite()] }, { [PAGE]: { status: 'ok', html: HTML } }, files);
		await run(options({ update: true }), updating.deps);
		const lockPath = options().lock;
		expect(JSON.parse(updating.written.get(lockPath) ?? '{}').sections[`${PAGE}#sec`].hash).toBe(hashText(UNIT));

		const settled = harness(
			{ citations: [cite()] },
			{ [PAGE]: { status: 'ok', html: HTML } },
			{ [lockPath]: updating.written.get(lockPath) ?? '' },
		);
		await run(options({ update: true }), settled.deps);
		expect(settled.written.size).toBe(0);
	});

	test('[cli-008] reports a change since the lock and, with --update, adopts it', async () => {
		const lockPath = options().lock;
		const stale = serializeLock({
			sections: {
				[`${PAGE}#sec`]: {
					hash: 'old',
					text: splitSentences('Something else.'),
					updatedAt: '2026-09-01T00:00:00.000Z',
				},
			},
		});
		const h = harness({ citations: [cite()] }, { [PAGE]: { status: 'ok', html: HTML } }, { [lockPath]: stale });
		await expect(run(options({ update: true, report: 'r.md' }), h.deps)).resolves.toBe(1);
		expect(h.written.get('r.md')).toContain('Cited section changed');
		expect(JSON.parse(h.written.get(lockPath) ?? '{}').sections[`${PAGE}#sec`].hash).toBe(hashText(UNIT));
	});

	test('[cli-012] writes the report before it rewrites the lock', async () => {
		const h = harness({ citations: [cite()] }, { [PAGE]: { status: 'ok', html: HTML } });
		await run(options({ update: true, report: 'r.md', reportFull: 'f.md' }), h.deps);
		expect([...h.written.keys()]).toStrictEqual(['r.md', 'f.md', options().lock]);
	});

	test('[cli-009] fetches only the pages whose citations need a section', async () => {
		const whole = cite({ fragment: null, url: PAGE });
		const other = 'https://html.spec.whatwg.org/multipage/other.html';
		const wholeOnly = cite({ fragment: null, url: other, page: other });
		const h = harness({ citations: [cite(), whole, wholeOnly] }, { [PAGE]: { status: 'ok', html: HTML } });
		await run(options(), h.deps);
		expect(h.fetched).toStrictEqual([[PAGE]]);
	});

	test('[cli-010] refuses to continue past a lock file that is not a lock', async () => {
		const lockPath = options().lock;
		const h = harness(
			{ citations: [cite()] },
			{ [PAGE]: { status: 'ok', html: HTML } },
			{ [lockPath]: '{"nope":1}' },
		);
		await expect(run(options(), h.deps)).rejects.toThrow(/not a lock file/);
	});
});

describe('command line', () => {
	test('[cli-011] starts under Node type stripping and prints its usage', () => {
		const cli = fileURLToPath(new URL('cli.ts', import.meta.url));
		const out = execFileSync(process.execPath, ['--experimental-strip-types', cli, '--help'], { encoding: 'utf8' });
		expect(out).toContain('Usage');
	});
});
