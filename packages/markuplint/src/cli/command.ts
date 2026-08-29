import type { CLIOptions } from './bootstrap.js';
import type { APIOptions } from '../api/types.js';
import type { PositionedNode } from '../suppressions/compute-scope.js';
import type { Target } from '@markuplint/file-resolver';
import type { Severity, SeverityOptions, Violation } from '@markuplint/ml-config';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { resolveFiles } from '@markuplint/file-resolver';
import { CONFIG_ERROR_RULE_ID, RULE_DEPRECATION_RULE_ID, ViolationCollector } from '@markuplint/ml-core';
import { isFatalError } from '@markuplint/shared';

import { MLEngine } from '../api/index.js';
import { log } from '../debug.js';
import {
	applySuppressions,
	generateSuppressions,
	mergeSuppressions,
	pruneSuppressions,
	readSuppressionsFile,
	resolveSuppressionsPath,
	writeSuppressionsFile,
} from '../suppressions/index.js';

import { outputDryRunDiff } from './dry-run-output.js';
import { output, outputSummary } from './output.js';

/**
 * Synthetic ruleIds produced from resolving the run's config rather than
 * from linting a file's content (`config-error`: broken config;
 * `rule-deprecation`: deprecated-but-working rule names). Both regenerate
 * identically for every file in a run, so both need the same per-run dedupe
 * and the same exclusion from per-file failure counting — see the two call
 * sites below.
 */
const CONFIG_LEVEL_RULE_IDS = new Set([CONFIG_ERROR_RULE_ID, RULE_DEPRECATION_RULE_ID]);

/**
 * Validates a `--severity-*` flag's raw string value against the uniform
 * single-value form both `--severity-parse-error` and `--severity-deprecation`
 * accept, shared so adding another such flag doesn't mean copy-pasting this
 * check again.
 *
 * @returns the validated value, or `undefined` if unset or not one of
 * `"error"`, `"warning"`, `"off"`.
 */
function parseSeverityFlag(value: string | undefined): Severity | 'off' | undefined {
	const normalized = value?.toLowerCase();
	if (normalized != null && ['error', 'warning', 'off'].includes(normalized)) {
		return normalized as Severity | 'off';
	}
	return undefined;
}

export async function command(files: readonly Readonly<Target>[], options: CLIOptions, apiOptions?: APIOptions) {
	const fixDryRun = options.fixDryRun;
	if (options.fix && fixDryRun) {
		log('Both --fix and --fix-dry-run specified; --fix-dry-run takes precedence');
		process.stderr.write('Warning: --fix-dry-run takes precedence over --fix. Files will not be modified.\n');
	}
	const fix = options.fix || fixDryRun;

	// Mutual exclusion checks for suppressions flags
	const isSuppressMode = options.suppress || options.suppressRule != null;
	const isPruneMode = options.pruneSuppressions;

	if (isSuppressMode && isPruneMode) {
		process.stderr.write('Error: --suppress/--suppress-rule and --prune-suppressions cannot be used together.\n');
		return true;
	}

	const configFile =
		options.config &&
		(path.isAbsolute(options.config) ? options.config : path.resolve(process.cwd(), options.config));
	const locale = options.locale;
	const searchConfig = options.searchConfig;
	const ignoreExt = options.ignoreExt;
	const importPresetRules = options.importPresetRules;
	const verbose = options.verbose;
	const ignoreGlob = options.includeNodeModules ? undefined : 'node_modules/**';

	const fileList = await resolveFiles(files, ignoreGlob);

	if (fileList.length === 0 && !options.allowEmptyInput) {
		process.stderr.write('Markuplint: No target files.\n');
		// Error
		return true;
	}

	if (log.enabled) {
		log(
			'File list: %O',
			fileList.map(f => f.path),
		);
		log('Config: %s', configFile ?? 'N/A');
		log('Fix option: %s', fix);
	}

	const format = options.format?.toLowerCase().trim();

	let hasError = false;
	let totalWarningCount = 0;

	const collector = new ViolationCollector(options.maxCount);
	const processedFiles: string[] = [];
	const skippedFiles: string[] = [];
	// Config-level violations (`CONFIG_LEVEL_RULE_IDS`: unresolved rule
	// references, deprecated rule names, ...) come from resolving this run's
	// config, so the same message is identical across every file. Track
	// messages already reported once so a run over many files doesn't repeat
	// the same lines per file — the config is one thing, not N things.
	const seenConfigMessages = new Set<string>();
	const filesContent = new Map<string, { sourceCode: string; fixedCode: string }>();
	const engines = new Map<string, MLEngine>();
	const parsedSeverityParseError = parseSeverityFlag(options.severityParseError);
	const parsedSeverityDeprecation = parseSeverityFlag(options.severityDeprecation);
	const severity: SeverityOptions = {
		...(parsedSeverityParseError != null && { parseError: parsedSeverityParseError }),
		...(parsedSeverityDeprecation != null && { deprecation: parsedSeverityDeprecation }),
	};

	// Progressive output prints each file's own violations as soon as that
	// file is processed, ahead of the two whole-run passes that batch output
	// waits for: suppressions (applied once at the end, below, via
	// `applySuppressions`, since scope resolution and the "unused entry"
	// report need the complete result set) and `--max-count` truncation
	// (enforced by `collector.pushWithFile`'s running total across files,
	// including which file the limit is hit within and which later files are
	// skipped entirely). Printing per file ahead of either pass would show
	// violations, or omit a skipped-file notice, that the run's own summary
	// and exit code then contradict. Rather than duplicate that truncation
	// and suppression logic in the progressive branch, fall back to batch
	// output for the whole run whenever either is in play; --suppress and
	// --prune-suppressions manage the suppressions file directly and are
	// unaffected.
	let progressiveOutput = options.progressiveOutput;
	if (progressiveOutput && options.maxCount > 0) {
		progressiveOutput = false;
	}
	if (progressiveOutput && !isSuppressMode && !isPruneMode) {
		const suppressionsFilePathForCheck = resolveSuppressionsPath(options.suppressionsLocation);
		const existingSuppressions = await readSuppressionsFile(suppressionsFilePathForCheck);
		if (Object.keys(existingSuppressions).length > 0) {
			progressiveOutput = false;
		}
	}

	for (const file of fileList) {
		// Check if collector is already locked (max-count reached)
		if (collector.isLocked()) {
			log('Skipping file due to max-count limit: %s', file.path);
			skippedFiles.push(file.path);
			continue;
		}

		const engine = new MLEngine(file, {
			configFile,
			fix,
			locale,
			noSearchConfig: !searchConfig,
			ignoreExt,
			importPresetRules,
			debug: verbose,
			severity,
			...apiOptions,
		});

		if (options.showConfig != null) {
			const isDetails = options.showConfig === 'details';
			const configSet = await engine.resolveConfig(false);
			let data: any;
			if (isDetails) {
				const files = [...configSet.files].toReversed();
				const [configurationFile, ...dependencies] = files;
				data = {
					target: file.path,
					computedConfig: configSet.config,
					configurationFile: configurationFile,
					dependencies,
					plugins: configSet.plugins,
					errors: configSet.errs,
					ruleDeprecations: configSet.ruleDeprecations,
				};
			} else {
				data = configSet.config;
			}

			process.stdout.write(JSON.stringify(data, null, 2) + '\n');
			return false;
		}

		const result = await engine.exec();
		if (!result) {
			continue;
		}

		processedFiles.push(result.filePath);
		filesContent.set(result.filePath, {
			sourceCode: result.sourceCode,
			fixedCode: result.fixedCode,
		});

		// Store engine for scope computation in suppressions
		engines.set(result.filePath, engine);

		// In fix mode, report the violations remaining in the FIXED code
		// (re-verified by ml-core) instead of the pre-fix violations, so that
		// the exit code and suppressions reflect the written output.
		// With --fix-dry-run the file is NOT modified, so keep the first-pass
		// violations, which match the file on disk.
		const violationsBeforeDedupe = fixDryRun
			? result.violations
			: (result.fixSummary?.finalPassViolations ?? result.violations);

		// Config-level violations are regenerated fresh per file (config
		// resolution is not shared across a run), so an identical message
		// would otherwise repeat once per file. Keep only the first
		// occurrence across this run.
		const reportedViolations = violationsBeforeDedupe.filter(violation => {
			if (!CONFIG_LEVEL_RULE_IDS.has(violation.ruleId)) {
				return true;
			}
			const key = `${violation.ruleId} ${violation.message}`;
			if (seenConfigMessages.has(key)) {
				return false;
			}
			seenConfigMessages.add(key);
			return true;
		});

		// Progressive出力が有効でJSON形式でない場合
		if (progressiveOutput && format !== 'json') {
			// 即座に出力
			output(
				{
					violations: reportedViolations,
					filePath: result.filePath,
					sourceCode: result.sourceCode,
					fixedCode: result.fixedCode,
					status: 'processed',
				},
				options,
			);
		}

		// Add violations to collector
		collector.pushWithFile(result.filePath, ...reportedViolations);

		const errorCount = reportedViolations.filter(v => v.severity === 'error').length;
		const warningCount = reportedViolations.filter(v => v.severity === 'warning').length;

		// Track total warning count across all files
		totalWarningCount += warningCount;

		if (!hasError && (errorCount > 0 || (warningCount > 0 && !options.allowWarnings))) {
			hasError = true;
		}

		if (fix && !fixDryRun) {
			log('Overwrite file: %s', result.filePath);
			await fs.writeFile(result.filePath, result.fixedCode, { encoding: 'utf8' });
		} else if (fix && fixDryRun && result.sourceCode !== result.fixedCode) {
			outputDryRunDiff(result.filePath, result.sourceCode, result.fixedCode);
		}
	}

	// --- Suppressions handling ---
	const suppressionsFilePath = resolveSuppressionsPath(options.suppressionsLocation);
	const collectedViolationsByFile = collector.groupByFile();

	// Build nodeLists map from engines for scope computation
	const nodeLists = new Map<string, readonly PositionedNode[]>();
	for (const [filePath, engine] of engines) {
		const doc = engine.document;
		if (doc) {
			// MLNode structurally satisfies PositionedNode (startLine, startCol, localName,
			// id, classList, parentElement, children are all present). The double cast is
			// needed because TypeScript can't verify structural compatibility between the
			// generic MLNode<T,O> and the plain PositionedNode interface at compile time.
			nodeLists.set(filePath, doc.nodeList as unknown as PositionedNode[]);
		}
	}

	if (isSuppressMode) {
		// Suppress mode: generate/update suppressions file
		const existing = await readSuppressionsFile(suppressionsFilePath);
		const generated = generateSuppressions(collectedViolationsByFile, suppressionsFilePath, {
			filterRule: options.suppressRule,
			nodeLists,
		});
		const merged = mergeSuppressions(existing, generated);
		await writeSuppressionsFile(suppressionsFilePath, merged);

		let totalSuppressed = 0;
		let totalRules = 0;
		for (const rules of Object.values(generated)) {
			for (const entry of Object.values(rules)) {
				totalSuppressed += entry.count;
				totalRules++;
			}
		}
		process.stderr.write(
			`[Experimental] ${totalSuppressed} violation(s) for ${totalRules} rule(s) suppressed in ${path.relative(process.cwd(), suppressionsFilePath)}\n`,
		);
		return false;
	}

	if (isPruneMode) {
		// Prune mode: remove stale entries
		const existing = await readSuppressionsFile(suppressionsFilePath);
		if (Object.keys(existing).length === 0) {
			process.stderr.write('No suppressions file found. Nothing to prune.\n');
			return false;
		}
		const pruned = pruneSuppressions(collectedViolationsByFile, existing, suppressionsFilePath);
		await writeSuppressionsFile(suppressionsFilePath, pruned);

		const existingCount = Object.values(existing).reduce((sum, rules) => sum + Object.keys(rules).length, 0);
		const prunedCount = Object.values(pruned).reduce((sum, rules) => sum + Object.keys(rules).length, 0);
		const removedCount = existingCount - prunedCount;
		process.stderr.write(
			`[Experimental] Suppressions pruned: ${removedCount} entry/entries removed, ${prunedCount} remaining.\n`,
		);
		return false;
	}

	// Normal lint mode: apply suppressions if file exists
	let outputViolationsByFile = collectedViolationsByFile;
	let suppressionsApplied = false;

	try {
		await fs.access(suppressionsFilePath);
		const suppressionsData = await readSuppressionsFile(suppressionsFilePath);
		if (Object.keys(suppressionsData).length > 0) {
			const { filtered, unusedEntries } = applySuppressions(
				collectedViolationsByFile,
				suppressionsData,
				suppressionsFilePath,
				{ nodeLists },
			);
			outputViolationsByFile = filtered;
			suppressionsApplied = true;

			if (unusedEntries.length > 0) {
				process.stderr.write(
					`[Experimental] ${unusedEntries.length} unused suppression entry/entries found. Run with --prune-suppressions to clean up.\n`,
				);
			}

			// Recalculate hasError and totalWarningCount from filtered violations
			hasError = false;
			totalWarningCount = 0;
			for (const violations of filtered.values()) {
				const errorCount = violations.filter(v => v.severity === 'error').length;
				const warningCount = violations.filter(v => v.severity === 'warning').length;
				totalWarningCount += warningCount;
				if (errorCount > 0 || (warningCount > 0 && !options.allowWarnings)) {
					hasError = true;
				}
			}
		}
	} catch (error) {
		if (isFatalError(error)) {
			throw error;
		}
		// Suppressions file does not exist or is unreadable, proceed normally
	}

	// Output results
	if (format === 'json') {
		if (suppressionsApplied) {
			// Build filtered array with filePath
			const jsonOutput: (Violation & { filePath: string })[] = [];
			for (const [filePath, violations] of outputViolationsByFile) {
				for (const violation of violations) {
					jsonOutput.push({ ...violation, filePath });
				}
			}
			process.stdout.write(JSON.stringify(jsonOutput, null, 2) + '\n');
		} else {
			const jsonOutput = collector.toArray();
			process.stdout.write(JSON.stringify(jsonOutput, null, 2) + '\n');
		}
		return false;
	}

	// Progressive出力が無効の場合のみループ後に出力
	if (!progressiveOutput) {
		// Output per file - include processed files without violations
		for (const filePath of processedFiles) {
			const violations = outputViolationsByFile.get(filePath) || [];
			const content = filesContent.get(filePath) || { sourceCode: '', fixedCode: '' };

			if (violations.length === 0 && !options.problemOnly) {
				log('Output reports');
				output(
					{
						violations,
						filePath,
						sourceCode: content.sourceCode,
						fixedCode: content.fixedCode,
						status: 'processed',
					},
					options,
				);
			} else if (violations.length > 0) {
				log('Output reports');
				output(
					{
						violations,
						filePath,
						sourceCode: content.sourceCode,
						fixedCode: content.fixedCode,
						status: 'processed',
					},
					options,
				);
			}
		}

		// Output skipped files
		if (!options.problemOnly) {
			for (const filePath of skippedFiles) {
				log('Output skipped file report');
				output({ violations: [], filePath, sourceCode: '', fixedCode: '', status: 'skipped' }, options);
			}
		}
	}

	let errorCount = 0;
	let warningCount = 0;
	let noticeCount = 0;
	let failedFileCount = 0;

	for (const filePath of processedFiles) {
		const violations = outputViolationsByFile.get(filePath) || [];
		// A file whose only violations are config-level (`CONFIG_LEVEL_RULE_IDS`)
		// didn't fail on its own content — the config issue is reported once
		// for the whole run (see the dedupe above), not attributable to this
		// particular file.
		if (violations.some(violation => !CONFIG_LEVEL_RULE_IDS.has(violation.ruleId))) {
			failedFileCount++;
		}
		for (const violation of violations) {
			switch (violation.severity) {
				case 'error': {
					errorCount++;
					break;
				}
				case 'warning': {
					warningCount++;
					break;
				}
				case 'info': {
					noticeCount++;
					break;
				}
			}
		}
	}

	outputSummary(
		{
			checkedFileCount: processedFiles.length,
			failedFileCount,
			skippedFileCount: skippedFiles.length,
			errorCount,
			warningCount,
			noticeCount,
		},
		options,
	);

	// Check if max-warnings limit is exceeded (ESLint compatible)
	if (!hasError && options.maxWarnings >= 0 && totalWarningCount > options.maxWarnings) {
		hasError = true;
	}

	return hasError;
}
