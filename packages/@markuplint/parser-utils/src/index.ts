export * from './ignore-block';
export * from './utils';

export function ignoreFrontMatter(code: string) {
	const reStart = /^(?:\s*\r?\n)?---\r?\n/.exec(code);
	if (!reStart) {
		return code;
	}

	const startPoint = reStart[0].length;
	const afterStart = code.slice(startPoint);

	const reEnd = /\r?\n---\r?\n/.exec(afterStart);

	if (!reEnd) {
		return code;
	}

	const endPoint = startPoint + reEnd.index + reEnd[0].length;

	const frontMatter = code.slice(0, endPoint);
	const afterCode = code.slice(endPoint);

	const masked = frontMatter.replace(/[^\r\n]/g, ' ');

	return masked + afterCode;
}
