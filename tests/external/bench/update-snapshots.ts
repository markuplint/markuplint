import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { runCompare } from './compare.ts';
import { readJson, writeJson } from './fs-utils.ts';
import { generateSpec } from './generate-spec.ts';
import { EXTERNAL_DIR, META_PATH } from './paths.ts';
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
			stdio: ['ignore', 'pipe', 'ignore'],
		});
		return output.toString('utf8').trim();
	} catch {
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
	let totalFiles = previous.totalFiles ?? 0;
	let totalNuMessages = previous.totalNuMessages ?? 0;
	let totalMlViolations = previous.totalMlViolations ?? 0;

	if (target === 'nu' || target === 'all') {
		console.log(`[nu] running nu-validator snapshot update (filter=${filter ?? '**/*.html'})`);
		const result = await runNuValidator({ filter, concurrency, imageTag, dryRun });
		nuDigest = result.imageDigest;
		totalFiles = Math.max(totalFiles, result.totalFiles);
		totalNuMessages = result.totalMessages;
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
		totalFiles = Math.max(totalFiles, result.totalFiles);
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
		totalFiles,
		totalNuMessages,
		totalMlViolations,
	};
	await writeJson(META_PATH, meta);
	console.log('[meta] written', META_PATH);

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
