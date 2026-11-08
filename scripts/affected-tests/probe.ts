import type { Probe } from './classify.ts';

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

import config from '../../vitest.config.ts';

export const root = path.resolve(import.meta.dirname, '../..');

export function git(args: readonly string[]): string {
	return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
}

/** Expands the one level of `{a,b}` that the `include` patterns of the vitest config use. */
function expandBraces(pattern: string): string[] {
	const match = /\{([^{}]+)\}/.exec(pattern);
	if (!match) {
		return [pattern];
	}
	const [whole = '', body = ''] = match;
	return body.split(',').flatMap(alternative => expandBraces(pattern.replace(whole, alternative)));
}

/**
 * The specs are the tracked files that `test.include` in `vitest.config.ts` matches, so the list
 * follows that config without a copy of its patterns.
 *
 * @returns A probe over the working tree
 */
export function createProbe(): Probe {
	const include = (config.test?.include ?? []).flatMap(pattern => expandBraces(pattern.replace(/^\.\//, '')));
	const specs = git(['ls-files', '-z', '--', ...include.map(pattern => `:(glob)${pattern}`)])
		.split('\0')
		.filter(Boolean);
	const contents = new Map<string, string>();
	return {
		specs,
		exists: file => {
			try {
				readFileSync(path.join(root, file));
				return true;
			} catch {
				return false;
			}
		},
		read: file => {
			let text = contents.get(file);
			if (text === undefined) {
				text = readFileSync(path.join(root, file), 'utf8');
				contents.set(file, text);
			}
			return text;
		},
	};
}
