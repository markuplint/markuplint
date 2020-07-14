import fs from 'fs';
import path from 'path';

export default function <T = Record<string, any>>(filePath: string, fallBackContext: T): T {
	let json: string;
	try {
		json = fs.readFileSync(path.resolve(__dirname, filePath), {
			encoding: 'utf-8',
		});
	} catch (error) {
		// console.warn(error);
		json = JSON.stringify(fallBackContext);
	}
	return JSON.parse(json) as T;
}
