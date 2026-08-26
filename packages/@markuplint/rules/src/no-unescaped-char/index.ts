import type { Scope } from '@markuplint/ml-config';

import { createRule, getLocationFromChars } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * HTML LS §13.1.2.3–4 prohibits exactly two things unescaped in text content
 * and attribute values: a literal `<`, and an "ambiguous ampersand" (`&`
 * followed by ASCII alphanumerics and a `;` that don't form a recognized
 * named/numeric reference). Detecting the latter precisely requires
 * validating the name against the full named-character-reference table —
 * work parse5's tokenizer already does, surfaced as `no-malformed-character-reference`
 * (`unknown-named-character-reference` and friends). So by default this rule
 * only checks `<`; `strict` restores the pre-split behavior of also flagging
 * `>`, `"`, and every bare `&` (entity-shaped sequences still exempted, so
 * `&amp;` is never flagged even in strict mode).
 */

/** Characters that must always be escaped, regardless of `strict`. */
const defaultChars = ['<'];

/** Characters `strict: true` additionally requires to be escaped. */
const strictChars = ['"', '&', '<', '>'];

/**
 * Configuration options for the `no-unescaped-char` rule.
 */
type Option = {
	/**
	 * When `true`, also flags `>`, `"`, and every bare `&` (not just a
	 * literal `<`). Off by default because HTML LS only prohibits `<` and
	 * ambiguous ampersands unescaped — `>` and `"` are conforming as-is, and
	 * a bare `&` not shaped like a reference attempt is not "ambiguous".
	 */
	strict?: boolean;
};

/**
 * Parent elements whose text content is exempt from character reference checks
 * because their content is not parsed as HTML.
 */
const ignoreParentElement = new Set(['script', 'style']);

export default createRule<boolean, Option>({
	meta: meta,
	defaultOptions: {},
	async verify({ document, report, t }) {
		const targetNodes: {
			scope: Scope<boolean, Option>;
			line: number;
			col: number;
			raw: string;
			message: string;
		}[] = [];

		await document.walkOn('Text', node => {
			if (node.isBogus) {
				return;
			}
			if (node.parentNode && ignoreParentElement.has(node.parentNode.nodeName.toLowerCase())) {
				return;
			}
			const severity = node.rule.severity;
			const ms = severity === 'error' ? 'must' : 'should';
			const message = t(`{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
			targetNodes.push({
				scope: node,
				line: node.startLine,
				col: node.startCol,
				raw: node.raw,
				message,
			});
		});

		await document.walkOn('Element', node => {
			const severity = node.rule.severity;
			const ms = severity === 'error' ? 'must' : 'should';
			const message = t(`{0} ${ms} {1}`, 'Illegal characters', 'escape in character reference');
			for (const attr of node.attributes) {
				if (attr.isDynamicValue || attr.isDirective) {
					continue;
				}
				const valueNode = attr.valueNode;
				if (!valueNode) {
					continue;
				}
				targetNodes.push({
					scope: node,
					line: valueNode.startLine,
					col: valueNode.startCol,
					raw: valueNode.raw,
					message,
				});
			}
		});

		for (const targetNode of targetNodes) {
			const strict = targetNode.scope.rule.options?.strict ?? false;
			const chars = strict ? strictChars : defaultChars;
			// Entity-shaped sequences (`&name;`, `&#123;`, `&#x1A;`) are never
			// flagged, valid name or not — an unrecognized name is
			// `no-malformed-character-reference`'s concern (it mirrors parse5's
			// `unknown-named-character-reference`), not this rule's.
			const escapedText = strict
				? targetNode.raw.replaceAll(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, $0 => '*'.repeat($0.length))
				: targetNode.raw;
			for (const location of getLocationFromChars(chars, escapedText, targetNode.line, targetNode.col)) {
				report({
					scope: targetNode.scope,
					message: targetNode.message,
					...location,
				});
			}
		}
	},
});
