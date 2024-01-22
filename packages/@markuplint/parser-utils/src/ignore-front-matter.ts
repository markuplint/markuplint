export function ignoreFrontMatter(code: string): {
	code: string;
	frontMatter: string | null;
} {
	const reStart = /^(?:\s*\n)?---\r?\n/.exec(code);
	if (!reStart) {
		return {
			code,
			frontMatter: null,
		};
	}

	const startPoint = reStart[0].length;
	const afterStart = code.slice(startPoint);

	const reEnd = /\r?\n---\r?\n/.exec(afterStart);

	if (!reEnd) {
		return {
			code,
			frontMatter: null,
		};
	}

	const endPoint = startPoint + reEnd.index + reEnd[0].length;

	const frontMatter = code.slice(0, endPoint);
	const afterCode = code.slice(endPoint);

	const masked = frontMatter.replaceAll(/[^\n\r]/g, ' ');

	return {
		code: masked + afterCode,
		frontMatter,
	};
}
