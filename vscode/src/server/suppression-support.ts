import type { Violation } from '@markuplint/ml-config';
import type { SuppressionsData, DowngradedViolation } from 'markuplint/suppressions';
import type { Log } from '../types.js';

import { execFile } from 'node:child_process';
import path from 'node:path';

import { isFatalError, readSuppressionsFile, analyzeForDowngrade, applyDowngrade } from 'markuplint/suppressions';

export type { DowngradedViolation } from 'markuplint/suppressions';

/**
 * @experimental
 * Cached state for a workspace's suppression file.
 */
export type SuppressionCache = {
	readonly data: SuppressionsData;
	readonly filePath: string;
	readonly lastCommitDate: Date | null;
};

type CacheEntry = {
	readonly cache: SuppressionCache;
	readonly expiresAt: number;
};

const suppressionCaches = new Map<string, CacheEntry>();

/** Cache TTL in milliseconds. Re-reads the suppressions file after this period. */
const CACHE_TTL_MS = 30_000;

const DEFAULT_FILE_NAME = 'markuplint-suppressions.json';

/**
 * Path to the git binary. Resolved from VS Code's `git.path` setting,
 * falling back to `'git'` (system PATH lookup).
 */
let gitBinaryPath = 'git';

/**
 * Tracks whether git is available in this environment.
 * Once determined to be unavailable (ENOENT / EACCES), all git calls are skipped
 * for the lifetime of the language server to avoid repeated child process failures.
 */
let gitAvailable: boolean | undefined;

/**
 * @experimental
 * Configures the git binary path for suppression support.
 * Should be called once during server initialization.
 *
 * @param gitPath - Path to the git binary from VS Code's `git.path` setting
 */
export function configureGitPath(gitPath: string | undefined): void {
	if (gitPath) {
		gitBinaryPath = gitPath;
	}
}

/**
 * @experimental
 * Resolves the suppressions file path for a workspace.
 */
function findSuppressionsFile(startDir: string): string {
	return path.resolve(startDir, DEFAULT_FILE_NAME);
}

/**
 * @experimental
 * Loads suppression data for a workspace, with TTL-based caching.
 * Returns null if no suppressions file exists.
 */
export async function loadSuppressions(workspace: string, log: Log): Promise<SuppressionCache | null> {
	const filePath = findSuppressionsFile(workspace);
	const cached = suppressionCaches.get(filePath);
	if (cached && Date.now() < cached.expiresAt) {
		return cached.cache;
	}

	const data = await readSuppressionsFile(filePath);
	if (Object.keys(data).length === 0) {
		suppressionCaches.delete(filePath);
		return null;
	}

	const lastCommitDate = await getSuppressionsFileCommitDate(filePath, log);

	const cache: SuppressionCache = { data, filePath, lastCommitDate };
	suppressionCaches.set(filePath, { cache, expiresAt: Date.now() + CACHE_TTL_MS });

	log(`Loaded suppressions from ${filePath} (committed: ${lastCommitDate?.toISOString() ?? 'uncommitted'})`, 'debug');

	return cache;
}

/**
 * @experimental
 * Invalidates the suppression cache for a workspace.
 * Should be called when the suppressions file changes.
 */
export function invalidateSuppressionCache(workspace: string): void {
	const filePath = findSuppressionsFile(workspace);
	suppressionCaches.delete(filePath);
}

/**
 * @experimental
 * Gets the last commit date of the suppressions file via `git log`.
 * Returns null if the file is not tracked or git is unavailable.
 */
async function getSuppressionsFileCommitDate(filePath: string, log: Log): Promise<Date | null> {
	if (gitAvailable === false) {
		return null;
	}

	try {
		const stdout = await execGit(
			['log', '-1', '--format=%aI', '--', path.basename(filePath)],
			path.dirname(filePath),
		);
		gitAvailable = true;
		const dateStr = stdout.trim();
		if (!dateStr) {
			return null;
		}
		return new Date(dateStr);
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		if (isGitUnavailableError(error)) {
			gitAvailable = false;
			log('git is not available; git blame features will be disabled', 'warn');
		} else {
			log('git log for suppressions file failed; git blame will be disabled', 'debug');
		}
		return null;
	}
}

/**
 * @experimental
 * Gets blame dates for specific lines in a file.
 * Returns a Map of line number → commit date.
 */
async function getBlameForLines(filePath: string, lines: readonly number[], log: Log): Promise<Map<number, Date>> {
	const result = new Map<number, Date>();
	if (lines.length === 0 || gitAvailable === false) {
		return result;
	}

	try {
		const args = ['blame', '--porcelain'];
		for (const line of lines) {
			args.push('-L', `${line},${line}`);
		}
		args.push('--', filePath);

		const stdout = await execGit(args, path.dirname(filePath));
		return parseBlamePorcelain(stdout);
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		if (isGitUnavailableError(error)) {
			gitAvailable = false;
			log('git is not available; git blame features will be disabled', 'warn');
		} else {
			log(`git blame failed for ${filePath}; treating all violations as old`, 'debug');
		}
	}

	return result;
}

/**
 * @experimental
 * Applies suppression severity downgrade to violations.
 *
 * - If count <= suppressed count: all violations for that rule → info
 * - If count > suppressed count: use git blame to distinguish old (→ info) vs new (→ original)
 * - Falls back to original severity when git is unavailable
 *
 * The git blame date comparison uses the suppressions file's last commit date
 * as the threshold. Lines authored before that date are considered "old"
 * (existed when suppressions were generated) and downgraded to info.
 * Lines authored after are considered "new" and keep their original severity.
 */
export async function applySuppressionsToViolations(
	absoluteFilePath: string,
	violations: readonly Violation[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	cache: SuppressionCache,
	log: Log,
): Promise<readonly DowngradedViolation[]> {
	const { withinThreshold, exceedingThreshold } = analyzeForDowngrade(
		absoluteFilePath,
		violations,
		cache.data,
		cache.filePath,
	);

	// Collect all indices to downgrade
	const downgradeIndices = new Set(withinThreshold);

	// For exceeding threshold rules, use git blame if available
	if (exceedingThreshold.size > 0 && cache.lastCommitDate) {
		const uniqueLines = new Set<number>();
		for (const indices of exceedingThreshold.values()) {
			for (const idx of indices) {
				uniqueLines.add(violations[idx]!.line);
			}
		}

		const blameDates = await getBlameForLines(absoluteFilePath, [...uniqueLines], log);

		for (const indices of exceedingThreshold.values()) {
			for (const idx of indices) {
				const violation = violations[idx]!;
				const blameDate = blameDates.get(violation.line);
				if (blameDate && blameDate <= cache.lastCommitDate) {
					downgradeIndices.add(idx);
				}
			}
		}
	}

	return applyDowngrade(violations, downgradeIndices);
}

/**
 * @experimental
 * Parses git blame porcelain output into a Map of line number → commit date.
 *
 * In porcelain format, the first occurrence of a commit SHA includes full
 * header (author-time, etc.), but subsequent occurrences of the same SHA
 * only include the abbreviated header (no author-time).
 * We cache timestamps by SHA to handle repeated commits.
 */
export function parseBlamePorcelain(stdout: string): Map<number, Date> {
	const result = new Map<number, Date>();
	const commitTimestamps = new Map<string, Date>();
	const shaLinePattern = /^([0-9a-f]{40}) \d+ (\d+)/gm;
	const authorTimePattern = /^author-time (\d+)$/gm;

	let shaMatch: RegExpExecArray | null;
	while ((shaMatch = shaLinePattern.exec(stdout)) !== null) {
		const sha = shaMatch[1]!;
		const lineNo = Number.parseInt(shaMatch[2]!, 10);

		if (!commitTimestamps.has(sha)) {
			authorTimePattern.lastIndex = shaMatch.index;
			const timeMatch = authorTimePattern.exec(stdout);
			if (timeMatch) {
				const timestamp = Number.parseInt(timeMatch[1]!, 10);
				commitTimestamps.set(sha, new Date(timestamp * 1000));
			}
		}

		const date = commitTimestamps.get(sha);
		if (date) {
			result.set(lineNo, date);
		}
	}

	return result;
}

/** Timeout for git commands (log, blame) in milliseconds. */
const GIT_TIMEOUT_MS = 5000;

/**
 * Executes a git command and returns stdout.
 */
function execGit(args: readonly string[], cwd: string): Promise<string> {
	return new Promise((resolve, reject) => {
		execFile(gitBinaryPath, args, { cwd, timeout: GIT_TIMEOUT_MS }, (error, stdout) => {
			if (error) {
				reject(error);
				return;
			}
			resolve(stdout);
		});
	});
}

/**
 * Checks if an error indicates git is not available (not installed or permission denied).
 * Used to permanently disable git features after the first failure.
 */
function isGitUnavailableError(error: unknown): boolean {
	if (!(error instanceof Error)) {
		return false;
	}
	const code = (error as NodeJS.ErrnoException).code;
	return code === 'ENOENT' || code === 'EACCES';
}
