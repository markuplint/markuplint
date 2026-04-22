import { readFile } from 'node:fs/promises';
import { availableParallelism } from 'node:os';
import { join } from 'node:path';

import { mlTest } from 'markuplint';
import pkg from 'markuplint/package.json' with { type: 'json' };

import { BENCHMARK_CONFIG_ID, benchmarkConfig } from './config.ts';
import { collectHtmlFiles, pLimit, sha256Hex, writeJson } from './fs-utils.ts';
import { ML_SNAPSHOTS_DIR, VALIDATOR_TESTS_DIR } from './paths.ts';
import type { MarkuplintSnapshot, MlViolation } from './types.ts';

export type RunMarkuplintOptions = {
	readonly filter?: string;
	readonly concurrency?: number;
	readonly dryRun?: boolean;
};

export type RunMarkuplintResult = {
	readonly version: string;
	readonly totalFiles: number;
	readonly totalViolations: number;
	readonly parseErrors: number;
};

function sortViolations(violations: readonly MlViolation[]): MlViolation[] {
	return [...violations].sort((a, b) => {
		return (
			a.line - b.line ||
			a.col - b.col ||
			a.ruleId.localeCompare(b.ruleId) ||
			a.message.localeCompare(b.message)
		);
	});
}

export async function runMarkuplint(options: RunMarkuplintOptions = {}): Promise<RunMarkuplintResult> {
	const files = await collectHtmlFiles(VALIDATOR_TESTS_DIR, options.filter);
	if (files.length === 0) {
		throw new Error(`no HTML files matched under ${VALIDATOR_TESTS_DIR} (filter=${options.filter ?? '**/*.html'})`);
	}

	const version = String(pkg.version);
	if (options.dryRun) {
		return { version, totalFiles: files.length, totalViolations: 0, parseErrors: 0 };
	}

	const concurrency = Math.min(
		options.concurrency ?? Math.max(1, availableParallelism() - 1),
		Math.max(1, availableParallelism()),
	);

	let totalViolations = 0;
	let parseErrors = 0;

	await pLimit(files, concurrency, async relPath => {
		const absolute = join(VALIDATOR_TESTS_DIR, relPath);
		const html = await readFile(absolute, 'utf8');

		let parseError = false;
		let violations: readonly MlViolation[] = [];
		try {
			const { violations: raw } = await mlTest(html, benchmarkConfig);
			violations = raw.map(v => ({
				ruleId: v.ruleId,
				severity: v.severity,
				message: v.message,
				line: v.line,
				col: v.col,
				raw: v.raw,
			}));
		} catch {
			parseError = true;
			parseErrors += 1;
		}

		const sorted = sortViolations(violations);
		totalViolations += sorted.length;

		const snapshot: MarkuplintSnapshot = {
			source: {
				path: relPath,
				sha256: sha256Hex(html),
			},
			markuplint: {
				version,
				configId: BENCHMARK_CONFIG_ID,
				violations: sorted,
				parseError,
			},
		};

		const outPath = join(ML_SNAPSHOTS_DIR, relPath.replace(/\.html$/, '.json'));
		await writeJson(outPath, snapshot);
	});

	return {
		version,
		totalFiles: files.length,
		totalViolations,
		parseErrors,
	};
}
