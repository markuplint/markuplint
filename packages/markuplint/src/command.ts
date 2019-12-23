import { lint } from './lint';
import { output } from './output';
import path from 'path';
import { writeFile } from 'fs';

export async function command(options: {
	files?: string[];
	codes?: string;
	fix?: boolean;
	workspace?: string;
	configFile?: string;
	format?: string;
	color?: boolean;
	problemOnly?: boolean;
}) {
	const fix = options.fix ?? false;
	const workspace = options.workspace ?? process.cwd();
	const configFile = options.configFile ? path.join(process.cwd(), options.configFile) : options.configFile;
	const format = options.format ?? 'standard';
	const color = options.color ?? true;
	const problemOnly = options.problemOnly ?? false;

	const reports = await lint({
		files: options.files,
		sourceCodes: options.codes,
		workspace,
		config: configFile,
		fix,
		rulesAutoResolve: true,
	});

	if (fix) {
		for (const report of reports) {
			writeFile(report.filePath, report.fixedCode, { encoding: 'utf8' }, err => {
				if (err) {
					throw err;
				}
				process.stdout.write(`markuplint: Fix "${report.filePath}"\n`);
			});
		}
	} else {
		for (const result of reports) {
			await output({
				filePath: result.filePath,
				reports: result.results,
				html: result.sourceCode,
				format,
				color,
				problemOnly,
			});
		}
	}
}
