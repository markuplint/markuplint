import fs from 'fs';
import path from 'path';

export function setPermittedContent(tagName: string) {
	let json: string;
	try {
		json = fs.readFileSync(
			path.resolve(__dirname, '..', 'src', 'permitted-content', `${tagName.toLowerCase()}.json`),
			{
				encoding: 'utf-8',
			},
		);
	} catch (error) {
		json = JSON.stringify(true);
	}
	return JSON.parse(json);
}
