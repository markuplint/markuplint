/**
 * What a refresh of `spec-citations.lock.json` adds, removes and changes, written for the body of the pull
 * request that carries it (`.github/workflows/spec-citation-watch.yml`).
 *
 * Merging that pull request accepts the lock, so a reviewer has to see what it does to it. A section that the
 * lock loses while some file still cites it is the case that matters: the monitor then stops watching that
 * passage without a word (#4558: a citation moved to a file that was not scanned, and the lock PR deleted its
 * section). So every removed section is looked up in the tree, and the ones that are still cited are named
 * first.
 *
 * It is a script of its own, not part of `cli.ts`, because the "before" is the lock on `dev`, which only the
 * workflow has: a run retries when a page could not be fetched, and each try rewrites the lock with `--update`,
 * so what `cli.ts` reads when it starts is the previous try's lock, not the one that was accepted.
 *
 * `node --experimental-strip-types scripts/spec-citations/lock-changes.ts <before> <after>` prints the
 * description, or nothing when the two locks are the same.
 */
import type { Lock } from './types.ts';

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { isCliEntry } from './entry.ts';
import { collectFiles, listCitingFiles } from './discover.ts';
import { parseLock } from './lockfile.ts';

export type LockChanges = {
	readonly added: readonly string[];
	readonly removed: readonly string[];
	readonly changed: readonly string[];
};

/** A list longer than this is cut: a pull request body is limited to 65,536 characters. */
const LIST_LIMIT = 100;
/** The places a section is named in; the rest is counted. */
const PLACE_LIMIT = 3;
/** The patterns given to one `git grep`, so that its command line stays short. */
const GREP_CHUNK = 100;

/** The keys (`<page>#<fragment>`) added to, removed from and changed in a lock, each in order. */
export function diffLocks(before: Lock, after: Lock): LockChanges {
	const keysBefore = Object.keys(before.sections);
	const keysAfter = Object.keys(after.sections);
	return {
		added: keysAfter.filter(key => !(key in before.sections)).toSorted(),
		removed: keysBefore.filter(key => !(key in after.sections)).toSorted(),
		changed: keysAfter
			.filter(key => before.sections[key]?.hash !== after.sections[key]?.hash && key in before.sections)
			.toSorted(),
	};
}

function places(found: readonly string[]): string {
	const shown = found.slice(0, PLACE_LIMIT).map(place => `\`${place}\``);
	const rest = found.length - shown.length;
	return rest > 0 ? `${shown.slice(0, -1).join(', ')}, ${shown.at(-1)} and ${rest} more` : shown.join(', ');
}

function list(keys: readonly string[], limit: number, describe: (key: string) => string): string {
	const lines = keys.slice(0, limit).map(key => `- ${describe(key)}`);
	if (keys.length > limit) {
		lines.push(`- …and ${keys.length - limit} more`);
	}
	return lines.join('\n');
}

/**
 * Describes the changes as Markdown for a pull request body: the removed sections first (the ones that are
 * still cited named with where), then the changed ones, then the added ones. Empty when nothing changed.
 *
 * @param stillCited - The places (`file:line`) that cite a section, empty when none does
 * @param limit - How many sections one list shows
 */
export function describeLockChanges(
	changes: LockChanges,
	stillCited: (key: string) => readonly string[],
	limit = LIST_LIMIT,
): string {
	const parts: string[] = [];
	if (changes.removed.length > 0) {
		const cited = changes.removed.filter(key => stillCited(key).length > 0);
		const warning =
			cited.length === 0
				? ''
				: `**${cited.length} of them ${cited.length === 1 ? 'is' : 'are'} still cited in the code.** Merging drops ${cited.length === 1 ? 'its' : 'their'} section from the lock, and the monitor stops watching ${cited.length === 1 ? 'that passage' : 'those passages'} until the file that cites ${cited.length === 1 ? 'it' : 'them'} is read again.\n\n`;
		parts.push(
			`### Sections removed from the lock (${changes.removed.length})\n\n${warning}${list(
				[...cited, ...changes.removed.filter(key => !cited.includes(key))],
				limit,
				key => {
					const found = stillCited(key);
					return found.length === 0 ? `\`${key}\`` : `\`${key}\` — still cited in ${places(found)}`;
				},
			)}`,
		);
	}
	if (changes.changed.length > 0) {
		parts.push(
			`### Sections whose text changed (${changes.changed.length})\n\n${list(changes.changed, limit, key => `\`${key}\``)}`,
		);
	}
	if (changes.added.length > 0) {
		parts.push(
			`### Sections added to the lock (${changes.added.length})\n\n${list(changes.added, limit, key => `\`${key}\``)}`,
		);
	}
	return parts.join('\n\n');
}

/**
 * Whether `text` holds `key` as a whole URL: the character after it does not go on with the fragment, so
 * `…#attr-a` is not found in `…#attr-ab`, `…#attr-a-b` or `…#attr-a.b`. A text directive (`:~:text=`), a
 * closing bracket, a quote, a space or the full stop that ends a sentence are where a URL ends.
 */
export function containsKey(text: string, key: string): boolean {
	for (let at = text.indexOf(key); at !== -1; at = text.indexOf(key, at + 1)) {
		const next = text[at + key.length];
		const after = text[at + key.length + 1];
		if (
			next === undefined ||
			!(/[\w\-%~]/.test(next) || (next === '.' && after !== undefined && /\w/.test(after)))
		) {
			return true;
		}
	}
	return false;
}

/**
 * Finds the keys as literal URLs in the tracked files other than the lock, with `git grep`: how a citation in a
 * file that the monitor does not read is found. A `git grep` that fails (`git` is missing, the root is not a
 * repository) is an error and not "nothing cites it", which would hide the warning this exists to give.
 *
 * @returns The places (`file:line`) of each key, empty for a key that nothing holds
 */
export function grepKeys(root: string, keys: readonly string[]): Map<string, string[]> {
	const found = new Map<string, Set<string>>(keys.map(key => [key, new Set<string>()]));
	for (let i = 0; i < keys.length; i += GREP_CHUNK) {
		const chunk = keys.slice(i, i + GREP_CHUNK);
		const result = spawnSync(
			'git',
			[
				'-c',
				'core.quotepath=off',
				'grep',
				'-n',
				'-F',
				'--no-color',
				...chunk.flatMap(key => ['-e', key]),
				'--',
				'.',
				':!scripts/spec-citations/spec-citations.lock.json',
			],
			{ cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
		);
		if (result.error !== undefined) {
			throw result.error;
		}
		// Status 1 is "no match".
		if (result.status !== 0 && result.status !== 1) {
			throw new Error(`git grep failed with status ${String(result.status)}: ${result.stderr}`);
		}
		for (const line of result.stdout.split(/\r?\n/)) {
			const match = /^(.+?):(\d+):(.*)$/.exec(line);
			if (match === null) {
				continue;
			}
			const [, path = '', lineNumber = '', content = ''] = match;
			for (const key of chunk) {
				if (containsKey(content, key)) {
					found.get(key)?.add(`${path}:${lineNumber}`);
				}
			}
		}
	}
	return new Map([...found].map(([key, places]) => [key, [...places].toSorted()]));
}

/**
 * Finds where each key is cited in the tree: in the citations the monitor reads (which also finds a source file
 * of a framework, cited as a GitHub URL and keyed by its raw file), and as a literal URL anywhere in a tracked
 * file other than the lock (`grepKeys`).
 */
export function findCitations(root: string, keys: readonly string[]): Map<string, string[]> {
	const found = new Map<string, Set<string>>(keys.map(key => [key, new Set<string>()]));

	for (const citation of collectFiles(root, listCitingFiles(root)).citations) {
		if (citation.fragment !== null) {
			found.get(`${citation.page}#${citation.fragment}`)?.add(`${citation.file}:${citation.line}`);
		}
	}
	for (const [key, places] of grepKeys(root, keys)) {
		for (const place of places) {
			found.get(key)?.add(place);
		}
	}

	return new Map([...found].map(([key, places]) => [key, [...places].toSorted()]));
}

if (isCliEntry(import.meta.url)) {
	const [beforePath, afterPath] = process.argv.slice(2);
	if (beforePath === undefined || afterPath === undefined) {
		process.stderr.write('Usage: lock-changes.ts <lock before> <lock after>\n');
		process.exitCode = 64;
	} else {
		const root = fileURLToPath(new URL('../../', import.meta.url));
		const changes = diffLocks(
			parseLock(readFileSync(beforePath, 'utf8')),
			parseLock(readFileSync(afterPath, 'utf8')),
		);
		const citedIn = findCitations(root, changes.removed);
		const description = describeLockChanges(changes, key => citedIn.get(key) ?? []);
		if (description !== '') {
			process.stdout.write(`${description}\n`);
		}
	}
}
