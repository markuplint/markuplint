import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Extracts a directory name and base file name from a VS Code document URI.
 *
 * Handles `file:` and `untitled:` URI schemes. For untitled documents,
 * appends the language ID as a file extension so markuplint can detect
 * the correct parser.
 *
 * @param uri - The document URI (e.g. `"file:///path/to/file.html"`)
 * @param langId - The VS Code language identifier (e.g. `"html"`, `"vue"`)
 * @returns An object with `dirname` (absolute directory path) and `basename` (file name)
 */
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
	if (decodePath.startsWith('file:')) {
		filePath = decodePath.replace(/^file:\/+/i, '/');
	} else if (decodePath.startsWith('untitled:')) {
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
