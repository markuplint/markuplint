import type { CLIOptions } from './bootstrap';
import type { APIOptions } from '../api/types';
import type { Target } from '@markuplint/file-resolver';
import type { Violation } from '@markuplint/ml-config';

import { promises as fs } from 'fs';
import path from 'path';

import { resolveFiles } from '@markuplint/file-resolver';

import { MLEngine } from '../api';
import { log } from '../debug';

import { output } from './output';

export async function command(files: Target[], options: CLIOptions, apiOptions?: APIOptions) {
	const fix = options.fix;
	const configFile = options.config && path.join(process.cwd(), options.config);
	const locale = options.locale;
	const searchConfig = options.searchConfig;
	const ignoreExt = options.ignoreExt;
	const importPresetRules = options.importPresetRules;
	const verbose = options.verbose;

	const fileList = await resolveFiles(files);

	if (log.enabled) {
		log(
			'File list: %O',
			fileList.map(f => f.path),
		);
		log('Config: %s', configFile || 'N/A');
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
		if (!hasError && result.violations.length) {
			hasError = true;
		}
		if (fix) {
			log('Overwrite file: %s', result.filePath);
			await fs.writeFile(result.filePath, result.fixedCode, { encoding: 'utf8' });
			process.stdout.write(`markuplint: Fix "${result.filePath}"\n`);
		} else {
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
	}

	if (format === 'json') {
		process.stdout.write(JSON.stringify(jsonOutput, null, 2) + '\n');
		return false;
	}

	return hasError;
}
