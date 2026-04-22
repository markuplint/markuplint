import { createHash } from 'node:crypto';
import { glob, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import type { FilenameHint } from './types.ts';

export function sha256Hex(data: string | Uint8Array): string {
	return createHash('sha256').update(data).digest('hex');
}

export function deriveFilenameHint(relPath: string): FilenameHint {
	const base = relPath.toLowerCase();
	if (base.includes('-novalid')) return 'novalid';
	if (base.includes('-isvalid')) return 'isvalid';
	if (base.includes('-haswarn')) return 'haswarn';
	if (base.includes('-hasinfo')) return 'hasinfo';
	return 'other';
}

export async function collectHtmlFiles(root: string, pattern = '**/*.html'): Promise<string[]> {
	const out: string[] = [];
	for await (const file of glob(pattern, { cwd: root })) {
		if (typeof file === 'string' && file.endsWith('.html')) {
			out.push(file);
		}
	}
	return out.sort();
}

export async function writeJson(path: string, value: unknown): Promise<void> {
	await mkdir(dirname(path), { recursive: true });
	const json = `${JSON.stringify(value, null, '\t')}\n`;
	await writeFile(path, json, 'utf8');
}

export async function readJson<T>(path: string): Promise<T> {
	const raw = await readFile(path, 'utf8');
	return JSON.parse(raw) as T;
}

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
