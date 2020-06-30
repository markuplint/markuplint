import { ReportingData, simpleReporter, standardReporter } from './reporter';

export async function output(params: ReportingData) {
	switch (params.format.toLowerCase()) {
		case 'json': {
			process.stdout.write(JSON.stringify(params.results, null, 2));
			break;
		}
		case 'simple': {
			await simpleReporter(params);
			break;
		}
		default: {
			await standardReporter(params);
		}
	}
}
