import { MLFile, getAnonymousFile, getFiles } from '@markuplint/file-resolver';

export async function resolveLintTargetFiles(options: {
	/**
	 * Glob pattern
	 */
	files?: string | string[];

	/**
	 * Target source code of evaluation
	 */
	sourceCodes?: string | string[];

	/**
	 * File names when `sourceCodes`
	 */
	names?: string | string[];

	/**
	 * Workspace path when `sourceCodes`
	 */
	workspace?: string;
}) {
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
