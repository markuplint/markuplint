import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function getFilePath(uri: string, langId: string) {
	if (/^untitled:/i.test(uri)) {
		const name = uri.replace(/^untitled:/i, '');
		const basename = `${name}.${langId}`;
		return {
			dirname: path.resolve(),
			basename,
		};
	}
	const decodePath = fileURLToPath(decodeURIComponent(uri));
	let filePath: string;
	let untitled = false;
	if (/^file:/.test(decodePath)) {
		filePath = decodePath.replace(/^file:\/+/i, '/');
	} else if (/^untitled:/.test(decodePath)) {
		filePath = decodePath.replace(/^untitled:/i, '');
		untitled = true;
	} else {
		filePath = decodePath;
	}
	const dirname = path.resolve(path.dirname(filePath));
	let basename = path.basename(filePath);
	if (untitled) {
		basename += `.${langId}`;
	}
	return {
		dirname,
		basename,
	};
}
