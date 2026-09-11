import type { HtmlParser } from './parser.js';
import type { MLASTNodeTreeItem } from '@markuplint/ml-ast';

export type Replacements = {
	readonly code: string;
	readonly heads: readonly string[];
	readonly bodies: readonly string[];
};

// U+FFFD (Unicode Replacement Character) cannot appear in real-world tag
// names, so the placeholder never collides with an author-written element.
const UNDUPLICATED_CHAR = '\uFFFD';

export function isStartsHeadTagOrBodyTag(rawCode: string) {
	return /^\s*<(?:head|body)[\s>]/i.test(rawCode);
}

/**
 * Why this optimization exists: when HTML source starts with `<head>` or
 * `<body>` without a preceding `<html>` tag, parse5 — following the HTML
 * standard's tree construction — treats those tags as implicit structural
 * tags rather than parsing them literally, which yields an AST that no
 * longer maps to the source. Replacing the tag names with unique placeholder
 * names makes parse5 treat them as custom elements and parse them literally;
 * `optimizeStartsHeadTagOrBodyTagResume` restores the original names on the
 * resulting AST.
 */
export function optimizeStartsHeadTagOrBodyTagSetup(rawCode: string): Replacements {
	if (!isStartsHeadTagOrBodyTag(rawCode)) {
		return {
			code: rawCode,
			heads: [],
			bodies: [],
		};
	}

	const heads: string[] = [];
	const bodies: string[] = [];

	// eslint-disable-next-line no-control-regex -- WHATWG HTML spec requires matching NULL character
	const code = rawCode.replaceAll(/(?<=<\/?)(?:head|body)(?=[\0\t\n\f />])/gi, tag => {
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
	});
	return {
		code,
		heads,
		bodies,
	};
}

export function optimizeStartsHeadTagOrBodyTagResume(
	// eslint-disable-next-line @typescript-eslint/prefer-readonly-parameter-types
	parser: HtmlParser,
	nodeList: readonly MLASTNodeTreeItem[],
	replacements: Replacements,
) {
	const heads = [...replacements.heads];
	const bodies = [...replacements.bodies];
	for (const node of nodeList) {
		if (!node.nodeName.startsWith(`x-${UNDUPLICATED_CHAR}`)) {
			continue;
		}

		const realName = node.nodeName === `x-${UNDUPLICATED_CHAR}h` ? heads.shift() : bodies.shift();
		if (!realName) {
			continue;
		}

		if (node.type !== 'starttag' && node.type !== 'endtag') {
			continue;
		}

		parser.updateRaw(node, node.raw.replace(node.nodeName, realName));

		if (node.type === 'starttag') {
			parser.updateElement(node, {
				nodeName: realName,
				elementType: 'html',
			});
			continue;
		}

		parser.updateElement(node, {
			nodeName: realName,
		});
		continue;
	}

	return nodeList;
}
