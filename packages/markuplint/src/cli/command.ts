import type { CLIOptions } from './bootstrap.js';
import type { APIOptions } from '../api/types.js';
import type { PositionedNode } from '../suppressions/compute-scope.js';
import type { SuppressionsData } from '../suppressions/types.js';
import type { Target } from '@markuplint/file-resolver';
import type { Severity, SeverityOptions, Violation } from '@markuplint/ml-config';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { ConfigProvider, resolveFiles } from '@markuplint/file-resolver';
import { ViolationCollector } from '@markuplint/ml-core';

import { MLEngine } from '../api/index.js';
import { log } from '../debug.js';
import {
	applySuppressions,
	generateSuppressions,
	mergeSuppressions,
	pruneSuppressions,
	readSuppressionsFile,
	resolveSuppressionsPath,
	toAbsolutePath,
	toRelativePath,
	writeSuppressionsFile,
} from '../suppressions/index.js';
import { CONFIG_LEVEL_RULE_IDS, dedupeConfigLevelViolations } from '../dedupe-config-violations.js';

import { outputDryRunDiff } from './dry-run-output.js';
import { output, outputSummary } from './output.js';

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

/**
 * Applies the suppressions of one file to that file's violations.
 *
 * Suppression is count-based per (file, rule), so it has to see every
 * violation the file has, never a list `--max-count` already cut short:
 * cut short, an entry would cover violations it does not cover in full, and
 * would be called unused when what it covers was only left out of the
 * report.
 *
 * @param filePath Absolute path of the linted file.
 * @param violations Every violation of the file.
 * @param suppressions The suppressions data read at the start of the run.
 * @param suppressionsFilePath Absolute path of the suppressions file.
 * @param nodeList The file's document node list, for scope-aware entries.
 * @returns The violations the entries of the file do not suppress, and the
 * entries of the file that suppressed nothing (`"<path>:<ruleId>"`).
 */
function applyFileSuppressions(
	filePath: string,
	violations: readonly Violation[],
	suppressions: SuppressionsData,
	suppressionsFilePath: string,
	nodeList: readonly PositionedNode[] | undefined,
): {
	readonly kept: readonly Violation[];
	readonly unusedEntries: readonly string[];
} {
	const relPath = toRelativePath(filePath, suppressionsFilePath);
	const fileSuppressions = suppressions[relPath];
	if (!fileSuppressions) {
		return { kept: violations, unusedEntries: [] };
	}
	// An entry that cannot be applied fails the run: treating it as "suppresses
	// nothing" would fail the build on violations the file is meant to
	// suppress, with no word on why.
	const { filtered, unusedEntries } = applySuppressions(
		new Map([[filePath, violations]]),
		{ [relPath]: fileSuppressions },
		suppressionsFilePath,
		{ nodeLists: nodeList ? new Map([[filePath, nodeList]]) : undefined },
	);
	return { kept: filtered.get(filePath) ?? [], unusedEntries };
}

/**
 * Runs the CLI over the given targets and writes the report in the format
 * `--format` selects.
 *
 * @param files Files or source code to lint.
 * @param options The parsed CLI flags.
 * @param apiOptions Options passed through to every `MLEngine`.
 * @param onLinted Called with the engine and the path of each file that was linted, once `exec()` returned and
 * before the next file; the engine is on the document it linted. `--search` reads that document
 * through it. A file that is ignored is not passed.
 * @returns `true` when the process must exit with `1`: an error, a warning
 * with `--no-allow-warnings`, more warnings than `--max-warnings`, or a
 * usage error such as no target files. The decision does not depend on
 * `--format`: CI reads the exit code whatever format the report is in. Nor
 * does it depend on `--max-count`, which only decides what the report shows:
 * a violation the limit hides, and every violation of a file after the
 * limit, still counts. (`--fix`, `--suppress` and `--prune-suppressions`
 * ignore the limit altogether; see `maxCount` below.)
 * `--show-config`, `--suppress` and `--prune-suppressions` do not lint for
 * a verdict, so they return `false` whatever violations exist.
 */
export async function command(
	files: readonly Readonly<Target>[],
	options: CLIOptions,
	apiOptions?: APIOptions,
	onLinted?: (engine: MLEngine, filePath: string) => void,
) {
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

	// `--max-count` limits what a lint report shows. `--fix` has to reach every
	// file, and `--suppress` / `--prune-suppressions` write what the whole run
	// found: a cut-short run would record too few violations, and would prune
	// the entries of the files it never reached.
	const maxCount = isSuppressMode || isPruneMode || fix ? 0 : options.maxCount;

	const configFile = options.config;
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

	const collector = new ViolationCollector(maxCount);
	const processedFiles: string[] = [];
	const skippedFiles: string[] = [];
	// Targets the engine returned no result for (excluded by the config).
	// They have no violations because they are not linted, which is what
	// `--prune-suppressions` needs to see for their entries.
	const ignoredFiles: string[] = [];
	// See `dedupeConfigLevelViolations` for why this Set needs to persist
	// across the whole run (not per file).
	const seenConfigMessages = new Set<string>();
	// The same for the files after the `--max-count` limit, which are not
	// reported: they start from what the reported files already showed, so a
	// config-level message counts once for the run's verdict, not once per
	// skipped file, and the report's own Set is left as it is.
	let seenConfigMessagesOfSkipped: Set<string> | undefined;
	const filesContent = new Map<string, { sourceCode: string; fixedCode: string }>();
	// Suppressions scope computation is the only consumer of the parsed
	// documents. A normal run applies a file's suppressions while that file is
	// processed, so its document is not kept past the iteration; only
	// --suppress, which generates scopes for the whole run once it is over,
	// retains them. Retaining every file's document otherwise keeps N DOM
	// trees reachable until the command ends.
	//
	// A normal run reads the suppressions file exactly once, here, and applies
	// that same snapshot to every file. A file that cannot be read or parsed
	// fails the run in every output mode: which mode prints the report must
	// not decide whether a broken suppressions file is noticed.
	const suppressionsFilePath = resolveSuppressionsPath(options.suppressionsLocation);
	let normalRunSuppressions: SuppressionsData = {};
	if (!isSuppressMode && !isPruneMode) {
		normalRunSuppressions = await readSuppressionsFile(suppressionsFilePath);
	}
	const needsScope = isSuppressMode || Object.keys(normalRunSuppressions).length > 0;
	const nodeLists = new Map<string, readonly PositionedNode[]>();
	// Entries of the suppressions file that suppressed nothing in a file this
	// run linted. A file the run did not lint (outside the targets) cannot be
	// judged, so its entries are never listed.
	const unusedSuppressionEntries: string[] = [];
	// Shared across every file in this run so its config cache — keyed by
	// resolved config `names`, not by target file — actually helps: config
	// loading/merging/plugin-resolution is done once per distinct config,
	// not once per file. See #3997.
	const configProvider = new ConfigProvider();
	const parsedSeverityParseError = parseSeverityFlag(options.severityParseError);
	const parsedSeverityDeprecation = parseSeverityFlag(options.severityDeprecation);
	const severity: SeverityOptions = {
		...(parsedSeverityParseError != null && { parseError: parsedSeverityParseError }),
		...(parsedSeverityDeprecation != null && { deprecation: parsedSeverityDeprecation }),
	};

	// Progressive output prints each file's own violations as soon as that
	// file is processed. A file's suppressions are applied right there, so
	// what is printed is what the run keeps. `--max-count` truncation is the
	// one whole-run pass it cannot join: it is enforced by
	// `collector.pushWithFile`'s running total across files, including which
	// file the limit is hit within and which later files are skipped
	// entirely. Printing per file ahead of it would show violations, or omit
	// a skipped-file notice, that the run's own summary then contradicts, so
	// the whole run falls back to batch output whenever it is in play.
	let progressiveOutput = options.progressiveOutput;
	if (progressiveOutput && maxCount > 0) {
		progressiveOutput = false;
	}

	for (const file of fileList) {
		// A file after the `--max-count` limit is not reported, but it is still
		// linted: the limit only decides what the report shows, and a skipped
		// file's errors must reach the exit decision like any other file's.
		const skipped = collector.isLocked();
		if (skipped) {
			log('Not reporting file due to max-count limit: %s', file.path);
			skippedFiles.push(file.path);
		}

		const engineOptions = {
			configFile,
			fix,
			locale,
			noSearchConfig: !searchConfig,
			ignoreExt,
			importPresetRules,
			debug: verbose,
			severity,
			experimentalRustCore: options.experimentalRustCore,
			...apiOptions,
			configProvider,
		};
		const engine = new MLEngine(file, engineOptions);

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
					appliedOverrides: configSet.appliedOverrides ?? [],
				};
			} else {
				data = configSet.config;
			}

			process.stdout.write(JSON.stringify(data, null, 2) + '\n');
			return false;
		}

		const result = await engine.exec();
		if (!result) {
			ignoredFiles.push(file.path);
			continue;
		}

		onLinted?.(engine, result.filePath);

		if (!skipped) {
			processedFiles.push(result.filePath);
			filesContent.set(result.filePath, {
				sourceCode: result.sourceCode,
				fixedCode: result.fixedCode,
			});
		}

		let nodeList: readonly PositionedNode[] | undefined;
		if (needsScope) {
			// `exec()` leaves the engine on the pre-fix document, but with --fix the
			// violations below are those of the fixed code (see `violationsBeforeDedupe`),
			// and a scope is found by their line and column. The node list has to be
			// that of the fixed code, which a file-based engine cannot be moved onto
			// (its file is read-only), so the fixed code is parsed by an engine of its own.
			let scopeEngine = engine;
			if (!fixDryRun && result.fixSummary?.finalPassViolations) {
				const [fixedFile] = await resolveFiles([{ sourceCode: result.fixedCode, name: result.filePath }]);
				scopeEngine = new MLEngine(fixedFile!, { ...engineOptions, fix: false });
				await scopeEngine.exec();
			}
			// The nodes of the document the engine linted, whichever engine that was: the Rust
			// engine has no `document` to read them off.
			const nodes = scopeEngine.positionedNodes();
			if (nodes) {
				nodeList = nodes;
				if (isSuppressMode) {
					nodeLists.set(result.filePath, nodeList);
				}
			}
		}

		// In fix mode, report the violations remaining in the FIXED code
		// (re-verified by ml-core) instead of the pre-fix violations, so that
		// the exit code and suppressions reflect the written output.
		// With --fix-dry-run the file is NOT modified, so keep the first-pass
		// violations, which match the file on disk.
		const violationsBeforeDedupe = fixDryRun
			? result.violations
			: (result.fixSummary?.finalPassViolations ?? result.violations);

		// Once the limit is hit every later file is skipped, so the seed below
		// is complete: nothing adds to `seenConfigMessages` after this point.
		const seen = skipped ? (seenConfigMessagesOfSkipped ??= new Set(seenConfigMessages)) : seenConfigMessages;
		const reportedViolations = dedupeConfigLevelViolations(violationsBeforeDedupe, seen);

		// Suppressions apply to the file's whole violation list, before the
		// collector sees it. Count-based matching needs every violation of
		// the file; the `--max-count` budget must be spent on violations
		// that will be reported; and the exit decision counts `keptViolations`
		// of every linted file, so the report's truncation never decides it.
		const { kept: keptViolations, unusedEntries } =
			isSuppressMode || isPruneMode
				? { kept: reportedViolations, unusedEntries: [] }
				: applyFileSuppressions(
						result.filePath,
						reportedViolations,
						normalRunSuppressions,
						suppressionsFilePath,
						nodeList,
					);
		unusedSuppressionEntries.push(...unusedEntries);

		// Progressive出力が有効でJSON形式でない場合
		if (progressiveOutput && format !== 'json') {
			// 即座に出力
			output(
				{
					violations: [...keptViolations],
					filePath: result.filePath,
					sourceCode: result.sourceCode,
					fixedCode: result.fixedCode,
					status: 'processed',
				},
				options,
			);
		}

		// Add violations to collector
		if (!skipped) {
			collector.pushWithFile(result.filePath, ...keptViolations);
		}

		const errorCount = keptViolations.filter(v => v.severity === 'error').length;
		const warningCount = keptViolations.filter(v => v.severity === 'warning').length;

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
	const collectedViolationsByFile = collector.groupByFile();

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
		// The collected violations are the whole truth only for the files this
		// run had as targets; a file outside the targets has no violations
		// here because it was never checked, not because it is clean. Only the
		// entries of target files (linted, or excluded by the config, which
		// leaves them without violations) are judged, and so are those of a
		// file that no longer exists, which has none either; the others are
		// kept as they are.
		const lintedPaths = new Set(
			[...processedFiles, ...ignoredFiles].map(filePath => toRelativePath(filePath, suppressionsFilePath)),
		);
		const lintedEntries: SuppressionsData = {};
		const unlintedEntries: SuppressionsData = {};
		for (const [relPath, rules] of Object.entries(existing)) {
			const judged =
				lintedPaths.has(relPath) ||
				!(await fs.access(toAbsolutePath(relPath, suppressionsFilePath)).then(
					() => true,
					() => false,
				));
			(judged ? lintedEntries : unlintedEntries)[relPath] = rules;
		}
		const pruned: SuppressionsData = {
			...unlintedEntries,
			...pruneSuppressions(collectedViolationsByFile, lintedEntries, suppressionsFilePath),
		};
		await writeSuppressionsFile(suppressionsFilePath, pruned);

		const existingCount = Object.values(existing).reduce((sum, rules) => sum + Object.keys(rules).length, 0);
		const prunedCount = Object.values(pruned).reduce((sum, rules) => sum + Object.keys(rules).length, 0);
		const removedCount = existingCount - prunedCount;
		process.stderr.write(
			`[Experimental] Suppressions pruned: ${removedCount} entry/entries removed, ${prunedCount} remaining.\n`,
		);
		return false;
	}

	// Normal lint mode: the collector already holds the violations the
	// suppressions leave, cut to `--max-count`; `hasError` and
	// `totalWarningCount` were counted before that cut.
	if (unusedSuppressionEntries.length > 0) {
		process.stderr.write(
			`[Experimental] ${unusedSuppressionEntries.length} unused suppression entry/entries found. Run with --prune-suppressions to clean up.\n`,
		);
	}

	// Check if max-warnings limit is exceeded (ESLint compatible)
	if (!hasError && options.maxWarnings >= 0 && totalWarningCount > options.maxWarnings) {
		hasError = true;
	}

	// Output results. The JSON branch returns early but with the same
	// `hasError` as the other formats; see the `@returns` of this function.
	if (format === 'json') {
		const jsonOutput: (Violation & { filePath: string })[] = collector.toArray();
		process.stdout.write(JSON.stringify(jsonOutput, null, 2) + '\n');
		return hasError;
	}

	// Progressive出力が無効の場合のみループ後に出力
	if (!progressiveOutput) {
		// Output per file - include processed files without violations
		for (const filePath of processedFiles) {
			const violations = collectedViolationsByFile.get(filePath) || [];
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
		const violations = collectedViolationsByFile.get(filePath) || [];
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

	return hasError;
}
