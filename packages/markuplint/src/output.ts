import { ReportingData, simpleReporter, standardReporter } from './reporter';
import stripAnsi from 'strip-ansi';

export async function output(params: ReportingData) {
	let out: string[];
	switch (params.format.toLowerCase()) {
		case 'json': {
			process.stdout.write(JSON.stringify(params.results, null, 2));
			return;
		}
		case 'simple': {
			out = simpleReporter(params);
			break;
		}
		default: {
			out = standardReporter(params);
		}
	}
	let msg = `${out.join('\n')}\n`;
	msg = params.color ? msg : stripAnsi(msg);

	// If it has errors, Write to `stderr` and failure and exit.
	if (params.results.length) {
		process.stderr.write(msg);
		process.exitCode = 1;
	} else if (!params.noStdOut) {
		process.stdout.write(msg);
	}
}
