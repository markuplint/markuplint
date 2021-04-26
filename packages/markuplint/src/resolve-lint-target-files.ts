import { MLFile, getAnonymousFile, getFiles, getFilesSync } from '@markuplint/file-resolver';
import { MLOptions } from './types';

export async function resolveLintTargetFiles(options: MLOptions) {
	// Resolve files
	const files: MLFile[] = [];
	if (options.files) {
		const filePathes = Array.isArray(options.files) ? options.files : [options.files];
		for (const filePath of filePathes) {
			files.push(...(await getFiles(filePath)));
			if (!files.length) {
				throw new Error(`"${options.files}" is not found.`);
			}
		}
	} else if (options.sourceCodes) {
		const codes = Array.isArray(options.sourceCodes) ? options.sourceCodes : [options.sourceCodes];
		const names = Array.isArray(options.names) ? options.names : options.names ? [options.names] : [];
		files.push(...codes.map((code, i) => getAnonymousFile(code, options.workspace, names[i])));
	}

	return files;
}

export function resolveLintTargetFilesSync(options: MLOptions) {
	// Resolve files
	const files: MLFile[] = [];
	if (options.files) {
		const filePathes = Array.isArray(options.files) ? options.files : [options.files];
		for (const filePath of filePathes) {
			files.push(...getFilesSync(filePath));
			if (!files.length) {
				throw new Error(`"${options.files}" is not found.`);
			}
		}
	} else if (options.sourceCodes) {
		const codes = Array.isArray(options.sourceCodes) ? options.sourceCodes : [options.sourceCodes];
		const names = Array.isArray(options.names) ? options.names : options.names ? [options.names] : [];
		files.push(...codes.map((code, i) => getAnonymousFile(code, options.workspace, names[i])));
	}

	return files;
}
