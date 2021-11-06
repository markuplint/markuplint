import { Target, resolveFiles } from '@markuplint/file-resolver';
import type { CLIOptions } from './bootstrap';
import { MLEngine } from '../api';
import { promises as fs } from 'fs';
import { log } from '../debug';
import { output } from './output';
import path from 'path';

export async function command(files: Target[], options: CLIOptions) {
	const fix = options.fix;
	const configFile = options.configFile && path.join(process.cwd(), options.configFile);

	const fileList = await resolveFiles(files);

	log(
		'File list: %O',
		fileList.map(f => f.path),
	);
	log('Config: %s', configFile || 'N/A');
	log('Fix option: %s', fix);

	for (const file of fileList) {
		const engine = new MLEngine(file, { configFile });
		const result = await engine.exec();
		if (!result) {
			continue;
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
}
