import type { CLIOptions } from './bootstrap.js';
import type { APIOptions } from '../api/types.js';
import type { Target } from '@markuplint/file-resolver';
import type { Severity, SeverityOptions } from '@markuplint/ml-config';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { resolveFiles } from '@markuplint/file-resolver';
import { ViolationCollector } from '@markuplint/ml-core';

import { MLEngine } from '../api/index.js';
import { log } from '../debug.js';

import { output } from './output.js';

export async function command(files: readonly Readonly<Target>[], options: CLIOptions, apiOptions?: APIOptions) {
	const fix = options.fix;
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
	const filesContent = new Map<string, { sourceCode: string; fixedCode: string }>();
	const severityParseError = options.severityParseError.toLowerCase();
	const severity: SeverityOptions = {
		parseError: ['error', 'warning', 'off'].includes(severityParseError)
			? (severityParseError as Severity | 'off')
			: true,
	};

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

		// Track processed file
		processedFiles.push(result.filePath);
		filesContent.set(result.filePath, {
			sourceCode: result.sourceCode,
			fixedCode: result.fixedCode,
		});

		// Add violations to collector
		collector.pushWithFile(result.filePath, ...result.violations);

		const errorCount = result.violations.filter(v => v.severity === 'error').length;
		const warningCount = result.violations.filter(v => v.severity === 'warning').length;

		// Track total warning count across all files
		totalWarningCount += warningCount;

		if (!hasError && (errorCount > 0 || (warningCount > 0 && !options.allowWarnings))) {
			hasError = true;
		}

		if (fix) {
			log('Overwrite file: %s', result.filePath);
			await fs.writeFile(result.filePath, result.fixedCode, { encoding: 'utf8' });
		}
	}

	// Output results
	if (format === 'json') {
		const jsonOutput = collector.toArray();
		process.stdout.write(JSON.stringify(jsonOutput, null, 2) + '\n');
		return false;
	}

	// For standard/simple/github output, group violations by file
	const violationsByFile = collector.groupByFile();

	// Output per file - include processed files without violations
	for (const filePath of processedFiles) {
		const violations = violationsByFile.get(filePath) || [];
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

	// Check if max-warnings limit is exceeded (ESLint compatible)
	if (!hasError && options.maxWarnings >= 0 && totalWarningCount > options.maxWarnings) {
		hasError = true;
	}

	return hasError;
}
