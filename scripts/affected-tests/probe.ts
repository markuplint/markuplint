import type { Probe } from './classify.ts';

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import config from '../../vitest.config.ts';

/** The root of the repository, two levels above this file. */
export const root = path.resolve(import.meta.dirname, '../..');

/**
 * Runs `git` in the repository and returns what it prints.
 *
 * @param args - The arguments, passed as they are: no shell reads them
 * @returns The standard output
 */
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
 * The files that git lists under the given patterns: the tracked ones that are still on disk (a
 * file that was deleted and not yet staged is not one) and the untracked ones that are not ignored,
 * as a file that is new and uncommitted is a file that runs.
 *
 * @param patterns - Git pathspecs
 * @returns Repository-relative paths
 */
export function listFiles(patterns: readonly string[]): string[] {
	return git(['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ...patterns])
		.split('\0')
		.filter(file => file !== '' && existsSync(path.join(root, file)));
}

/**
 * The specs are the files that `test.include` in `vitest.config.ts` matches, so the list follows
 * that config without a copy of its patterns. A run with the cross-OS config is given the same
 * list: the specs of that config are a subset of these, and vitest keeps the ones it includes.
 *
 * @returns A probe over the working tree
 * @throws When the config has no `include`, as a plan over no specs would select nothing and say so
 */
export function createProbe(): Probe {
	const include = (config.test?.include ?? []).flatMap(pattern => expandBraces(pattern.replace(/^\.\//, '')));
	if (include.length === 0) {
		throw new Error('vitest.config.ts has no `test.include`: the specs cannot be listed.');
	}
	const specs = listFiles(include.map(pattern => `:(glob)${pattern}`));
	const contents = new Map<string, string>();
	return {
		specs,
		exists: file => existsSync(path.join(root, file)),
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
