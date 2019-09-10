import { exec } from '..';
import { output } from './output';
import { writeFile } from 'fs';

export async function verify(
	filesOrGlobPatterns: string[],
	fix: boolean,
	format: string,
	noColor: boolean,
	problemOnly: boolean,
) {
	for (const filesOrGlobPattern of filesOrGlobPatterns) {
		if (fix) {
			const reports = await exec({
				files: filesOrGlobPattern,
			});
			for (const report of reports) {
				writeFile(report.filePath, report.fixedCode, { encoding: 'utf8' }, err => {
					if (err) {
						throw err;
					}
					process.stdout.write(`markuplint: Fix "${report.filePath}"\n`);
				});
			}
		} else {
			const reports = await exec({
				files: filesOrGlobPattern,
			});
			for (const result of reports) {
				await output(result.filePath, result.results, result.sourceCode, format, noColor, problemOnly);
				// console.log(result);
			}
		}
	}
}
