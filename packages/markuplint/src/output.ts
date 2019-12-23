import { simpleReporter, standardReporter } from './reporter';
import { VerifiedResult } from '@markuplint/ml-config';

export async function output(options: {
	filePath: string;
	reports: VerifiedResult[];
	html: string;
	format: string;
	color: boolean;
	problemOnly: boolean;
}) {
	switch (options.format.toLowerCase()) {
		case 'json': {
			process.stdout.write(JSON.stringify(options.reports, null, 2));
			break;
		}
		case 'simple': {
			await simpleReporter(options.filePath, options.reports, options.html, {
				color: options.color,
				noStdOut: false,
				problemOnly: options.problemOnly,
			});
			break;
		}
		default: {
			await standardReporter(options.filePath, options.reports, options.html, {
				color: options.color,
				noStdOut: false,
				problemOnly: options.problemOnly,
			});
		}
	}
}
