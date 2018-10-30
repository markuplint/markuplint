import { exec } from '..';
import { output } from './output';

export async function verify(
	filesOrGlobPatterns: string[],
	fix: boolean,
	format: string,
	noColor: boolean,
	problemOnly: boolean,
) {
	for (const filesOrGlobPattern of filesOrGlobPatterns) {
		if (fix) {
			// const { origin, fixed } = await fixFile(filePath, void 0, cli.flags.ruleset);
			// process.stdout.write(fixed);
		} else {
			const reports = await exec({
				files: filesOrGlobPattern,
			});
			for (const result of reports) {
				await output(result.filePath, result.results, result.sourceCode, format, noColor, problemOnly);
				console.log(result);
			}
		}
	}
}
