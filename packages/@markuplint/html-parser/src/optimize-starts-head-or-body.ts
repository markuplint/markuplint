import type { MLASTNode } from '@markuplint/ml-ast';

const UNDUPLICATED_CHAR = '\uFFFD';

export function isStartsHeadTagOrBodyTag(rawCode: string) {
	return /^\s*<(?:head|body)>/i.test(rawCode);
}

export function optimizeStartsHeadTagOrBodyTagSetup(rawCode: string) {
	const heads: string[] = [];
	const bodies: string[] = [];
	const code = rawCode.replace(
		// eslint-disable-next-line no-control-regex
		/(?<=<\/?)(?:head|body)(?=\u0009|\u000A|\u000C| |\/|>|\u0000)/gi,
		tag => {
			const prefix = `x-${UNDUPLICATED_CHAR}`;
			let name: string;
			if (/^head$/i.test(tag)) {
				name = `${prefix}h`;
				heads.push(tag);
			} else if (/^body/i.test(tag)) {
				name = `${prefix}b`;
				bodies.push(tag);
			} else {
				throw new Error('Never error');
			}
			return name;
		},
	);
	return {
		code,
		heads,
		bodies,
	};
}

export function optimizeStartsHeadTagOrBodyTagResume(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	nodeList: MLASTNode[],
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	replacements: ReturnType<typeof optimizeStartsHeadTagOrBodyTagSetup>,
) {
	nodeList.forEach(node => {
		if (!node.nodeName.startsWith(`x-${UNDUPLICATED_CHAR}`)) {
			return;
		}
		const realName =
			node.nodeName === `x-${UNDUPLICATED_CHAR}h` ? replacements.heads.shift() : replacements.bodies.shift();
		if (!realName) {
			return;
		}
		node.raw = node.raw.replace(node.nodeName, realName);
		node.nodeName = realName;
		if (node.type === 'starttag') {
			node.elementType = 'html';
		}
	});
}
