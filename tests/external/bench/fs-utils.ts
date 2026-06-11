import { createHash } from 'node:crypto';
import { glob, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { FilenameHint } from './types.ts';

/**
 * Compute the lower-case hexadecimal SHA-256 digest of a string or byte
 * sequence.
 *
 * @param data Input to hash.
 * @returns 64-character hex digest.
 */
export function sha256Hex(data: string | Uint8Array): string {
	return createHash('sha256').update(data).digest('hex');
}

/**
 * Classify a validator-test path by the suffix convention
 * (`-novalid`, `-isvalid`, `-haswarn`, `-hasinfo`). Case-insensitive.
 *
 * The benchmark records the hint on every snapshot for traceability, but
 * verdicts are derived from actual tool outputs — the hint is metadata only.
 *
 * @param relPath Path relative to `validator/tests/`.
 * @returns The matching `FilenameHint` variant, or `'other'` if none matches.
 */
export function deriveFilenameHint(relPath: string): FilenameHint {
	const base = relPath.toLowerCase();
	if (base.includes('-novalid')) return 'novalid';
	if (base.includes('-isvalid')) return 'isvalid';
	if (base.includes('-haswarn')) return 'haswarn';
	if (base.includes('-hasinfo')) return 'hasinfo';
	return 'other';
}

/**
 * Walk `root` and return every `.html` file that matches `pattern`, sorted
 * alphabetically so downstream snapshot order is stable.
 *
 * @param root Directory to walk from.
 * @param pattern Glob pattern (relative to `root`). Defaults to `**\/*.html`.
 * @returns Paths relative to `root`.
 */
export async function collectHtmlFiles(root: string, pattern = '**/*.html'): Promise<string[]> {
	const out: string[] = [];
	for await (const file of glob(pattern, { cwd: root })) {
		if (typeof file === 'string' && file.endsWith('.html')) {
			out.push(file);
		}
	}
	return out.sort();
}

/**
 * Write `value` as a pretty-printed JSON document with a trailing newline.
 * Creates any missing parent directories. Indentation uses a tab so the
 * output matches the repository's editor convention.
 *
 * @param path Absolute destination path.
 * @param value Any value that survives `JSON.stringify`.
 */
export async function writeJson(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const json = `${JSON.stringify(value, null, '\t')}\n`;
	await writeFile(path, json, 'utf8');
}

/**
 * Read and parse a JSON file as UTF-8.
 *
 * @template T Type the caller expects the JSON to describe.
 * @param path Absolute path to read.
 * @returns The parsed value, cast to `T` without runtime validation.
 */
export async function readJson<T>(path: string): Promise<T> {
	const raw = await readFile(path, 'utf8');
	return JSON.parse(raw) as T;
}

/**
 * Run `fn` on every item with at most `limit` concurrent executions, while
 * preserving input order in the returned array.
 *
 * An empty input resolves to an empty array immediately (no dead-locking
 * when `limit > 0` but `items.length === 0`). The first rejection propagates
 * through `Promise.all`.
 *
 * @template T Element type of the input.
 * @template R Return type of `fn`.
 * @param items Input array.
 * @param limit Upper bound of concurrent `fn` calls; coerced to at least 1
 *   and capped at `items.length`.
 * @param fn Worker function receiving each item and its original index.
 * @returns Results in the same order as `items`.
 */
export async function pLimit<T, R>(
	items: readonly T[],
	limit: number,
	fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
	const results: R[] = Array.from({ length: items.length });
	let cursor = 0;
	const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
		while (cursor < items.length) {
			const i = cursor++;
			results[i] = await fn(items[i] as T, i);
		}
	});
	await Promise.all(workers);
	return results;
}
