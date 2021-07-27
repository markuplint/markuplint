import type { CLIOptions } from './bootstrap';
import type { Target } from '@markuplint/file-resolver';
import { api } from '../api';
import { promises as fs } from 'fs';
import { output } from './output';
import path from 'path';

export async function command(files: Target[], options: CLIOptions) {
	const fix = options.fix;
	const configFile = options.configFile && path.join(process.cwd(), options.configFile);

	const reports = await api(files, { configFile });

	if (fix) {
		for (const report of reports) {
			await fs.writeFile(report.filePath, report.fixedCode, { encoding: 'utf8' });
			process.stdout.write(`markuplint: Fix "${report.filePath}"\n`);
		}
	} else {
		for (const result of reports) {
			await output(result, options);
		}
	}

	// process.exit(process.exitCode);
}
