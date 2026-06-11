import type { Report, RuleConfigValue } from '@markuplint/ml-config';

import { createRule, getLocationFromChars } from '@markuplint/ml-core';

import meta from './meta.js';

/**
 * Characters that must be escaped using character references in HTML text
 * and attribute values.
 */
const defaultChars = ['"', '&', '<', '>'];

/**
 * parse5 ERR codes for malformed character references — the eight codes
 * this rule claims responsibility for via `meta.mirrorsParseErrorCodes`.
 * Kept as a Set for O(1) lookup against `document.parseErrors`.
 */
const parse5CharacterReferenceCodes = new Set<string>([
	'unknown-named-character-reference',
	'missing-semicolon-after-character-reference',
	'absence-of-digits-in-numeric-character-reference',
	'null-character-reference',
	'surrogate-character-reference',
	'control-character-reference',
	'noncharacter-character-reference',
	'character-reference-outside-unicode-range',
]);

/**
 * Parent elements whose text content is exempt from character reference checks
 * because their content is not parsed as HTML.
 */
const ignoreParentElement = new Set(['script', 'style']);

export default createRule({
	meta: meta,
	async verify({ document, report, t }) {
		// Hook into parse5's malformed-character-reference events surfaced on
		// `document.parseErrors`. These eight codes — declared in `meta.mirrorsParseErrorCodes`
		// — are suppressed on the built-in `parse-error` channel by ml-core,
		// so this rule is the only place a user with `character-reference`
		// enabled will see them.
		for (const pe of document.parseErrors) {
			if (!parse5CharacterReferenceCodes.has(pe.code)) {
				continue;
			}
			report({
				line: pe.startLine,
				col: pe.startCol,
				raw: pe.raw,
				message: t('{0} is {1:c}', t('the {0}', 'character reference'), pe.code),
			});
		}

		const targetNodes: Report<RuleConfigValue>[] = [];

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
				targetNodes.push({
					scope: node,
					line: valueNode?.startLine,
					col: valueNode?.startCol,
					raw: valueNode?.raw,
					message,
				});
			}
		});

		for (const targetNode of targetNodes) {
			if (!('scope' in targetNode && 'line' in targetNode && targetNode.line != null)) {
				continue;
			}
			const escapedText = targetNode.raw.replaceAll(/&(?:[a-z]+|#\d+|#x[\da-f]+);/gi, $0 =>
				'*'.repeat($0.length),
			);
			for (const location of getLocationFromChars(defaultChars, escapedText, targetNode.line, targetNode.col)) {
				report({
					scope: targetNode.scope,
					message: targetNode.message,
					...location,
				});
			}
		}
	},
});
