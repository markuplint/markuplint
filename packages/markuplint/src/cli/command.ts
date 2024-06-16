import type { CLIOptions } from './bootstrap.js';
import type { APIOptions } from '../api/types.js';
import type { Target } from '@markuplint/file-resolver';
import type { Violation } from '@markuplint/ml-config';

import { promises as fs } from 'node:fs';
import path from 'node:path';

import { resolveFiles } from '@markuplint/file-resolver';

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

	const jsonOutput: (Violation & { filePath: string })[] = [];

	for (const file of fileList) {
		const engine = new MLEngine(file, {
			configFile,
			fix,
			locale,
			noSearchConfig: !searchConfig,
			ignoreExt,
			importPresetRules,
			debug: verbose,
			...apiOptions,
		});
		const result = await engine.exec();
		if (!result) {
			continue;
		}
		const errorCount = result.violations.filter(v => v.severity === 'error').length;
		const warningCount = result.violations.filter(v => v.severity === 'warning').length;

		if (!hasError && (errorCount > 0 || (warningCount > 0 && !options.allowWarnings))) {
			hasError = true;
		}

		if (fix) {
			log('Overwrite file: %s', result.filePath);
			await fs.writeFile(result.filePath, result.fixedCode, { encoding: 'utf8' });
		}

		if (format === 'json') {
			jsonOutput.push(
				...result.violations.map(v => ({
					...v,
					filePath: result.filePath,
				})),
			);
			continue;
		}

		log('Output reports');
		output(result, options);
	}

	if (format === 'json') {
		process.stdout.write(JSON.stringify(jsonOutput, null, 2) + '\n');
		return false;
	}

	return hasError;
}
