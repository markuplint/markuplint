import type { CLIOptions } from './bootstrap';
import type { Target } from '@markuplint/file-resolver';

import { promises as fs } from 'fs';
import path from 'path';

import { resolveFiles } from '@markuplint/file-resolver';

import { MLEngine } from '../api';
import { log } from '../debug';

import { output } from './output';

export async function command(files: Target[], options: CLIOptions) {
	const fix = options.fix;
	const configFile = options.config && path.join(process.cwd(), options.config);
	const ignoreExt = options.ignoreExt;

	const fileList = await resolveFiles(files);

	if (log.enabled) {
		log(
			'File list: %O',
			fileList.map(f => f.path),
		);
		log('Config: %s', configFile || 'N/A');
		log('Fix option: %s', fix);
	}

	let hasError = false;

	for (const file of fileList) {
		const engine = new MLEngine(file, {
			configFile,
			ignoreExt,
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
			log('Output reports');
			await output(result, options);
		}
	}

	return hasError;
}
