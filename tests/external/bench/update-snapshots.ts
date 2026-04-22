import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { runCompare } from './compare.ts';
import { readJson, writeJson } from './fs-utils.ts';
import { generateSpec } from './generate-spec.ts';
import { EXTERNAL_DIR, META_PATH, NU_FAILURES_PATH } from './paths.ts';
import { runReport } from './report.ts';
import { runMarkuplint } from './run-markuplint.ts';
import { runNuValidator } from './run-nu-validator.ts';
import type { Meta } from './types.ts';

type Target = 'nu' | 'markuplint' | 'all';

function parseTarget(value: string | undefined): Target {
	if (value === 'nu' || value === 'markuplint' || value === 'all') return value;
	if (value === undefined) return 'all';
	throw new Error(`invalid --target: ${value} (expected nu | markuplint | all)`);
}

function submoduleSha(): string {
	try {
		const output = execFileSync('git', ['rev-parse', 'HEAD'], {
			cwd: `${EXTERNAL_DIR}/validator`,
			stdio: ['ignore', 'pipe', 'pipe'],
		});
		return output.toString('utf8').trim();
	} catch (error) {
		const msg = error instanceof Error ? error.message : String(error);
		console.warn(
			`[meta] could not resolve validator submodule SHA (${msg.split('\n')[0]}). ` +
				`Run 'git submodule update --init tests/external/validator' if the submodule has not been initialised. ` +
				'meta.json will record "unknown".',
		);
		return 'unknown';
	}
}

async function main(): Promise<void> {
	const { values } = parseArgs({
		options: {
			target: { type: 'string' },
			filter: { type: 'string' },
			concurrency: { type: 'string' },
			'image-tag': { type: 'string' },
			'dry-run': { type: 'boolean' },
			'skip-refresh': { type: 'boolean' },
		},
	});

	const target = parseTarget(values.target);
	const filter = values.filter;
	const concurrency = values.concurrency ? Number.parseInt(values.concurrency, 10) : undefined;
	const imageTag = values['image-tag'];
	const dryRun = values['dry-run'] ?? false;
	const skipRefresh = values['skip-refresh'] ?? false;

	const previous: Partial<Meta> = existsSync(META_PATH) ? await readJson<Meta>(META_PATH) : {};

	let nuDigest = previous.nuValidatorImage ?? '';
	let mlVersion = previous.markuplintVersion ?? '';
	let totalFilesNu = previous.totalFilesNu ?? 0;
	let totalFilesMl = previous.totalFilesMl ?? 0;
	let totalNuMessages = previous.totalNuMessages ?? 0;
	let totalMlViolations = previous.totalMlViolations ?? 0;
	let totalNuFailures = previous.totalNuFailures ?? 0;
	let nuFailures: readonly { path: string; error: string }[] = [];

	if (target === 'nu' || target === 'all') {
		console.log(`[nu] running nu-validator snapshot update (filter=${filter ?? '**/*.html'})`);
		const result = await runNuValidator({ filter, concurrency, imageTag, dryRun });
		nuDigest = result.imageDigest;
		totalFilesNu = result.totalFiles;
		totalNuMessages = result.totalMessages;
		totalNuFailures = result.failures.length;
		nuFailures = result.failures;
		console.log(
			`[nu] files=${result.totalFiles} messages=${result.totalMessages} failures=${result.failures.length}`,
		);
		for (const failure of result.failures.slice(0, 5)) {
			console.log(`[nu] !! ${failure.path} (${failure.error})`);
		}
	}

	if (target === 'markuplint' || target === 'all') {
		console.log(`[ml] running markuplint snapshot update (filter=${filter ?? '**/*.html'})`);
		const result = await runMarkuplint({ filter, concurrency, dryRun });
		mlVersion = result.version;
		totalFilesMl = result.totalFiles;
		totalMlViolations = result.totalViolations;
		console.log(
			`[ml] files=${result.totalFiles} violations=${result.totalViolations} parseErrors=${result.parseErrors}`,
		);
	}

	if (dryRun) {
		console.log('[dry-run] skipped meta.json update');
		return;
	}

	const meta: Meta = {
		generatedAt: new Date().toISOString(),
		submoduleSha: submoduleSha(),
		nuValidatorImage: nuDigest,
		markuplintVersion: mlVersion,
		nodeVersion: process.versions.node,
		totalFilesNu,
		totalFilesMl,
		totalNuMessages,
		totalMlViolations,
		totalNuFailures,
	};
	await writeJson(META_PATH, meta);
	console.log('[meta] written', META_PATH);

	if (target === 'nu' || target === 'all') {
		await writeJson(NU_FAILURES_PATH, { entries: nuFailures });
		console.log(`[nu-failures] wrote ${nuFailures.length} entries`);
	}

	if (skipRefresh) {
		console.log('[refresh] skipped (--skip-refresh)');
		return;
	}

	await runCompare();
	await generateSpec();
	await runReport();
}

main().catch(error => {
	console.error(error);
	process.exit(1);
});
