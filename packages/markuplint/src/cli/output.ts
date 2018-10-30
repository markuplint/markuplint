import { VerifiedResult } from '@markuplint/ml-config';
import { simpleReporter, standardReporter } from '../reporter';

/**
 *
 */
export async function output(
	filePath: string,
	reports: VerifiedResult[],
	html: string,
	format: string,
	noColor: boolean,
	problemOnly: boolean,
) {
	if (format) {
		switch (format.toLowerCase()) {
			case 'json': {
				process.stdout.write(JSON.stringify(reports, null, 2));
				break;
			}
			case 'simple': {
				await simpleReporter(filePath, reports, html, {
					color: !noColor,
					noStdOut: false,
					problemOnly,
				});
				break;
			}
			default: {
				throw new Error(`Unsupported output format "${format}"`);
			}
		}
	} else {
		await standardReporter(filePath, reports, html, {
			color: !noColor,
			noStdOut: false,
			problemOnly,
		});
	}
}
