import { ReportingData } from './types';
import path from 'path';

export async function gccReporter(data: ReportingData) {
	const message = data.results
		.map(result => {
			return `${path.basename(data.filePath)}:line${result.line}.column${result.col}: ${result.message}`;
		})
		.join('\n');
	process.stdout.write(message);
}
