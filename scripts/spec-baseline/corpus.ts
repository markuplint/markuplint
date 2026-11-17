/**
 * The history of the generated spec data (`@markuplint/html-spec/index.json`) as a corpus.
 *
 * The sizes and shapes of the data depend on the revision, and the shape changed more than once
 * (`size.ts`), so a measurement of the current file says little about what a format has to
 * carry. Every revision that git has is read here, by the blob that git stores.
 *
 * Nothing extracted is written into the repository: a blob is identified by its hash, so the
 * revision is reproduced from git on demand and a copy would only be a second source of the same
 * bytes. The functions take the `git` call as a parameter so that the parsing is testable without
 * a repository.
 *
 * @module
 */
import { execFileSync } from 'node:child_process';

/** Runs `git` with the arguments and returns its standard output. */
export type Git = (args: readonly string[]) => Buffer | string;

/** One commit that changed the file. */
export interface Revision {
	readonly commit: string;
	/** The committer date, ISO 8601. */
	readonly date: string;
	/** Where the file was at that commit: it was `html-ls/index.json` before it was renamed. */
	readonly path: string;
	/** The hash of the content that git stores. */
	readonly blob: string;
}

/** A distinct content of the file. */
export interface UniqueRevision extends Revision {
	/** How many commits of the history carried exactly this content. */
	readonly commits: number;
}

const NULL_BLOB = /^0+$/;
const HEADER = /^(?<commit>[\da-f]{40})\t(?<date>\S+)$/;
const RAW = /^:\d+ \d+ [\da-f]{40} (?<blob>[\da-f]{40}) [A-Z]\d*\t(?<paths>.+)$/;

/**
 * Parses `git log --follow --raw --no-abbrev --format=%H%x09%cI`.
 *
 * @param output - What that command printed
 * @returns The revisions in the order of the log (newest first); a commit that deletes the file has none
 */
export function parseLog(output: string): Revision[] {
	const revisions: Revision[] = [];
	let current: { commit: string; date: string } | null = null;
	for (const line of output.split('\n')) {
		const header = HEADER.exec(line);
		if (header?.groups) {
			current = { commit: header.groups.commit ?? '', date: header.groups.date ?? '' };
			continue;
		}
		const raw = RAW.exec(line);
		if (!raw?.groups || !current) {
			continue;
		}
		const blob = raw.groups.blob ?? '';
		if (NULL_BLOB.test(blob)) {
			continue;
		}
		// After a rename the line has the old path and then the new one, and the blob is at the new one.
		const path = (raw.groups.paths ?? '').split('\t').at(-1) ?? '';
		revisions.push({ ...current, path, blob });
	}
	return revisions;
}

/**
 * Lists the commits that changed a file, following it across the rename that moved it.
 *
 * @param git - Runs `git`
 * @param ref - The commit or branch to read the history of
 * @param path - The current path of the file
 * @returns The revisions, newest first
 */
export function listRevisions(git: Git, ref: string, path: string): Revision[] {
	const output = git(['log', '--follow', '--raw', '--no-abbrev', '--format=%H%x09%cI', ref, '--', path]);
	return parseLog(output.toString());
}

/**
 * Collapses the revisions that carry the same content.
 *
 * @param revisions - The revisions, newest first
 * @returns One entry for each blob, at its newest commit
 */
export function uniqueByBlob(revisions: readonly Revision[]): UniqueRevision[] {
	const byBlob = new Map<string, { revision: Revision; commits: number }>();
	for (const revision of revisions) {
		const entry = byBlob.get(revision.blob);
		if (entry) {
			entry.commits++;
		} else {
			byBlob.set(revision.blob, { revision, commits: 1 });
		}
	}
	return [...byBlob.values()].map(({ revision, commits }) => ({ ...revision, commits }));
}

/**
 * Stops a run on a shallow clone, where the history is not there and the corpus would be a handful of revisions
 * without a sign of it.
 *
 * @param git - Runs `git`
 */
export function assertFullHistory(git: Git): void {
	if (git(['rev-parse', '--is-shallow-repository']).toString().trim() === 'true') {
		throw new Error(
			'The repository is a shallow clone, so the history of the data is missing: git fetch --unshallow',
		);
	}
}

/**
 * Reads the content of a blob.
 *
 * @param git - Runs `git`
 * @param blob - The hash of the blob
 * @returns The bytes exactly as git stores them
 */
export function readBlob(git: Git, blob: string): Buffer {
	const out = git(['cat-file', 'blob', blob]);
	return Buffer.isBuffer(out) ? out : Buffer.from(out);
}

/**
 * A {@link Git} that runs the `git` of the machine in a directory.
 *
 * @param cwd - The directory inside the repository
 * @returns The runner; its output is a `Buffer`, as a blob is not always text
 */
export function systemGit(cwd: string): Git {
	return args => execFileSync('git', [...args], { cwd, maxBuffer: 256 * 1024 * 1024 });
}
